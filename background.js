/* Service worker: context menus, keyboard shortcuts and the injection plumbing.
 *
 * Every path here starts with an explicit user gesture — a menu click, the
 * toolbar button, a shortcut — because that gesture is what grants activeTab.
 * Without one, this worker has no access to any page.
 */

importScripts('src/cards.js');

var DEFAULTS = {
  defaultNetwork: 'visa',
  quantity: 5,
  holderName: true,
  expiryYears: 5,
  autoGenerate: true,
  theme: 'auto'
};

var SITE = 'https://ccgenerator.org';
var UTM = '?utm_source=chrome-extension&utm_medium=referral';

function getSettings() {
  return chrome.storage.sync.get(DEFAULTS);
}

function t(key, subs) {
  return chrome.i18n.getMessage(key, subs) || key;
}

/* ---------- menus ---------- */

var MENU_ITEMS = [
  { id: 'fill-form', messageKey: 'menuFill', contexts: ['editable', 'page'] },
  { id: 'insert-number', messageKey: 'menuInsert', contexts: ['editable'] },
  { id: 'copy-card', messageKey: 'menuCopy', contexts: ['page', 'editable'] },
  { id: 'validate-selection', messageKey: 'menuValidate', contexts: ['selection'] },
  { id: 'open-site', messageKey: 'menuSite', contexts: ['action'] }
];

function buildMenus() {
  chrome.contextMenus.removeAll(function () {
    MENU_ITEMS.forEach(function (item) {
      chrome.contextMenus.create({
        id: item.id,
        title: t(item.messageKey),
        contexts: item.contexts
      });
    });
  });
}

chrome.runtime.onInstalled.addListener(buildMenus);
chrome.runtime.onStartup.addListener(buildMenus);

/* ---------- injection ---------- */

/* Loads content/autofill.js into the frames we are allowed to touch, then calls
 * one of the functions it defines. Two steps because executeScript can inject a
 * file or call a function with arguments, never both — and the card has to
 * arrive as an argument, not as a string baked into a script. */
async function callInPage(tabId, fnName, args, allFrames) {
  var target = { tabId: tabId, allFrames: allFrames !== false };

  await chrome.scripting.executeScript({
    target: target,
    files: ['content/autofill.js']
  });

  var results = await chrome.scripting.executeScript({
    target: target,
    func: function (name, callArgs) {
      var fn = window[name];
      return fn ? fn.apply(null, callArgs) : null;
    },
    args: [fnName, args || []]
  });

  return results.filter(function (r) { return r && r.result; });
}

async function toast(tabId, title, body, tone) {
  try {
    await callInPage(tabId, '__ccgToast', [title, body, tone || 'ok'], false);
  } catch (error) {
    // The page refused injection (chrome:// URLs, the Web Store, a PDF viewer).
    // There is nowhere to draw a toast in that case, and nothing to recover.
  }
}

async function newCard() {
  var settings = await getSettings();
  return CCG.generateCard(settings.defaultNetwork, {
    holderName: settings.holderName,
    expiryYears: settings.expiryYears
  });
}

/* ---------- actions ---------- */

async function fillForm(tabId) {
  var card = await newCard();
  var results = await callInPage(tabId, '__ccgFill', [card]);
  var filled = results.reduce(function (sum, r) { return sum + (r.result.filled || 0); }, 0);

  if (filled) {
    await toast(tabId, t('toastFilled', String(filled)), card.formattedNumber + ' · ' + card.type, 'ok');
  } else {
    await toast(tabId, t('toastNoFields'), t('toastNoFieldsBody'), 'warn');
  }
  return filled;
}

async function insertNumber(tabId, frameId) {
  var card = await newCard();
  await chrome.scripting.executeScript({
    target: { tabId: tabId, frameIds: [frameId || 0] },
    files: ['content/autofill.js']
  });
  var results = await chrome.scripting.executeScript({
    target: { tabId: tabId, frameIds: [frameId || 0] },
    func: function (value) { return window.__ccgFillFocused(value); },
    args: [card.number]
  });

  var ok = results.some(function (r) { return r.result && r.result.filled; });
  await toast(
    tabId,
    ok ? t('toastInserted') : t('toastNoField'),
    ok ? card.formattedNumber : '',
    ok ? 'ok' : 'warn'
  );
}

async function copyCard(tabId) {
  var card = await newCard();
  await callInPage(tabId, '__ccgCopy', [CCG.cardToText(card)], false);
  await toast(tabId, t('toastCopied'), card.formattedNumber + ' · ' + card.type, 'ok');
}

async function validateSelection(tabId, selectionText) {
  var report = CCG.inspect(selectionText || '');

  if (!report || report.digits.length < 8) {
    await toast(tabId, t('toastNotANumber'), '', 'warn');
    return;
  }

  var network = report.network ? report.network.name : t('resultUnknownNetwork');
  var lengthNote = report.digits.length + ' ' + t('resultDigits');

  if (report.luhn.ok) {
    await toast(tabId, t('toastValid'), network + ' · ' + lengthNote, 'ok');
  } else {
    await toast(
      tabId,
      t('toastInvalid'),
      t('resultCheckDigitShouldBe', [report.luhn.expected, report.luhn.got]),
      'bad'
    );
  }
}

/* ---------- wiring ---------- */

/* Injection fails outright on chrome:// pages, the Web Store, the PDF viewer
 * and any tab the user has not granted us. There is nothing to do about it and
 * nothing to show — swallowing the rejection keeps it out of the error log. */
function run(promise) {
  Promise.resolve(promise).catch(function () {});
}

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === 'open-site') {
    chrome.tabs.create({ url: SITE + '/' + UTM });
    return;
  }

  if (!tab || tab.id === undefined) return;

  if (info.menuItemId === 'fill-form') {
    run(fillForm(tab.id));
  } else if (info.menuItemId === 'insert-number') {
    run(insertNumber(tab.id, info.frameId));
  } else if (info.menuItemId === 'copy-card') {
    run(copyCard(tab.id));
  } else if (info.menuItemId === 'validate-selection') {
    run(validateSelection(tab.id, info.selectionText));
  }
});

chrome.commands.onCommand.addListener(function (command) {
  if (command !== 'fill-test-card') return;
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs[0] && tabs[0].id !== undefined) run(fillForm(tabs[0].id));
  });
});

/* The popup cannot inject into a tab itself without repeating this plumbing,
 * so it asks the worker to do it. */
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (!message || message.type !== 'fill-with-card') return undefined;

  (async function () {
    try {
      var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0] || tabs[0].id === undefined) {
        sendResponse({ ok: false, reason: 'no-tab' });
        return;
      }

      var results = await callInPage(tabs[0].id, '__ccgFill', [message.card]);
      var filled = results.reduce(function (sum, r) { return sum + (r.result.filled || 0); }, 0);

      if (filled) {
        await toast(
          tabs[0].id,
          t('toastFilled', String(filled)),
          message.card.formattedNumber + ' · ' + message.card.type,
          'ok'
        );
      }
      sendResponse({ ok: true, filled: filled });
    } catch (error) {
      sendResponse({ ok: false, reason: 'blocked' });
    }
  }());

  return true; // keeps the message channel open for the async sendResponse
});

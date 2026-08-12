/* Popup controller.
 *
 * Everything is built with createElement rather than innerHTML: the popup
 * renders values that came out of the generator and out of the user's own
 * clipboard, and there is no reason for either to be parsed as markup.
 */

(function () {
  'use strict';

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

  /* The deep tools stay on the site. The popup covers the fast path — generate,
   * check, grab a gateway's number — and hands off for everything that needs
   * room to explain itself. */
  var SITE_LINKS = [
    { key: 'linkAllTools', path: '/tools/' },
    { key: 'linkBinLookup', path: '/bin-lookup/' },
    { key: 'linkIban', path: '/iban-generator/' },
    { key: 'linkIdentity', path: '/fake-name-address-generator/' },
    { key: 'linkCardImage', path: '/credit-card-image-generator/' },
    { key: 'linkGuides', path: '/guides/' }
  ];

  var t = CCG_I18N.t;
  var settings = Object.assign({}, DEFAULTS);
  var cards = [];
  var selectedNetwork = DEFAULTS.defaultNetwork;

  var el = {
    networks: document.getElementById('networks'),
    quantity: document.getElementById('quantity'),
    generate: document.getElementById('generate'),
    results: document.getElementById('results'),
    copyAll: document.getElementById('copy-all'),
    copyJson: document.getElementById('copy-json'),
    exportCsv: document.getElementById('export-csv'),
    validateInput: document.getElementById('validate-input'),
    validatePaste: document.getElementById('validate-paste'),
    validateOutput: document.getElementById('validate-output'),
    gateway: document.getElementById('gateway'),
    gatewayNote: document.getElementById('gateway-note'),
    gatewayList: document.getElementById('gateway-list'),
    gatewayLink: document.getElementById('gateway-link'),
    siteLinks: document.getElementById('site-links'),
    toast: document.getElementById('toast'),
    options: document.getElementById('open-options')
  };

  /* ---------- helpers ---------- */

  var toastTimer = null;

  function toast(text) {
    el.toast.textContent = text;
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.hidden = true; }, 1600);
  }

  function copy(text, message) {
    navigator.clipboard.writeText(text).then(function () {
      toast(message || t('toastCopiedShort'));
    });
  }

  function download(filename, content, type) {
    var blob = new Blob([content], { type: type });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 4000);
  }

  function node(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function applyTheme(theme) {
    var dark = theme === 'dark' ||
      (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }

  /* ---------- generate ---------- */

  function buildNetworkChips() {
    CCG.NETWORK_KEYS.forEach(function (key) {
      var chip = node('button', 'chip', CCG.NETWORKS[key].short);
      chip.type = 'button';
      chip.title = CCG.NETWORKS[key].name;
      chip.dataset.network = key;
      chip.addEventListener('click', function () {
        selectedNetwork = key;
        markActiveChip();
        generate();
      });
      el.networks.appendChild(chip);
    });

    var random = node('button', 'chip', t('chipRandom') || 'Random');
    random.type = 'button';
    random.dataset.network = 'random';
    random.addEventListener('click', function () {
      selectedNetwork = 'random';
      markActiveChip();
      generate();
    });
    el.networks.appendChild(random);
  }

  function markActiveChip() {
    el.networks.querySelectorAll('.chip').forEach(function (chip) {
      chip.classList.toggle('is-active', chip.dataset.network === selectedNetwork);
    });
  }

  function cardElement(card, index) {
    var wrap = node('article', 'card card--' + card.network);

    var top = node('div', 'card-top');
    top.appendChild(node('span', 'card-network', card.type));
    top.appendChild(node('span', 'card-tag', t('badgeTestOnly')));
    wrap.appendChild(top);

    var number = node('button', 'card-number', card.formattedNumber);
    number.type = 'button';
    number.title = t('btnCopyNumber');
    number.addEventListener('click', function () {
      copy(card.number, t('toastNumberCopied'));
    });
    wrap.appendChild(number);

    var meta = node('div', 'card-meta');
    meta.appendChild(metaItem(t('labelExpires'), card.expirationMonth + '/' + card.expirationYear));
    meta.appendChild(metaItem(t('labelCvv'), card.cvv));
    if (card.cardholderName) {
      meta.appendChild(metaItem(t('labelHolder'), card.cardholderName));
    }
    wrap.appendChild(meta);

    var actions = node('div', 'card-actions');

    var fill = node('button', 'mini', t('btnFill'));
    fill.type = 'button';
    fill.addEventListener('click', function () { fillActiveTab(card, fill); });
    actions.appendChild(fill);

    var copyCard = node('button', 'mini', t('btnCopyCard'));
    copyCard.type = 'button';
    copyCard.addEventListener('click', function () {
      copy(CCG.cardToText(card), t('toastCardCopied'));
    });
    actions.appendChild(copyCard);

    var check = node('button', 'mini', t('btnCheck'));
    check.type = 'button';
    check.addEventListener('click', function () {
      switchTab('validate');
      el.validateInput.value = card.formattedNumber;
      renderReport();
    });
    actions.appendChild(check);

    wrap.dataset.index = String(index);
    wrap.appendChild(actions);
    return wrap;
  }

  function metaItem(label, value) {
    var span = node('span', null);
    span.appendChild(document.createTextNode(label + ' '));
    span.appendChild(node('b', null, value));
    return span;
  }

  function renderCards() {
    el.results.textContent = '';
    cards.forEach(function (card, index) {
      el.results.appendChild(cardElement(card, index));
    });
  }

  function generate() {
    var count = parseInt(el.quantity.value, 10) || 1;
    cards = CCG.generateCards(selectedNetwork, count, {
      holderName: settings.holderName,
      expiryYears: settings.expiryYears
    });
    renderCards();
    chrome.storage.session.set({ lastCards: cards, lastNetwork: selectedNetwork });
  }

  function fillActiveTab(card, button, successLabel) {
    var original = button.textContent;
    chrome.runtime.sendMessage({ type: 'fill-with-card', card: card }, function (response) {
      if (chrome.runtime.lastError || !response || !response.ok) {
        toast(t('toastFillBlocked'));
        return;
      }
      if (!response.filled) {
        toast(t('toastNoFields'));
        return;
      }
      button.textContent = successLabel || t('btnFilled');
      toast(t('toastFilled', String(response.filled)));
      setTimeout(function () { button.textContent = original; }, 1500);
    });
  }

  /* ---------- validate ---------- */

  function reportRow(state, label, detail) {
    var marks = { pass: '✓', fail: '✕', info: '·', unknown: '–' };
    var li = node('li', state);
    li.appendChild(node('span', 'mark', marks[state] || '–'));

    var text = node('span', null);
    text.appendChild(node('b', null, label));
    if (detail) text.appendChild(node('span', 'detail', ' — ' + detail));
    li.appendChild(text);
    return li;
  }

  function anatomyElement(parts) {
    var wrap = node('div', 'anatomy');
    var order = [
      ['mii', parts.mii, t('anatomyMii')],
      ['iin', parts.iin, t('anatomyIin')],
      ['acct', parts.account, t('anatomyAccount')],
      ['check', parts.check, t('anatomyCheck')]
    ];

    var digits = node('div', null);
    order.forEach(function (item) {
      if (!item[1]) return;
      digits.appendChild(node('span', 'anat--' + item[0], item[1]));
    });
    wrap.appendChild(digits);

    var key = node('div', 'anatomy-key');
    order.forEach(function (item) {
      if (!item[1]) return;
      key.appendChild(node('span', 'anat--' + item[0], item[2]));
    });
    wrap.appendChild(key);
    return wrap;
  }

  function renderReport() {
    var report = CCG.inspect(el.validateInput.value);
    el.validateOutput.textContent = '';

    if (!report) {
      el.validateOutput.appendChild(node('p', 'empty', t('validateEmpty')));
      return;
    }

    var list = node('ul', null);

    list.appendChild(report.length.ok
      ? reportRow('pass', t('rowLength'), report.length.value + ' ' + t('resultDigits'))
      : reportRow('fail', t('rowLength'), t('resultLengthOutOfRange', String(report.length.value))));

    if (report.network) {
      list.appendChild(reportRow('pass', t('rowNetwork'), report.network.name));
      list.appendChild(report.networkLength.ok
        ? reportRow('pass', t('rowNetworkLength'),
            report.length.value + ' ' + t('resultDigits'))
        : reportRow('fail', t('rowNetworkLength'),
            t('resultNetworkLengthMismatch', [report.network.name, report.networkLength.expected.join(', '), String(report.length.value)])));
    } else {
      list.appendChild(reportRow('unknown', t('rowNetwork'), t('resultUnknownPrefix')));
    }

    list.appendChild(report.luhn.ok
      ? reportRow('pass', t('rowLuhn'), t('resultLuhnOk'))
      : reportRow('fail', t('rowLuhn'), t('resultCheckDigitShouldBe', [report.luhn.expected, report.luhn.got])));

    // Informational, not a verdict: every first digit maps to some industry.
    if (report.industry) {
      list.appendChild(reportRow('info', t('rowIndustry'), report.industry));
    }

    el.validateOutput.appendChild(list);
    el.validateOutput.appendChild(anatomyElement(report.parts));
  }

  /* Reading the clipboard is an optional permission, asked for on the click
   * that needs it, so it never appears on the install prompt. */
  function pasteAndCheck() {
    chrome.permissions.request({ permissions: ['clipboardRead'] }, function (granted) {
      if (!granted) {
        el.validateInput.focus();
        toast(t('toastPasteManually'));
        return;
      }
      navigator.clipboard.readText().then(function (text) {
        el.validateInput.value = text.trim().slice(0, 28);
        renderReport();
      }, function () {
        toast(t('toastPasteManually'));
      });
    });
  }

  /* ---------- gateways ---------- */

  /* The provider publishes a number and, sometimes, an expiry or a security
   * code it expects with it. Everything else a checkout form asks for is free
   * for us to make up — so Fill generates the rest around whatever is pinned,
   * rather than sending a card the provider would no longer recognise. */
  function gatewayCard(gateway, entry) {
    var defaults = gateway.defaults || {};
    return CCG.cardFromNumber(entry.number, {
      expiry: entry.expiry || defaults.expiry,
      cvv: entry.cvv || defaults.cvv,
      type: entry.brand,
      holderName: settings.holderName,
      expiryYears: settings.expiryYears
    });
  }

  function gatewayMeta(gateway, entry) {
    var defaults = gateway.defaults || {};
    var parts = [entry.brand, entry.behaviour];
    var expiry = entry.expiry || defaults.expiry;
    var cvv = entry.cvv || defaults.cvv;

    // Only the pinned values are worth the row space. A generated expiry
    // changes on every click and would just be noise here.
    if (expiry) parts.push(expiry);
    if (cvv) parts.push('CVC ' + cvv);
    return parts.join(' · ');
  }

  function renderGateway(gateway) {
    el.gatewayNote.textContent = gateway.note;
    el.gatewayLink.href = gateway.url + (gateway.url.indexOf('?') === -1 ? UTM.replace('?', '&') : '');
    el.gatewayList.textContent = '';

    gateway.cards.forEach(function (entry) {
      var row = node('div', 'gw');

      var copyButton = node('button', 'gw-copy');
      copyButton.type = 'button';
      copyButton.title = t('btnCopyNumber');
      copyButton.appendChild(node('span', 'gw-number', CCG.formatNumber(entry.number, groupsFor(entry.number))));
      copyButton.appendChild(node('span', 'gw-meta', gatewayMeta(gateway, entry)));
      copyButton.addEventListener('click', function () {
        copy(entry.number, t('toastNumberCopied'));
      });
      row.appendChild(copyButton);

      var fillButton = node('button', 'gw-fill', t('btnFillShort'));
      fillButton.type = 'button';
      fillButton.title = t('btnFill');
      fillButton.addEventListener('click', function () {
        fillActiveTab(gatewayCard(gateway, entry), fillButton, '✓');
      });
      row.appendChild(fillButton);

      el.gatewayList.appendChild(row);
    });
  }

  function groupsFor(number) {
    var detected = CCG.detect(number);
    return detected && CCG.NETWORKS[detected.key]
      ? CCG.NETWORKS[detected.key].groups
      : [4, 4, 4, 4, 4];
  }

  function buildGateways() {
    CCG_GATEWAYS.forEach(function (gateway, index) {
      var option = document.createElement('option');
      option.value = String(index);
      option.textContent = gateway.name;
      el.gateway.appendChild(option);
    });

    el.gateway.addEventListener('change', function () {
      renderGateway(CCG_GATEWAYS[parseInt(el.gateway.value, 10)]);
    });

    renderGateway(CCG_GATEWAYS[0]);
  }

  /* ---------- tabs and footer ---------- */

  function switchTab(name) {
    document.querySelectorAll('.tab').forEach(function (tab) {
      var active = tab.dataset.tab === name;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('.panel').forEach(function (panel) {
      panel.classList.toggle('is-active', panel.dataset.panel === name);
    });
    if (name === 'validate') el.validateInput.focus();
  }

  function buildFooter() {
    SITE_LINKS.forEach(function (link) {
      var anchor = document.createElement('a');
      anchor.href = SITE + link.path + UTM;
      anchor.target = '_blank';
      anchor.rel = 'noopener';
      anchor.textContent = t(link.key);
      el.siteLinks.appendChild(anchor);
    });
  }

  /* ---------- boot ---------- */

  function start() {
    CCG_I18N.apply();
    buildNetworkChips();
    buildGateways();
    buildFooter();

    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () { switchTab(tab.dataset.tab); });
    });

    el.generate.addEventListener('click', generate);
    el.quantity.addEventListener('change', generate);
    el.validateInput.addEventListener('input', renderReport);
    el.validatePaste.addEventListener('click', pasteAndCheck);
    el.options.addEventListener('click', function () { chrome.runtime.openOptionsPage(); });

    el.copyAll.addEventListener('click', function () {
      if (!cards.length) generate();
      copy(cards.map(CCG.cardToText).join('\n\n'), t('toastAllCopied'));
    });

    el.copyJson.addEventListener('click', function () {
      if (!cards.length) generate();
      copy(CCG.toJson(cards), t('toastJsonCopied'));
    });

    el.exportCsv.addEventListener('click', function () {
      if (!cards.length) generate();
      download('test-cards.csv', CCG.toCsv(cards), 'text/csv');
    });

    chrome.storage.sync.get(DEFAULTS, function (stored) {
      settings = stored;
      applyTheme(settings.theme);
      selectedNetwork = settings.defaultNetwork;
      el.quantity.value = String(settings.quantity);
      markActiveChip();

      // Reopening the popup should show the cards that were there when it
      // closed — regenerating silently would strand a number already pasted
      // into a form somewhere.
      chrome.storage.session.get({ lastCards: [], lastNetwork: null }, function (session) {
        if (session.lastCards && session.lastCards.length) {
          cards = session.lastCards;
          if (session.lastNetwork) {
            selectedNetwork = session.lastNetwork;
            markActiveChip();
          }
          renderCards();
        } else if (settings.autoGenerate) {
          generate();
        }
      });
    });

    renderReport();
  }

  document.addEventListener('DOMContentLoaded', start);
}());

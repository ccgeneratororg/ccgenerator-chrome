/* Options page. Settings live in chrome.storage.sync so they follow the
 * profile; nothing generated is ever written there. */

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

  var fields = {
    defaultNetwork: document.getElementById('defaultNetwork'),
    quantity: document.getElementById('quantity'),
    expiryYears: document.getElementById('expiryYears'),
    theme: document.getElementById('theme'),
    holderName: document.getElementById('holderName'),
    autoGenerate: document.getElementById('autoGenerate')
  };

  var saved = document.getElementById('saved');
  var savedTimer = null;

  function applyTheme(theme) {
    var dark = theme === 'dark' ||
      (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }

  function buildNetworkOptions() {
    CCG.NETWORK_KEYS.forEach(function (key) {
      var option = document.createElement('option');
      option.value = key;
      option.textContent = CCG.NETWORKS[key].name;
      fields.defaultNetwork.appendChild(option);
    });

    var random = document.createElement('option');
    random.value = 'random';
    random.textContent = CCG_I18N.t('chipRandom') || 'Random';
    fields.defaultNetwork.appendChild(random);
  }

  function load(values) {
    fields.defaultNetwork.value = values.defaultNetwork;
    fields.quantity.value = String(values.quantity);
    fields.expiryYears.value = String(values.expiryYears);
    fields.theme.value = values.theme;
    fields.holderName.checked = values.holderName;
    fields.autoGenerate.checked = values.autoGenerate;
    applyTheme(values.theme);
  }

  function save() {
    var values = {
      defaultNetwork: fields.defaultNetwork.value,
      quantity: parseInt(fields.quantity.value, 10),
      expiryYears: parseInt(fields.expiryYears.value, 10),
      theme: fields.theme.value,
      holderName: fields.holderName.checked,
      autoGenerate: fields.autoGenerate.checked
    };

    chrome.storage.sync.set(values, function () {
      applyTheme(values.theme);
      saved.hidden = false;
      clearTimeout(savedTimer);
      savedTimer = setTimeout(function () { saved.hidden = true; }, 1800);
    });
  }

  CCG_I18N.apply();
  buildNetworkOptions();

  chrome.storage.sync.get(DEFAULTS, load);

  document.getElementById('save').addEventListener('click', save);
  document.getElementById('reset').addEventListener('click', function () {
    chrome.storage.sync.set(DEFAULTS, function () { load(DEFAULTS); });
  });
  fields.theme.addEventListener('change', function () { applyTheme(fields.theme.value); });
}());

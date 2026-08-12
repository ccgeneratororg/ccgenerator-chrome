/* Swaps the English fallbacks baked into the HTML for the locale's strings.
 *
 * The markup ships readable English text rather than empty elements, so a
 * missing key degrades to something sensible instead of a blank popup. */

(function (root) {
  'use strict';

  var ATTRIBUTE_KEYS = [
    ['data-i18n-title', 'title'],
    ['data-i18n-aria-label', 'aria-label'],
    ['data-i18n-placeholder', 'placeholder']
  ];

  function message(key, subs) {
    return chrome.i18n.getMessage(key, subs);
  }

  function apply(scope) {
    var target = scope || document;

    target.querySelectorAll('[data-i18n]').forEach(function (el) {
      var text = message(el.dataset.i18n);
      if (text) el.textContent = text;
    });

    ATTRIBUTE_KEYS.forEach(function (pair) {
      target.querySelectorAll('[' + pair[0] + ']').forEach(function (el) {
        var text = message(el.getAttribute(pair[0]));
        if (text) el.setAttribute(pair[1], text);
      });
    });

    document.documentElement.lang = chrome.i18n.getUILanguage();
  }

  root.CCG_I18N = { apply: apply, t: message };
}(typeof self !== 'undefined' ? self : this));

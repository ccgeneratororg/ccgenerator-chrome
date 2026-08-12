/* Payment-form autofill, injected on demand.
 *
 * Nothing is declared in the manifest: this file only reaches a page when the
 * user clicks the toolbar button, picks a context-menu item or presses the
 * shortcut, each of which grants activeTab for that one tab. There is no
 * standing content script and no host permission, so the extension cannot read
 * a page the user did not point it at.
 *
 * It defines two functions on the isolated world and returns. background.js
 * and popup.js call them through a second chrome.scripting.executeScript with
 * `func`, which is how the card gets across — the values never travel through
 * the page's own JavaScript context.
 *
 * Cross-origin payment iframes (Stripe Elements, Adyen Components, Braintree
 * hosted fields) are out of reach by design: filling them would need host
 * permissions for those third parties. In those forms, use Copy instead.
 */

(function () {
  'use strict';

  if (window.__ccgAutofillReady) return;
  window.__ccgAutofillReady = true;

  /* Ordered: the first pattern that matches a field wins, so the narrow kinds
   * are tested before the broad ones. Three orderings here are load-bearing:
   *
   *   - cvc first. "card code" and "kart güvenlik kodu" both contain the word
   *     the number rule looks for.
   *   - the combined MM/YY pattern before the month rule. A single expiry input
   *     placeheld "MM / YYYY" contains "mm", and filling it with just the month
   *     leaves the year off the form.
   *   - the specific month and year rules before the loose "exp" fallback,
   *     which would otherwise claim a field named `exp_month`.
   *
   * `autocomplete` is matched in its own pass ahead of every regex, because an
   * explicit cc-* token is a stronger signal than any label text.
   */
  var KINDS = [
    {
      kind: 'cvc',
      autocomplete: ['cc-csc'],
      re: /cvv|cvc|csc|cvn|cid\b|security[\s\-_]?(code|no)|card[\s\-_]?code|guvenlik|güvenlik/i
    },
    {
      kind: 'expiry',
      autocomplete: ['cc-exp'],
      re: /mm[\s\-_/.]*yy|exp(iry|iration)?[\s\-_]?date|valid[\s\-_]?(thru|until)|son[\s\-_]?kullanma[\s\-_]?tarih/i
    },
    {
      kind: 'expMonth',
      autocomplete: ['cc-exp-month'],
      re: /exp[a-z]*[\s\-_]?(month|mo\b)|^month$|_month|month$|\bmm\b|kullanma[\s\-_]?ay|(^|[^a-z])ay([^a-z]|$)/i
    },
    {
      kind: 'expYear',
      autocomplete: ['cc-exp-year'],
      re: /exp[a-z]*[\s\-_]?(year|yr\b)|^year$|_year|year$|\byy(yy)?\b|kullanma[\s\-_]?y[ıi]l|(^|[^a-z])y[ıi]l([^a-z]|$)/i
    },
    {
      kind: 'expiry',
      autocomplete: [],
      re: /exp(iry|iration|ires|\b)|son[\s\-_]?kullanma/i
    },
    {
      kind: 'name',
      autocomplete: ['cc-name'],
      re: /(card|cc)[\s\-_]?holder|holder[\s\-_]?name|name[\s\-_]?on[\s\-_]?card|ccname|card[\s\-_]?name|kart[\s\-_]?sahibi|ad[\s\-_]?soyad/i
    },
    {
      kind: 'number',
      autocomplete: ['cc-number'],
      re: /(card|cc|acct|account)[\s\-_]?(number|num|no\b|nr\b)|cardnumber|ccnumber|ccnum|cnumber|creditcard|\bpan\b|kart[\s\-_]?(numara|no)/i
    }
  ];

  function isFillable(el) {
    if (el.disabled || el.readOnly) return false;
    if (el.type === 'hidden') return false;
    var rect = el.getBoundingClientRect();
    if (!rect.width && !rect.height) return false;
    var style = window.getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none';
  }

  /* Everything a human would read as the field's label, flattened into one
   * string. Forms label their inputs in every way imaginable, so all of them
   * feed the same match. */
  function haystack(el) {
    var parts = [
      el.name, el.id, el.placeholder, el.getAttribute('aria-label'),
      el.getAttribute('data-testid'), el.className, el.title
    ];

    if (el.labels && el.labels.length) {
      for (var i = 0; i < el.labels.length; i += 1) {
        parts.push(el.labels[i].textContent);
      }
    }

    var described = el.getAttribute('aria-labelledby');
    if (described) {
      described.split(/\s+/).forEach(function (id) {
        var node = document.getElementById(id);
        if (node) parts.push(node.textContent);
      });
    }

    return parts.filter(Boolean).join(' ').slice(0, 400);
  }

  function classify(el) {
    var auto = (el.getAttribute('autocomplete') || '').toLowerCase();
    var text = haystack(el);

    for (var i = 0; i < KINDS.length; i += 1) {
      var rule = KINDS[i];
      for (var a = 0; a < rule.autocomplete.length; a += 1) {
        // "shipping cc-number" and "section-pay cc-number" are both legal.
        if (auto.indexOf(rule.autocomplete[a]) !== -1) return rule.kind;
      }
    }

    for (var j = 0; j < KINDS.length; j += 1) {
      if (KINDS[j].re.test(text)) return KINDS[j].kind;
    }

    return null;
  }

  /* React (and Vue, and Angular) keep their own copy of an input's value and
   * ignore a plain `el.value = x`. Going through the prototype's native setter
   * updates the DOM under the framework's tracker, and the events below then
   * look exactly like typing. */
  function setValue(el, value) {
    var proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : (el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype);
    var setter = Object.getOwnPropertyDescriptor(proto, 'value');

    el.focus();
    if (setter && setter.set) {
      setter.set.call(el, value);
    } else {
      el.value = value;
    }

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  /* A <select> for the month or the year: match on the option's value first,
   * then on its label, so both <option value="03">March</option> and
   * <option value="March">March</option> land. */
  function setSelect(el, candidates) {
    for (var c = 0; c < candidates.length; c += 1) {
      var want = String(candidates[c]);
      for (var i = 0; i < el.options.length; i += 1) {
        var option = el.options[i];
        var value = option.value.trim();
        var label = option.textContent.trim();
        if (value === want || label === want ||
            value.replace(/^0+/, '') === want.replace(/^0+/, '')) {
          setValue(el, option.value);
          return true;
        }
      }
    }
    return false;
  }

  function capacity(el) {
    var max = parseInt(el.getAttribute('maxlength'), 10);
    return isNaN(max) || max <= 0 ? Infinity : max;
  }

  function fillNumber(el, card) {
    // Spaced if the field has room for it, digits only otherwise — a field
    // capped at exactly 16 rejects "4111 1111 1111 1111" silently.
    var spaced = card.formattedNumber;
    setValue(el, capacity(el) >= spaced.length ? spaced : card.number);
    return true;
  }

  function fillExpiry(el, card) {
    var mm = card.expirationMonth;
    var yyyy = card.expirationYear;
    var yy = yyyy.slice(-2);
    var hint = ((el.placeholder || '') + ' ' + haystack(el)).toLowerCase();
    var wantsFourDigitYear = /yyyy|20yy/.test(hint) || capacity(el) >= 7;
    var separator = hint.indexOf('mm-') !== -1 ? '-' : (hint.indexOf('mm.') !== -1 ? '.' : '/');
    var year = wantsFourDigitYear ? yyyy : yy;
    var value = mm + separator + year;

    // Some masked inputs want the raw digits and add the separator themselves.
    if (capacity(el) < value.length) value = mm + year;
    setValue(el, value);
    return true;
  }

  function fillYear(el, card) {
    var yyyy = card.expirationYear;
    if (el.tagName === 'SELECT') {
      return setSelect(el, [yyyy, yyyy.slice(-2)]);
    }
    setValue(el, capacity(el) <= 2 ? yyyy.slice(-2) : yyyy);
    return true;
  }

  function fillMonth(el, card) {
    var mm = card.expirationMonth;
    if (el.tagName === 'SELECT') {
      return setSelect(el, [mm, String(parseInt(mm, 10))]);
    }
    setValue(el, mm);
    return true;
  }

  /**
   * Fill every payment field in this frame.
   *
   * Bails out unless a card-number field is present or at least two other
   * payment fields are: a lone "name" or "month" input on an unrelated page is
   * far more likely to be a coincidence than a checkout form.
   *
   * @returns {{filled: number, fields: string[], reason?: string}}
   */
  window.__ccgFill = function (card) {
    var elements = Array.prototype.slice.call(
      document.querySelectorAll('input, select')
    ).filter(isFillable);

    var found = {};
    elements.forEach(function (el) {
      var kind = classify(el);
      if (!kind) return;
      if (kind === 'number' && el.tagName === 'SELECT') return;
      if (!found[kind]) found[kind] = el;
    });

    var kinds = Object.keys(found);
    if (!found.number && kinds.length < 2) {
      return { filled: 0, fields: [], reason: 'no-form' };
    }

    var filled = [];

    // A <select> with no matching option counts as not filled, so the toast
    // never claims a field the form did not actually take.
    function record(field, ok) {
      if (ok) filled.push(field);
    }

    if (found.number) record('number', fillNumber(found.number, card));
    if (found.expiry) record('expiry', fillExpiry(found.expiry, card));
    if (found.expMonth) record('month', fillMonth(found.expMonth, card));
    if (found.expYear) record('year', fillYear(found.expYear, card));
    if (found.cvc) { setValue(found.cvc, card.cvv); filled.push('cvc'); }
    if (found.name && card.cardholderName) {
      setValue(found.name, card.cardholderName);
      filled.push('name');
    }

    return { filled: filled.length, fields: filled };
  };

  /**
   * Type a value into whatever the user right-clicked, without touching the
   * rest of the form.
   */
  window.__ccgFillFocused = function (value) {
    var el = document.activeElement;
    var ok = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    if (!ok) return { filled: 0, reason: 'no-field' };

    if (el.isContentEditable) {
      el.textContent = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      setValue(el, value);
    }
    return { filled: 1 };
  };

  /* The service worker has no DOM and cannot reach the clipboard, so the copy
   * happens here, in the tab the user is looking at. navigator.clipboard needs
   * the document to be focused and a live user gesture; a context-menu click is
   * neither by the time this runs, hence the execCommand path underneath it. */
  window.__ccgCopy = function (text) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0;';
    document.body.appendChild(textarea);

    var selection = document.getSelection();
    var previous = selection && selection.rangeCount ? selection.getRangeAt(0) : null;

    textarea.select();
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (error) {
      ok = false;
    }

    textarea.remove();
    if (previous && selection) {
      selection.removeAllRanges();
      selection.addRange(previous);
    }

    if (!ok && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () {});
      return true;
    }
    return ok;
  };

  window.__ccgSelection = function () {
    return String(window.getSelection ? window.getSelection() : '').trim();
  };

  /* A toast rather than a modal: the point is to confirm without stealing
   * focus from the form the user is about to submit. Shadow DOM so the host
   * page's CSS cannot restyle or hide it. */
  window.__ccgToast = function (title, body, tone) {
    var existing = document.getElementById('ccg-toast-host');
    if (existing) existing.remove();

    var host = document.createElement('div');
    host.id = 'ccg-toast-host';
    host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;right:16px;bottom:16px;';
    var shadow = host.attachShadow({ mode: 'closed' });

    var accent = tone === 'bad' ? '#dc2626' : (tone === 'warn' ? '#d97706' : '#2563eb');
    var wrap = document.createElement('div');
    wrap.setAttribute('role', 'status');
    wrap.style.cssText = [
      'font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      'background:#111827', 'color:#f9fafb', 'padding:12px 14px', 'border-radius:10px',
      'border-left:4px solid ' + accent, 'box-shadow:0 10px 30px rgba(0,0,0,.35)',
      'max-width:320px', 'opacity:0', 'transform:translateY(8px)',
      'transition:opacity .18s ease,transform .18s ease'
    ].join(';');

    var strong = document.createElement('strong');
    strong.textContent = title;
    strong.style.cssText = 'display:block;font-size:13px;margin-bottom:2px;';
    wrap.appendChild(strong);

    if (body) {
      var p = document.createElement('span');
      p.textContent = body;
      p.style.cssText = 'color:#cbd5e1;font-size:12px;';
      wrap.appendChild(p);
    }

    shadow.appendChild(wrap);
    document.documentElement.appendChild(host);
    requestAnimationFrame(function () {
      wrap.style.opacity = '1';
      wrap.style.transform = 'translateY(0)';
    });

    setTimeout(function () {
      wrap.style.opacity = '0';
      setTimeout(function () { host.remove(); }, 250);
    }, 3200);
  };
}());

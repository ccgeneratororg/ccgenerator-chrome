/* Card engine — generation, detection and format validation.
 *
 * This is a straight port of the tables and algorithms that ccgenerator.org
 * runs on (layouts/partials/card-generator.html, card-validator.html and
 * packages/test-cards/src/*). Keep the three in step: if a network's IIN range
 * or accepted lengths change on the site, change them here too, or the
 * extension and the site will disagree about the same number.
 *
 * Two rules carried over from the site and deliberately kept:
 *   - nothing here touches fetch/XHR. A number typed into the popup cannot
 *     leave the machine.
 *   - nothing is written to storage except the cards the user just generated
 *     (session only, see popup.js).
 *
 * Classic script, not a module: background.js pulls it in with importScripts()
 * and chrome.scripting injects it as a plain file. It exports one global.
 */

(function (root) {
  'use strict';

  /* Generation ranges. `prefixes` entries are either a literal digit string or
   * an inclusive numeric range whose bounds have the same digit count. */
  var NETWORKS = {
    visa: {
      name: 'Visa',
      short: 'Visa',
      prefixes: ['4'],
      lengths: [16],
      cvvLength: 3,
      groups: [4, 4, 4, 4]
    },
    mastercard: {
      name: 'Mastercard',
      short: 'Mastercard',
      // The 2-series (222100–272099) has been live since 2017. Code that only
      // checks 51–55 rejects a real, in-issue Mastercard.
      prefixes: [{ from: 51, to: 55 }, { from: 2221, to: 2720 }],
      lengths: [16],
      cvvLength: 3,
      groups: [4, 4, 4, 4]
    },
    amex: {
      name: 'American Express',
      short: 'Amex',
      prefixes: ['34', '37'],
      lengths: [15],
      cvvLength: 4,
      groups: [4, 6, 5]
    },
    troy: {
      name: 'Troy',
      short: 'Troy',
      prefixes: ['9792'],
      lengths: [16],
      cvvLength: 3,
      groups: [4, 4, 4, 4]
    },
    discover: {
      name: 'Discover',
      short: 'Discover',
      prefixes: ['6011', '65', { from: 644, to: 649 }],
      lengths: [16],
      cvvLength: 3,
      groups: [4, 4, 4, 4]
    },
    jcb: {
      name: 'JCB',
      short: 'JCB',
      prefixes: [{ from: 3528, to: 3589 }],
      lengths: [16],
      cvvLength: 3,
      groups: [4, 4, 4, 4]
    },
    diners: {
      name: 'Diners Club',
      short: 'Diners',
      prefixes: [{ from: 300, to: 305 }, '36', '38', '39'],
      lengths: [14],
      cvvLength: 3,
      groups: [4, 6, 4]
    },
    maestro: {
      name: 'Maestro',
      short: 'Maestro',
      // Not the "50, 56–69" approximation that circulates widely: that range
      // swallows Discover (6011, 65, 644–649) and UnionPay (62), so a generator
      // built on it emits numbers that are not Maestro at all. Detection can
      // afford the wide range because it tests the specific networks first and
      // falls through to Maestro last; generation cannot.
      prefixes: ['50', { from: 56, to: 58 }, '6304', '6759', { from: 6761, to: 6763 }],
      lengths: [16, 19],
      cvvLength: 3,
      groups: [4, 4, 4, 4, 3]
    },
    unionpay: {
      name: 'UnionPay',
      short: 'UnionPay',
      prefixes: ['62', '81'],
      lengths: [16, 19],
      cvvLength: 3,
      groups: [4, 4, 4, 4, 3]
    }
  };

  var NETWORK_KEYS = Object.keys(NETWORKS);

  /* Detection order matters: the specific ranges are tested before Maestro,
   * which claims 56–69 broadly and would otherwise swallow Discover and
   * UnionPay. Lengths here are the accepted lengths in issue, which are wider
   * than the lengths we generate at. */
  var DETECT = [
    { key: 'troy', name: 'Troy', lengths: [16], test: function (n) { return n.indexOf('9792') === 0; } },
    { key: 'amex', name: 'American Express', lengths: [15], test: function (n) { return /^3[47]/.test(n); } },
    { key: 'visa', name: 'Visa', lengths: [13, 16, 19], test: function (n) { return n.charAt(0) === '4'; } },
    { key: 'mastercard', name: 'Mastercard', lengths: [16], test: function (n) { return inRange(n, 51, 55) || inRange(n, 2221, 2720); } },
    { key: 'discover', name: 'Discover', lengths: [16, 19], test: function (n) { return n.indexOf('6011') === 0 || n.indexOf('65') === 0 || inRange(n, 644, 649); } },
    // The site's validator only tests 62, which leaves the 81 range — the one
    // Adyen's own UnionPay test card 8171 9999 2766 0000 sits in, and the one
    // our own generator emits half the time — reported as an unknown prefix.
    // Detection has to cover everything generation can produce.
    { key: 'unionpay', name: 'UnionPay', lengths: [16, 17, 18, 19], test: function (n) { return n.indexOf('62') === 0 || n.indexOf('81') === 0; } },
    { key: 'jcb', name: 'JCB', lengths: [16, 19], test: function (n) { return inRange(n, 3528, 3589); } },
    { key: 'diners', name: 'Diners Club', lengths: [14, 16], test: function (n) { return inRange(n, 300, 305) || /^3[689]/.test(n); } },
    { key: 'maestro', name: 'Maestro', lengths: [12, 13, 14, 15, 16, 17, 18, 19], test: function (n) { return n.indexOf('50') === 0 || inRange(n, 56, 69); } }
  ];

  var CARDHOLDER_NAMES = [
    'Alex Tester',
    'Jordan Example',
    'Taylor Sandbox',
    'Morgan Demo',
    'Casey Developer',
    'Riley QA'
  ];

  /* ISO/IEC 7812-1 Major Industry Identifier, the first digit. */
  var INDUSTRIES = [
    'ISO/TC 68 and other industry assignments',
    'Airlines',
    'Airlines, financial and other future industry assignments',
    'Travel and entertainment',
    'Banking and financial',
    'Banking and financial',
    'Merchandising and banking/financial',
    'Petroleum and other future industry assignments',
    'Healthcare, telecommunications and other future assignments',
    'For assignment by national standards bodies'
  ];

  /* ---------- randomness ---------- */

  /* Uniform integer in [min, max] from crypto.getRandomValues().
   *
   * Rejection sampling, not `% range`: taking a modulus of a 32-bit value
   * biases the low end of the range whenever the range does not divide 2^32
   * evenly. Values at or above the largest exact multiple of `range` are
   * discarded and redrawn, which keeps every value equally likely. */
  function randomInt(min, max) {
    var range = max - min + 1;
    var limit = Math.floor(0x100000000 / range) * range;
    var buffer = new Uint32Array(1);
    var value;
    do {
      crypto.getRandomValues(buffer);
      value = buffer[0];
    } while (value >= limit);
    return min + (value % range);
  }

  function randomDigits(length) {
    var digits = '';
    for (var i = 0; i < length; i += 1) {
      digits += randomInt(0, 9).toString();
    }
    return digits;
  }

  function choose(items) {
    return items[randomInt(0, items.length - 1)];
  }

  function choosePrefix(prefixes) {
    var prefix = choose(prefixes);
    if (typeof prefix === 'string') return prefix;
    return randomInt(prefix.from, prefix.to).toString();
  }

  /* ---------- Luhn ---------- */

  function luhnSum(digits, startDoubling) {
    var sum = 0;
    var double = startDoubling;
    for (var i = digits.length - 1; i >= 0; i -= 1) {
      var d = digits.charCodeAt(i) - 48;
      if (double) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
      double = !double;
    }
    return sum;
  }

  function luhnValid(number) {
    var digits = String(number).replace(/\D/g, '');
    if (!digits) return false;
    return luhnSum(digits, false) % 10 === 0;
  }

  function luhnCheckDigit(withoutCheck) {
    return ((10 - (luhnSum(withoutCheck, true) % 10)) % 10).toString();
  }

  /* ---------- formatting ---------- */

  function formatNumber(number, groups) {
    var sizes = groups || [4, 4, 4, 4, 4];
    var chunks = [];
    var position = 0;

    sizes.forEach(function (size) {
      if (position < number.length) {
        chunks.push(number.slice(position, position + size));
        position += size;
      }
    });

    if (position < number.length) {
      chunks.push(number.slice(position));
    }

    return chunks.join(' ');
  }

  function inRange(number, from, to) {
    var width = String(from).length;
    if (number.length < width) return false;
    var head = parseInt(number.slice(0, width), 10);
    return head >= from && head <= to;
  }

  /* ---------- generation ---------- */

  function generateNumber(rule) {
    var length = choose(rule.lengths);
    var prefix = choosePrefix(rule.prefixes);
    var partial = prefix + randomDigits(length - prefix.length - 1);
    return partial + luhnCheckDigit(partial);
  }

  function generateExpiry(maxYears) {
    var now = new Date();
    var years = maxYears || 5;
    return {
      month: randomInt(1, 12).toString().padStart(2, '0'),
      year: (now.getFullYear() + randomInt(1, years)).toString()
    };
  }

  /**
   * @param {string} networkKey one of NETWORK_KEYS, or 'random'
   * @param {{holderName?: boolean, expiryYears?: number}} [options]
   */
  function generateCard(networkKey, options) {
    var opts = options || {};
    var key = networkKey === 'random' || !NETWORKS[networkKey]
      ? choose(NETWORK_KEYS)
      : networkKey;
    var rule = NETWORKS[key];
    var number = generateNumber(rule);
    var expiry = generateExpiry(opts.expiryYears);

    return {
      network: key,
      type: rule.name,
      number: number,
      formattedNumber: formatNumber(number, rule.groups),
      expirationMonth: expiry.month,
      expirationYear: expiry.year,
      cvv: randomDigits(rule.cvvLength),
      cardholderName: opts.holderName === false ? '' : choose(CARDHOLDER_NAMES),
      status: 'Test card only'
    };
  }

  /* "03/2030", "03/30" or "3/2030" → { month: '03', year: '2030' }.
   * Anything else returns null and the caller falls back to a random expiry. */
  function parseExpiry(value) {
    var match = /^\s*(\d{1,2})\s*[\/.\-]\s*(\d{2}|\d{4})\s*$/.exec(String(value || ''));
    if (!match) return null;

    var month = parseInt(match[1], 10);
    if (month < 1 || month > 12) return null;

    var year = match[2].length === 2 ? '20' + match[2] : match[2];
    return { month: String(month).padStart(2, '0'), year: year };
  }

  /**
   * Wrap a number we did not generate — a gateway's published test card — in
   * the same shape generateCard returns, so autofill and the copy helpers can
   * treat the two identically.
   *
   * The point is what it does *not* invent. A provider that pins the expiry or
   * the security code pins them for a reason: Adyen's cards expect 03/2030 and
   * CVC 737, Square reads CVV 911 as a deliberate CVV failure. Overwriting
   * those with random values hands back a card that no longer behaves the way
   * the provider documents. Whatever the caller supplies is kept as-is; only
   * the genuinely missing fields are generated, at the right CVV length for the
   * detected network.
   *
   * @param {string} number
   * @param {{expiry?: string, cvv?: string, type?: string,
   *          holderName?: boolean, expiryYears?: number}} [options]
   */
  function cardFromNumber(number, options) {
    var opts = options || {};
    var digits = String(number).replace(/\D/g, '');
    var detected = detect(digits);
    var rule = detected ? NETWORKS[detected.key] : null;

    // Amex is the only 15-digit network we know of, and the only one with a
    // 4-digit code, so it is the sane guess for a prefix we cannot place.
    var cvvLength = rule ? rule.cvvLength : (digits.length === 15 ? 4 : 3);
    var expiry = parseExpiry(opts.expiry) || generateExpiry(opts.expiryYears);

    return {
      network: detected ? detected.key : 'unknown',
      type: opts.type || (detected ? detected.name : 'Test card'),
      number: digits,
      formattedNumber: formatNumber(digits, rule ? rule.groups : null),
      expirationMonth: expiry.month,
      expirationYear: expiry.year,
      cvv: opts.cvv ? String(opts.cvv) : randomDigits(cvvLength),
      cardholderName: opts.holderName === false ? '' : choose(CARDHOLDER_NAMES),
      status: 'Test card only'
    };
  }

  function generateCards(networkKey, count, options) {
    var cards = [];
    var total = Math.min(Math.max(parseInt(count, 10) || 1, 1), 25);
    for (var i = 0; i < total; i += 1) {
      cards.push(generateCard(networkKey, options));
    }
    return cards;
  }

  /* ---------- detection and format validation ---------- */

  function detect(number) {
    var digits = String(number).replace(/\D/g, '');
    if (!digits) return null;
    for (var i = 0; i < DETECT.length; i += 1) {
      if (DETECT[i].test(digits)) return DETECT[i];
    }
    return null;
  }

  /**
   * Format check only — Luhn, prefix, length. It answers a question about the
   * number, never about an account: no lookup, no "is this card active".
   *
   * @returns {{digits: string, length: {ok: boolean, value: number},
   *            network: ?{key: string, name: string, lengths: number[]},
   *            networkLength: ?{ok: boolean, expected: number[]},
   *            luhn: {ok: boolean, expected: ?string, got: ?string},
   *            industry: ?string, parts: {mii,iin,account,check}}}
   */
  function inspect(number) {
    var digits = String(number).replace(/\D/g, '');
    if (!digits) return null;

    var net = detect(digits);
    var valid = luhnValid(digits);
    var hasCheckDigit = digits.length >= 2;
    var body = hasCheckDigit ? digits.slice(0, -1) : digits;

    return {
      digits: digits,
      length: {
        ok: digits.length >= 12 && digits.length <= 19,
        value: digits.length
      },
      network: net ? { key: net.key, name: net.name, lengths: net.lengths } : null,
      networkLength: net
        ? { ok: net.lengths.indexOf(digits.length) !== -1, expected: net.lengths }
        : null,
      luhn: {
        ok: valid,
        expected: valid ? null : luhnCheckDigit(digits.slice(0, -1)),
        got: valid ? null : digits.slice(-1)
      },
      industry: INDUSTRIES[parseInt(digits.charAt(0), 10)] || null,
      parts: {
        mii: body.slice(0, 1),
        iin: body.slice(1, 8),
        account: body.slice(8),
        check: hasCheckDigit ? digits.slice(-1) : ''
      }
    };
  }

  /* ---------- export shapes ---------- */

  function cardToText(card) {
    return [
      'Card type: ' + card.type,
      'Card number: ' + card.formattedNumber,
      'Expiration: ' + card.expirationMonth + '/' + card.expirationYear,
      'CVV/CVC: ' + card.cvv,
      'Cardholder: ' + (card.cardholderName || '—'),
      'Status: ' + card.status
    ].join('\n');
  }

  function toJson(cards) {
    return JSON.stringify(cards.length === 1 ? cards[0] : cards, null, 2);
  }

  function toCsv(cards) {
    var rows = [[
      'Card type', 'Card number', 'Expiration month', 'Expiration year',
      'CVV/CVC', 'Cardholder name', 'Status'
    ]];

    cards.forEach(function (card) {
      rows.push([
        card.type, card.number, card.expirationMonth, card.expirationYear,
        card.cvv, card.cardholderName, card.status
      ]);
    });

    return rows.map(function (row) {
      return row.map(function (value) {
        return '"' + String(value).replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\n');
  }

  root.CCG = {
    NETWORKS: NETWORKS,
    NETWORK_KEYS: NETWORK_KEYS,
    INDUSTRIES: INDUSTRIES,
    randomInt: randomInt,
    luhnValid: luhnValid,
    luhnCheckDigit: luhnCheckDigit,
    formatNumber: formatNumber,
    generateCard: generateCard,
    generateCards: generateCards,
    cardFromNumber: cardFromNumber,
    parseExpiry: parseExpiry,
    detect: detect,
    inspect: inspect,
    cardToText: cardToText,
    toJson: toJson,
    toCsv: toCsv
  };
}(typeof self !== 'undefined' ? self : this));

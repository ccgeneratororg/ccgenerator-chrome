# ccgenerator-chrome

The Chrome extension for [ccgenerator.org](https://ccgenerator.org) — Luhn-valid
**test** card data for developers and QA, one click from any checkout form.

Open source under the [MIT licence](LICENSE). This repository is the complete
source of the published extension: `scripts/package.py` builds the uploaded ZIP
from it and nothing else, so every claim the listing makes — no network
requests, no remote code, no host permissions — can be read off the files here.

It is deliberately a small surface. The popup covers the three things people do
dozens of times a day while building a payment flow; everything that needs room
to explain itself stays on the site and is one link away.

## What is in the extension

| | |
|---|---|
| **Generate** | 1–25 dummy cards on any of the nine supported networks (Visa, Mastercard, Amex, Troy, Discover, JCB, Diners Club, Maestro, UnionPay), or a random mix. Copy one number, copy the whole card, copy all, copy JSON, export CSV. |
| **Validate** | Paste a number and get the Luhn check digit, the detected network, the accepted lengths for that network, the MII and the digit anatomy. |
| **Test cards** | The published sandbox numbers for [Stripe](https://ccgenerator.org/guides/stripe-test-card-numbers/), Braintree, Adyen, Square, [PayPal](https://ccgenerator.org/guides/paypal-sandbox-testing/), Authorize.Net and iyzico, including the common decline triggers. Click the row to copy, or **Fill** to put it straight into the form — the fields the provider does not pin are generated around it. |
| **Autofill** | Fills the card number, expiry, CVC and cardholder name on the page you are looking at — from either tab of the popup, the right-click menu, or `Alt+Shift+F`. |

### Filling a gateway test card

A provider publishes a number; a checkout form wants four or five fields. The
missing ones are generated, but never on top of a value the provider pins —
`src/testcards.js` carries `defaults` per gateway and `expiry`/`cvv` per card,
and `CCG.cardFromNumber()` keeps whatever it is given and invents only the rest,
at the right CVV length for the detected network.

That distinction is the whole point. Adyen's cards expect **03/2030** and CVC
**737** (7373 on Amex); Square's expect CVV **111**. Substituting a random
expiry there produces a card the provider no longer recognises, and a test that
proves nothing.

## What stays on the site

The popup links out to these rather than reimplementing them:

- [BIN lookup](https://ccgenerator.org/bin-lookup/) and the
  [card image generator](https://ccgenerator.org/credit-card-image-generator/)
- [IBAN generator](https://ccgenerator.org/iban-generator/) and the
  [name and address generator](https://ccgenerator.org/fake-name-address-generator/)
- The full [gateway test-card tables](https://ccgenerator.org/test-card-numbers/),
  with 3-D Secure and decline codes — the popup carries the common subset
- The [guides](https://ccgenerator.org/guides/)

### The reference behind the code

The tables in `src/cards.js` are not folklore; each one has a page explaining
where it comes from. Worth reading before changing a range or a length:

| | |
|---|---|
| [The Luhn algorithm](https://ccgenerator.org/guides/luhn-algorithm/) | What `CCG.luhnValid()` and the check-digit report implement, and [in code](https://ccgenerator.org/guides/luhn-algorithm-code-examples/) in a dozen languages |
| [Card number structure](https://ccgenerator.org/guides/credit-card-number-structure/) | MII, IIN, account identifier, check digit — the anatomy the Validate tab draws |
| [BIN/IIN explained](https://ccgenerator.org/guides/bin-iin-explained/) | Why detection reads the first six to eight digits |
| [Length by network](https://ccgenerator.org/guides/card-number-length-by-network/) | The `lengths` array per network, including the 19-digit Maestro and UnionPay ranges |
| [Brand detection regex](https://ccgenerator.org/guides/card-brand-detection-regex/) | The prefix rules `CCG.detect()` is a port of |
| [Why generated cards have no balance](https://ccgenerator.org/guides/why-generated-cards-have-no-balance/) | The answer to the question every issue about this repo will eventually ask |

## Install from source

1. `chrome://extensions` → turn on **Developer mode**
2. **Load unpacked** → pick this directory
3. The toolbar icon opens the popup. `Alt+Shift+C` opens it from the keyboard;
   `Alt+Shift+F` fills the form on the current page. Both are remappable at
   `chrome://extensions/shortcuts`.

## Layout

```
manifest.json          MV3 manifest, permissions and commands
background.js          service worker: context menus, shortcuts, injection
popup.html/.css/.js    the three-tab popup
options.html/.css/.js  defaults (network, quantity, expiry window, theme)
src/cards.js           network table, Luhn, generation, detection, exports
src/testcards.js       published gateway sandbox numbers
src/i18n.js            applies _locales strings to the markup
content/autofill.js    injected on demand: field detection, filling, toast
_locales/{en,tr}       UI and store listing strings
icons/                 16/32/48/128 toolbar and store icons
scripts/make-assets.py regenerates icons/ and store/promo-*.png
scripts/package.py     builds the Web Store upload ZIP
store/                 Web Store listing copy, promo art, submission notes
```

## Packaging

```bash
python3 scripts/package.py
```

Writes `../ccgenerator-chrome-<version>.zip`. It builds from an explicit
allowlist with Python's `zipfile` rather than shelling out to `zip -r`: several
files here carry a `com.apple.provenance` extended attribute, and both macOS
`zip` and Finder's "Compress" turn that into a `__MACOSX/` directory of `._`
AppleDouble members inside the archive. The script cannot produce those, checks
for them anyway, and verifies that every path the manifest references is in the
package.

## Permissions, and why each one is there

| Permission | Why |
|---|---|
| `activeTab` | Reach the page the user pointed at — and only on a click, a menu choice or a shortcut. There is **no** host permission and no standing content script, so the extension cannot read pages on its own. |
| `scripting` | Inject `content/autofill.js` into that tab at that moment. |
| `storage` | Settings (`sync`) and the cards currently shown in the popup (`session`, cleared when the browser closes). |
| `contextMenus` | The four right-click entries. |
| `clipboardRead` | **Optional.** Requested only when the visitor presses "Paste from clipboard" in the Validate tab, and declinable. |

Nothing generated or typed is sent anywhere: there is no `fetch`, no XHR and no
analytics in the extension. Card numbers exist in the popup, in the clipboard if
the user copies one, and in the page if the user fills a form.

## Keeping in step with the site

`src/cards.js` is a port of the tables and algorithms in the site repo
(`layouts/partials/card-generator.html`, `card-validator.html` and
`packages/test-cards/src/`). When a network's IIN ranges or accepted lengths
change, change them in both places or the extension and the site will disagree
about the same number.

One difference exists on purpose and is marked in the source: the extension
detects UnionPay's `81` range as well as `62`. The
[site's validator](https://ccgenerator.org/credit-card-validator/) only tests
`62`, which reports Adyen's own UnionPay test card `8171 9999 2766 0000` as an
unrecognised prefix. The site is worth fixing to match.

## Tests

There is no test runner; the engine is small enough to check from a shell.

```bash
node -e "global.crypto=require('crypto').webcrypto;const C=require('./src/cards.js').CCG;let bad=0;for(const k of C.NETWORK_KEYS){const r=C.NETWORKS[k];for(let i=0;i<5000;i++){const c=C.generateCard(k);const d=C.detect(c.number);if(!C.luhnValid(c.number)||!r.lengths.includes(c.number.length)||c.cvv.length!==r.cvvLength||!d||d.key!==k){console.log('FAIL',k,c.number);bad++;break}}}console.log(bad?'FAILURES '+bad:'ALL PASS')"
```

Autofill is checked against `store/field-detection-cases.md`, which lists the
seven form shapes the detector is expected to handle.

## Regenerating the artwork

```bash
python3 scripts/make-assets.py
```

Writes `icons/icon{16,32,48,128}.png` and the Web Store promo images. Requires
Pillow.

## Publishing

See [store/SUBMISSION.md](store/SUBMISSION.md) for the listing copy, the
permission justifications the dashboard asks for, and the screenshot plan.

## Licence

[MIT](LICENSE). `LICENSE` is shipped inside the packaged extension as well as
kept here.

The licence covers the code. It does not make the numbers this code produces
anything other than test data: they satisfy the Luhn checksum and the networks'
published prefix and length rules, no bank issued them, and no payment will
ever clear on one. Anything built from this is subject to the same fact.

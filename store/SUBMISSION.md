# Chrome Web Store submission

Everything the Developer Dashboard asks for, in the order it asks for it. Listing
copy lives in [listing-en.md](listing-en.md) and [listing-tr.md](listing-tr.md).

## Package

```bash
python3 scripts/package.py
```

Writes `../ccgenerator-chrome-<version>.zip` and prints its contents. Do not
build the ZIP with `zip -r` or Finder's "Compress": several source files carry a
`com.apple.provenance` extended attribute, and both of those tools turn that
into a `__MACOSX/` directory full of `._` AppleDouble members inside the
archive. `scripts/package.py` writes each file from an explicit allowlist with
`zipfile`, so no macOS metadata can reach the package, and it fails loudly if
any turns up anyway.

The allowlist is also why `store/`, `scripts/`, `README.md` and `.gitignore` are
absent: they are development material, and a reviewer reading listing copy
inside the uploaded ZIP is noise at best. `LICENSE` is the one file in the
package that nothing loads — an extension whose listing calls it open source
should carry its terms where a user who unpacks the CRX will find them. Add a file to `FILES` in that script
when the extension starts loading it — the script checks the manifest's own
references and refuses to build if one is missing.

## Store listing fields

| Field | Value |
|---|---|
| Title | from `_locales/*/messages.json` → `appName` |
| Summary | from `appDesc` |
| Detailed description | listing-en.md / listing-tr.md |
| Category | **Developer Tools** |
| Language | English (default), Türkçe added as a second listing |
| Store icon | `icons/icon128.png` |
| Small promo tile | `store/promo-small.png` (440×280) |
| Marquee promo tile | `store/promo-marquee.png` (1400×560) |
| Screenshots | five 1280×800 PNGs, see below |
| Support URL | https://ccgenerator.org/contact/ |
| Homepage URL | https://ccgenerator.org/ |
| Privacy policy URL | https://ccgenerator.org/privacy-policy/ |

The dashboard has no field for the source repository. It is carried instead by
the privacy section and the closing line of the detailed description, and by the
reviewer notes below — the place it is worth the most, since it lets the review
check the "no network requests, no remote code" claims rather than take them.
Leave it out of the single purpose and permission justification fields: those
are read as answers to a question, and a URL in them is noise.

### Screenshots to capture (1280×800, popup centred on a light neutral field)

Chrome shows the first one everywhere, so it carries the pitch on its own.

1. **The popup over a real checkout form**, mid-fill, with the "Filled 4
   fields" toast visible. Caption: *One click fills the card number, expiry,
   CVC and name.*
2. **Generate tab**, Visa selected, five cards on screen. Caption: *Luhn-valid
   test numbers for nine card networks.*
3. **Validate tab** with a mistyped number showing the failed check digit and
   the digit anatomy. Caption: *Why a number was rejected — check digit,
   network, length.*
4. **Test cards tab** on Stripe, decline rows in view. Caption: *Published
   sandbox numbers for Stripe, Adyen, Braintree, Square and more.*
5. **The right-click menu** open on a page over a payment form. Caption: *Fill,
   insert or check a number without opening the popup.*

Keep the same browser chrome and background in all five; a consistent set reads
as a maintained extension, and the store shows them side by side.

## Single purpose

> Generate and validate dummy, Luhn-valid payment card test data, and enter it
> into forms the user is testing.

Every feature is that one job: generation, format validation, the published
gateway test numbers, and filling a form with the result.

## Permission justifications

Copy these into the dashboard verbatim — each one names the feature that needs
it, which is what the review is checking for.

**activeTab**
> The user asks the extension to act on the page they are looking at — by
> clicking the toolbar button's "Fill form", choosing a right-click item, or
> pressing the keyboard shortcut. activeTab grants access to that one tab at
> that moment. The extension requests no host permissions and registers no
> content script, so it has no access to any page the user has not pointed it
> at.

**scripting**
> Used to inject content/autofill.js into that tab, which locates the payment
> fields, writes the generated test card into them, and draws the confirmation
> toast. It is also used to read the user's text selection when they choose
> "Check this card number" from the right-click menu.

**storage**
> chrome.storage.sync holds the user's preferences (default card network,
> quantity, expiry window, theme). chrome.storage.session holds the cards
> currently displayed in the popup so they survive the popup closing; that
> storage is cleared when the browser closes. No browsing data is stored.

**contextMenus**
> Adds four right-click entries: fill a payment form, insert a test number into
> the focused field, copy a test card, and check a selected number.

**clipboardRead (optional)**
> Requested at runtime, only when the user presses "Paste from clipboard" in the
> Validate tab, and only to read the card number they intend to check. Declining
> it leaves every other feature working.

**Remote code**: none. All scripts are in the package; there is no `eval`, no
remotely hosted code, no external `<script>` tag, and no network request of any
kind.

## Data usage disclosures

Tick **none of them**, and state:

> This extension collects no user data. It makes no network requests. Card
> numbers are generated locally with the Web Crypto API, exist only in the
> popup, the clipboard when the user copies one, and the page when the user
> fills a form. Preferences are stored locally and synced by Chrome to the
> user's own profile.

## Policy notes for the reviewer (the "notes" field)

> This is a test-data tool for developers and QA engineers, in the same category
> as the published test card tables at Stripe, Adyen and Braintree. The numbers
> it produces satisfy the Luhn checksum and the networks' published prefix and
> length rules and nothing else: they are not issued, carry no funds, and cannot
> complete a payment. Every surface says so — the popup badge, the disclaimer
> under the deck, the options page, and the store description, which also states
> plainly what the extension is not for. There is no BIN database, no lookup of
> any kind, and no way for a number to leave the user's machine.
>
> The extension is open source under the MIT licence. The complete source of
> this build, including scripts/package.py which produces the uploaded ZIP from
> an explicit file list, is at https://github.com/ccgeneratororg/ccgenerator-chrome
> — the claims above (no network requests, no remotely hosted code, no host
> permissions, no content script running on its own) can be verified against it
> directly.

Some competing listings rank on "working", "real" and "live" card claims. Do not
follow them: those claims are what gets a listing in this category removed, and
they are false about this extension anyway.

## After publishing — what actually moves the ranking

Store search reads the title, summary and description; placement is then driven
by installs, ratings and retention. Roughly in order of leverage:

1. **Link it from the site.** ccgenerator.org already ranks for the queries this
   extension wants. An install button on `/credit-card-number-generator/`,
   `/test-card-numbers/`, `/tools/` and the footer sends qualified traffic, and
   install velocity from a relevant referrer is worth more than any listing
   tweak. Tag the links `?utm_source=site&utm_medium=cta`.
2. **Ask for a rating in-product, once.** A prompt in the popup after, say, the
   twentieth generate — dismissible, never shown again. Ratings count more than
   raw installs.
3. **Ship updates.** A version every few weeks (new gateway test data as
   providers revise theirs, new field-detection cases) keeps the "last updated"
   date fresh, which reviewers and users both read as maintained.
4. **Both locales complete.** The Turkish listing is a separate index; the site's
   keyword data is Turkish-heavy and there is far less competition there.
5. **Screenshots before words.** Most installs are decided on the first
   screenshot and the icon, not the description.

What does *not* work: keyword-stuffed titles, a description that lists search
terms, or fake reviews. All three are enforced against, and the first two also
read as spam to the people you want installing it.

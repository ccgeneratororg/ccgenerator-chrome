# Chrome Web Store listing — English (default)

Paste each block into the matching field in the Developer Dashboard. The title
and the summary come from `_locales/en/messages.json` and cannot be edited in
the dashboard — change them in the extension and re-upload.

---

## Title (from `appName`, 40/45 characters)

```
Credit Card Generator: Test Card Numbers
```

## Summary (from `appDesc`, 128/132 characters)

```
Generate Luhn-valid test credit card numbers, validate a BIN and autofill checkout forms. Dummy card data for developers and QA.
```

## Category

Developer Tools · Language: English

---

## Detailed description

The field the store search actually indexes, alongside the title and summary.
The first two lines matter twice over: they are also the snippet shown under the
title in search results, so the primary terms sit there rather than in a
keyword list at the bottom, which would be spam under the listing policy.

```
Free credit card generator for developers and QA: Luhn-valid test card numbers, a card number validator, and one-click autofill for any checkout form. No signup, no ads, and nothing ever leaves your browser.

Every number is dummy test data. It satisfies the Luhn checksum and the card networks' published prefix and length rules — and nothing more. These are not real cards, they hold no funds, and they cannot be used to buy anything. You will see tools like this called a fake credit card generator; the numbers are fake in the only sense that matters, which is that no bank issued them and no payment will ever go through.

━━ GENERATE TEST CARD NUMBERS ━━
Pick a network and get a complete card: number, expiry date, CVV/CVC and cardholder name.
• Visa, Mastercard, American Express, Discover, JCB, Diners Club, Maestro, UnionPay and Troy
• 1 to 25 cards at once, or a random mix across networks
• Correct prefixes and lengths for every network — including Mastercard's 2-series (2221–2720) and the 19-digit Maestro and UnionPay ranges that most generators still get wrong
• Copy one number, copy the whole card, copy them all, copy JSON, or export CSV straight into a fixture file
• Numbers are drawn from crypto.getRandomValues, not Math.random

━━ AUTOFILL A PAYMENT FORM ━━
The reason to keep this in the toolbar instead of a bookmark.
• "Fill form" writes the card number, expiry, CVC and cardholder name into the checkout form on screen
• Or right-click the page → "Fill this payment form with a test card"
• Or press Alt+Shift+F and never leave the keyboard
• Handles the field shapes real checkouts use: autocomplete="cc-*", split month and year dropdowns, a single MM/YY input, forms labelled only by placeholder, and Turkish labels
• Hosted card iframes (Stripe Elements, Braintree Hosted Fields) are sandboxed by the browser and cannot be filled by any extension — copy the number into those instead

━━ VALIDATE A CARD NUMBER ━━
Paste a number and see exactly why a form accepted or rejected it.
• Luhn check digit — and which digit it should have been when the check fails
• Card network detected from the BIN/IIN prefix, and whether the length is valid for that network
• ISO/IEC 7812 major industry identifier, plus the full anatomy of the number: MII, rest of the IIN, account identifier, check digit
• Select a number on any page, right-click, and check it in place
• Format validation only. It cannot tell you whether a card exists, is active, or has a balance — there is no lookup and no network request.

━━ GATEWAY SANDBOX TEST CARDS ━━
The numbers each provider publishes, ready to copy or fill:
• Stripe — the success cards plus generic_decline, insufficient_funds, expired_card, incorrect_cvc and the 3-D Secure challenge cards
• Braintree, Adyen, Square, PayPal, Authorize.Net and iyzico, including Troy cards for Turkish gateways
• Fill generates the fields a provider leaves free and keeps the ones it pins — Adyen's 03/2030 and CVC 737, Square's CVV 111 — so the card still behaves the way its documentation says it will

━━ PRIVACY ━━
• No host permissions. The extension can read only the page you point it at, by clicking the toolbar button, choosing a right-click item, or pressing the shortcut
• No content script running in the background, and no access to your browsing history
• No network requests at all: no fetch, no XHR, no analytics, no account, no telemetry
• Preferences sync with your Chrome profile; generated cards live in session storage and disappear when you close the browser
• Clipboard reading is an optional permission, requested only if you press "Paste from clipboard", and safe to decline
• Open source under the MIT licence — every claim on this list can be checked against the code at github.com/ccgeneratororg/ccgenerator-chrome, which is what the uploaded package is built from

━━ WHO USES IT ━━
Developers integrating Stripe, Adyen, Braintree or iyzico. QA engineers filling the same checkout form for the hundredth time. Anyone who needs a test credit card number generator for a sandbox, a dummy card for a demo, a BIN to exercise a form's validation, or a quick Luhn check on a number a form has just rejected.

━━ MORE ON CCGENERATOR.ORG ━━
One click from the popup: BIN lookup, IBAN generator, test name and address generator, credit card image generator, the complete gateway test-card reference, and guides on the Luhn algorithm, credit card number structure, BIN/IIN, PCI DSS test data and payment gateway testing.

━━ NOT FOR ━━
Fraud, carding, or any attempt to make a purchase. These numbers are mathematically well-formed and financially worthless. If you came looking for working, active or funded card numbers, this is not that — and no honest tool is.

Free, open source, and open about what it does — the complete code is at github.com/ccgeneratororg/ccgenerator-chrome. Made by the team behind ccgenerator.org.
```

## Keyword coverage (why the copy reads the way it does)

Store search indexes the title, the summary and the detailed description; there
is no separate keyword field, and a trailing list of search terms is spam under
the listing policy. So every term appears once or twice inside a sentence that
would be there anyway:

credit card generator · test card numbers · card number generator · test credit
card number generator · fake credit card generator (qualified, see below) ·
dummy card data · Luhn · Luhn check digit · card number validator · BIN · IIN ·
Visa · Mastercard · American Express · Discover · JCB · Diners Club · Maestro ·
UnionPay · Troy · CVV/CVC · Stripe test cards · Adyen · Braintree · Square ·
PayPal · Authorize.Net · iyzico · sandbox · checkout · payment form testing ·
QA test data · autofill · 3-D Secure · IBAN

**"fake credit card generator"** is one of the highest-volume queries in this
space and the copy claims it once, in a sentence that immediately defines the
word: the numbers are fake in the sense that no bank issued them. That is
accurate, and it is the difference between ranking for the query and being
removed for the claim.

Left out entirely: *working*, *real*, *live*, *active*, *valid with money*, *that
work*. Those are the biggest queries of all, they are what competing listings
chase, and they are both false about this extension and the fastest route to a
takedown in the payments category.

## Where the description is not the lever

The first two lines are also the snippet under the title in search results, so
they carry the pitch. Beyond that, placement is driven by installs, ratings and
retention far more than by wording — see the ranking notes at the end of
[SUBMISSION.md](SUBMISSION.md). The single biggest lever available here is the
site: ccgenerator.org already ranks for these queries, and an install button on
the tool pages sends traffic that converts and counts.

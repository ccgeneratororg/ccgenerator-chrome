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

```
Test card data for developers and QA, one click from any checkout form.

CC Generator makes the dummy card details you need while building or testing a
payment flow: Luhn-valid card numbers, an expiry date, a CVV and a cardholder
name, for Visa, Mastercard, American Express, Discover, JCB, Diners Club,
Maestro, UnionPay and Troy. Everything runs locally in your browser. Nothing is
sent to a server, and there is no account to create.

These are dummy numbers for software testing. They pass format validation and
nothing else — they are not real cards, they carry no funds, and they cannot be
used to buy anything.

■ GENERATE
• 1 to 25 cards at a time, on any of nine card networks, or a random mix
• Correct prefixes and lengths per network, including Mastercard's 2-series
  (2221–2720) and the 19-digit Maestro and UnionPay ranges most tables miss
• Copy a number, copy the whole card, copy every card, copy JSON, export CSV
• Card numbers are drawn from crypto.getRandomValues, not Math.random

■ AUTOFILL A PAYMENT FORM
• "Fill form" drops the number, expiry, CVC and name straight into the checkout
  form you are looking at
• Or right-click the page → "Fill this payment form with a test card"
• Or press Alt+Shift+F without leaving the keyboard
• Detects the usual field shapes: autocomplete="cc-*", split month/year selects,
  a single MM/YY input, placeholder-only forms, and Turkish labels
• Works on your own forms and on ordinary HTML checkouts. Hosted card iframes
  (Stripe Elements, Braintree Hosted Fields) are sandboxed by the browser and
  cannot be filled by any extension — copy the number into those instead.

■ VALIDATE A CARD NUMBER
• Luhn check digit, with the digit it should have been when it fails
• Network detected from the prefix, and whether the length is valid for it
• ISO/IEC 7812 major industry identifier and the full digit anatomy: MII, rest
  of the IIN, account identifier, check digit
• Select a number on any page, right-click, and check it in place
• Format validation only. Nothing here can tell you whether a card exists, is
  active, or has a balance — no lookup, no network request.

■ GATEWAY TEST CARDS
The published sandbox numbers for Stripe, Braintree, Adyen, Square, PayPal,
Authorize.Net and iyzico — including the decline triggers (insufficient_funds,
expired_card, incorrect_cvc, generic_decline) and the 3-D Secure challenge
cards. Click a row to copy it, or press Fill to put it straight into the form:
the expiry, CVC and name a checkout asks for but the provider leaves free are
generated around the number. Values a provider does pin are kept exactly —
Adyen's 03/2030 and CVC 737, Square's CVV 111 — because a random substitute
there is a card the sandbox no longer recognises. Full tables with every decline
code are on the site.

■ PRIVACY
• No host permissions. The extension reads a page only when you click the
  toolbar button, choose a right-click item or press the shortcut
• No standing content script, no background page access to your browsing
• No fetch, no XHR, no analytics, no account, no telemetry
• Settings sync with your Chrome profile; generated cards live in session
  storage and disappear when you close the browser
• Clipboard reading is an optional permission, asked for only if you press
  "Paste from clipboard", and safe to decline

■ WHO IT IS FOR
Developers wiring up Stripe, Adyen or iyzico. QA engineers filling the same
checkout form for the hundredth time. Anyone who needs a test credit card
number, a dummy card for a sandbox, a BIN to check a form's validation, or a
quick Luhn check on a number that a form rejected.

■ ON THE SITE
Deeper tools stay at ccgenerator.org, one click from the popup: BIN lookup,
IBAN generator, test name and address generator, credit card image generator,
the full gateway test-card reference, and guides on the Luhn algorithm, card
number structure, BIN/IIN, PCI DSS test data and payment gateway testing.

■ NOT FOR
Fraud, carding, or any attempt to make a purchase. Generated numbers are
mathematically well-formed and financially worthless. Using test data against a
production payment system, or against a system you do not own, is not what this
is for.

Free, open about what it does, and made by the team behind ccgenerator.org.
```

---

## Keyword coverage (why the copy reads the way it does)

Chrome Web Store search indexes the title, the summary and the detailed
description; there is no separate keyword field. These terms appear once each in
natural sentences rather than as a list, which is both what the ranking wants
and what the policy on keyword spam requires:

credit card generator · test card numbers · card number generator · dummy card
data · Luhn validator · Luhn check digit · BIN · card validator · Visa
generator · Mastercard generator · American Express · test credit card ·
payment form testing · checkout autofill · QA test data · sandbox card numbers ·
Stripe test cards · Adyen · Braintree · Square · iyzico · Troy · UnionPay ·
JCB · Diners Club · Maestro · CVV generator

Terms deliberately left out: anything promising working, real, live, active or
funded cards. They are the highest-volume queries in the space and the fastest
route to a policy takedown.

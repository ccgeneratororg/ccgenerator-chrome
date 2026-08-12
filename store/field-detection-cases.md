# Autofill: the form shapes `content/autofill.js` is expected to handle

Checked by hand against a page containing all seven fieldsets. Each was filled
in isolation (the others hidden) so a single detector pass could not borrow a
field from the form next door. Card used in the run below:
`4731 9854 5785 8975`, expiry `09/2030`, CVV `458`, name `Casey Developer`.

| # | Form shape | Expected | Result |
|---|---|---|---|
| A | `autocomplete="cc-number/cc-name/cc-exp/cc-csc"`, `MM/YY` expiry capped at 5 | number spaced, `09/30` | 4 fields ✓ |
| B | `name="cardNumber/ccname/expMonth/expYear/cvv"`, month and year as `<select>` | month option `09`, year option `2030` | 5 fields ✓ |
| C | placeholders only, number capped at 16, expiry placeheld `MM / YYYY` | number **unspaced** (16 chars will not fit `4731 9854 …`), expiry `09/2030` | 3 fields ✓ |
| D | Turkish labels: kart numarası, kart sahibi, ay, yıl, güvenlik kodu; month options unpadded (`9`), year options two-digit (`30`) | month `9`, year `30` | 5 fields ✓ |
| E | email + full name + search — **not** a payment form | nothing touched | 0 fields, `reason: "no-form"` ✓ |
| F | `name="creditCard/expDate/cardCode"`, no autocomplete, expiry capped at 5 | `09/30` | 3 fields ✓ |
| G | `aria-label` only, `exp_month` and `exp_year` as separate 2-char inputs | month `09`, year `30` | 4 fields ✓ |

## Second pass: filling a gateway test card

The same seven fieldsets, filled with Adyen's Amex card `3700 000000 00002`,
which pins both the expiry (**03/2030**) and the security code (**7373**). What
the run has to prove is that the pinned pair survives every field shape rather
than being regenerated, and that the free field — the cardholder name — is
invented:

| # | Expiry written | CVC | Name |
|---|---|---|---|
| A | `03/30` (5-char input) | 7373 | ✓ |
| B | select `03` + select `2030` | 7373 | ✓ |
| C | `03/2030` (`MM / YYYY`, 7 chars) | 7373 | — (no name field) |
| D | select `3` (unpadded options) + select `30` | 7373 | ✓ |
| E | untouched | — | — |
| F | `03/30` | 7373 | — |
| G | `03` + `30` (2-char inputs) | 7373 | — |

Case C also checks the number itself: 15 Amex digits spaced is 17 characters,
which will not fit a field capped at 16, so it is written unspaced.

## The three orderings that make it work

Field kinds are tested in a fixed order and the first match wins, so:

- **cvc before number.** "card code" and "kart güvenlik kodu" both contain the
  word the number rule looks for.
- **the combined `MM/YY` pattern before the month rule.** An expiry input
  placeheld `MM / YYYY` contains "mm"; classified as a month it gets `09` and
  the year never reaches the form. This was a real bug, caught by case C.
- **month and year before the loose `exp` fallback**, which would otherwise
  claim a field named `exp_month`.

`autocomplete` is matched in its own pass ahead of every regex: an explicit
`cc-*` token beats any label text.

## Deliberate limits

- **One form per frame.** Only the first field of each kind is filled. Pages
  with two payment forms in one document are rare enough not to be worth the
  false positives that per-form scoping would introduce.
- **A bail-out rule.** Nothing is filled unless a card-number field is present,
  or at least two other payment fields are. A lone "name" or "month" input on an
  unrelated page is far more likely to be a coincidence than a checkout.
- **A `<select>` with no matching option counts as unfilled**, so the toast never
  claims a field the form did not take.
- **Cross-origin payment iframes are out of reach** — Stripe Elements, Adyen
  Components, Braintree Hosted Fields. Filling them would mean asking for host
  permissions on those third parties, which is a much larger ask than this
  feature is worth. The toast says so and points at Copy instead.

## When adding a case

Add the fieldset to the harness, run all seven, and check that case E still
comes back untouched. Loosening a pattern to catch one more checkout usually
costs a false positive on a search box somewhere.

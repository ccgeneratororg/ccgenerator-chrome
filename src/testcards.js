/* Published sandbox card numbers, per gateway.
 *
 * A trimmed copy of the tables on https://ccgenerator.org/test-card-numbers/ —
 * the success card per brand plus the decline triggers people actually reach
 * for. The full tables (3-D Secure cards, every decline code, the amount- and
 * ZIP-driven triggers) stay on the site; each gateway here carries the deep
 * link so the popup can hand the visitor off instead of growing a table.
 *
 * These are the providers' own published test values, not generated numbers.
 * When a provider revises its set, update the site page first and copy across.
 * `verified` is the date the site page last checked the provider's docs.
 *
 * `defaults` and the per-card `expiry` / `cvv` carry the values a provider
 * pins. They exist so "Fill" can complete a form without inventing over them:
 * Adyen's cards expect 03/2030 and CVC 737, Square's expect CVV 111, and a
 * random substitute turns a documented outcome into an undocumented one.
 * Anything absent here is genuinely free-form and gets generated instead.
 */

(function (root) {
  'use strict';

  var GATEWAYS = [
    {
      key: 'stripe',
      name: 'Stripe',
      url: 'https://ccgenerator.org/test-card-numbers/#stripe',
      note: 'Any future expiry and any CVC of the right length. The number alone decides the outcome.',
      verified: '2026-08-03',
      cards: [
        { number: '4242424242424242', brand: 'Visa', behaviour: 'Succeeds' },
        { number: '5555555555554444', brand: 'Mastercard', behaviour: 'Succeeds' },
        { number: '2223003122003222', brand: 'Mastercard 2-series', behaviour: 'Succeeds' },
        { number: '378282246310005', brand: 'American Express', behaviour: 'Succeeds' },
        { number: '6011111111111117', brand: 'Discover', behaviour: 'Succeeds' },
        { number: '3566002020360505', brand: 'JCB', behaviour: 'Succeeds' },
        { number: '6200000000000005', brand: 'UnionPay', behaviour: 'Succeeds' },
        { number: '4000000000000002', brand: 'Visa', behaviour: 'Declined — generic_decline' },
        { number: '4000000000009995', brand: 'Visa', behaviour: 'Declined — insufficient_funds' },
        { number: '4000000000000069', brand: 'Visa', behaviour: 'expired_card' },
        { number: '4000000000000127', brand: 'Visa', behaviour: 'incorrect_cvc' },
        { number: '4000002760003184', brand: 'Visa', behaviour: '3-D Secure challenge required' },
        { number: '4242424242424241', brand: 'Visa', behaviour: 'incorrect_number — fails Luhn on purpose' }
      ]
    },
    {
      key: 'braintree',
      name: 'Braintree',
      url: 'https://ccgenerator.org/test-card-numbers/#braintree',
      note: 'The card selects the brand; the transaction amount selects the response ($2,000–$2,999.99 declines).',
      verified: '2026-08-03',
      cards: [
        { number: '4111111111111111', brand: 'Visa', behaviour: 'Succeeds' },
        { number: '4005519200000004', brand: 'Visa', behaviour: 'Succeeds' },
        { number: '5555555555554444', brand: 'Mastercard', behaviour: 'Succeeds' },
        { number: '2223000048400011', brand: 'Mastercard 2-series', behaviour: 'Succeeds' },
        { number: '378282246310005', brand: 'American Express', behaviour: 'Succeeds' },
        { number: '6011000991300009', brand: 'Discover', behaviour: 'Succeeds' },
        { number: '3530111333300000', brand: 'JCB', behaviour: 'Succeeds' },
        { number: '4000111111111115', brand: 'Visa', behaviour: 'Processor declined on verification' }
      ]
    },
    {
      key: 'adyen',
      name: 'Adyen',
      url: 'https://ccgenerator.org/test-card-numbers/#adyen',
      note: 'Adyen pins the expiry and security code: 03/2030 and CVC 737 (7373 for Amex).',
      verified: '2026-08-03',
      defaults: { expiry: '03/2030', cvv: '737' },
      cards: [
        { number: '4111111111111111', brand: 'Visa', behaviour: 'Succeeds' },
        { number: '5555555555554444', brand: 'Mastercard', behaviour: 'Succeeds' },
        { number: '370000000000002', brand: 'American Express', behaviour: 'Succeeds', cvv: '7373' },
        { number: '6011601160116611', brand: 'Discover', behaviour: 'Succeeds' },
        { number: '3569990010095841', brand: 'JCB', behaviour: 'Succeeds' },
        { number: '6771798021000008', brand: 'Maestro', behaviour: 'Succeeds' },
        { number: '8171999927660000', brand: 'UnionPay', behaviour: 'Succeeds', expiry: '10/2030' }
      ]
    },
    {
      key: 'square',
      name: 'Square',
      url: 'https://ccgenerator.org/test-card-numbers/#square',
      note: 'Errors key on other fields: CVV 911 fails CVV, postal 99999 fails postal, expiry 01/40 fails expiry.',
      verified: '2026-08-03',
      defaults: { cvv: '111' },
      cards: [
        { number: '4111111111111111', brand: 'Visa', behaviour: 'Succeeds' },
        { number: '5105105105105100', brand: 'Mastercard', behaviour: 'Succeeds' },
        { number: '6011000000000004', brand: 'Discover', behaviour: 'Succeeds' },
        { number: '340000000000009', brand: 'American Express', behaviour: 'Succeeds', cvv: '1111' },
        { number: '4000000000000002', brand: 'Visa', behaviour: 'Declined' },
        { number: '4000000000000010', brand: 'Visa', behaviour: 'Card-on-file authorisation declined' }
      ]
    },
    {
      key: 'paypal',
      name: 'PayPal',
      url: 'https://ccgenerator.org/test-card-numbers/#paypal',
      note: 'Unusually, the cardholder name selects the outcome in PayPal’s sandbox, not the number.',
      verified: '2026-08-03',
      cards: [
        { number: '4012888888881881', brand: 'Visa', behaviour: 'Succeeds' },
        { number: '4005519200000004', brand: 'Visa', behaviour: 'Succeeds' }
      ]
    },
    {
      key: 'authorizenet',
      name: 'Authorize.Net',
      url: 'https://ccgenerator.org/test-card-numbers/#authorizenet',
      note: 'Leave the sandbox account in Live Mode. Outcomes come from the billing ZIP and the card code.',
      verified: '2026-08-03',
      cards: [
        { number: '4111111111111111', brand: 'Visa', behaviour: 'Succeeds' },
        { number: '5424000000000015', brand: 'Mastercard', behaviour: 'Succeeds' },
        { number: '2223000010309703', brand: 'Mastercard 2-series', behaviour: 'Succeeds' },
        { number: '370000000000002', brand: 'American Express', behaviour: 'Succeeds' },
        { number: '6011000000000012', brand: 'Discover', behaviour: 'Succeeds' },
        { number: '3088000000000017', brand: 'JCB', behaviour: 'Succeeds' }
      ]
    },
    {
      key: 'iyzico',
      name: 'iyzico',
      url: 'https://ccgenerator.org/test-card-numbers/#other-gateways-in-brief',
      note: 'The most useful Turkish set — includes Troy, and error generators for the failure paths.',
      verified: '2026-08-03',
      cards: [
        { number: '9792030000000000', brand: 'Troy credit', behaviour: 'Succeeds' },
        { number: '9792020000000001', brand: 'Troy debit', behaviour: 'Succeeds' },
        { number: '4111111111111129', brand: 'Visa', behaviour: 'Insufficient funds' },
        { number: '4151111111111112', brand: 'Visa', behaviour: '3-D Secure initialisation failed' }
      ]
    }
  ];

  root.CCG_GATEWAYS = GATEWAYS;
}(typeof self !== 'undefined' ? self : this));

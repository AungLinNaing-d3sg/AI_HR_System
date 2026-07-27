/**
 * Currency-related constants shared between the Currency domain's
 * validators, forms, and Route Handlers.
 */

/** ISO 4217 currency codes are always exactly 3 uppercase letters (e.g. USD, SGD, EUR). */
export const CURRENCY_CODE_REGEX = /^[A-Z]{3}$/;

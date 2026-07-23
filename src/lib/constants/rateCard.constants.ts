/**
 * Rate Card domain constants shared between the domain's validators, forms,
 * and Route Handlers.
 */

/** `EffectiveDate` wire format (`YYYY-MM-DD`), matching the backend contract (see docs/HR_System_BE.postman_collection.json). */
export const RATE_CARD_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** An hourly (cost) rate of exactly 0 (or negative) would make cost calculations meaningless, so it must be strictly positive. */
export const MIN_HOURLY_RATE = 0.01;

/**
 * A billing rate of 0 is a valid, if unusual, state (see the documented
 * `GetAllRateCards` example response, which includes a `BillingRate: 0` row)
 * - e.g. a role not yet priced for client billing - so only non-negative
 * values are rejected, unlike `MIN_HOURLY_RATE` above.
 */
export const MIN_BILLING_RATE = 0;

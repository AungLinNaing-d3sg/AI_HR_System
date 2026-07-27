/**
 * Exchange Rate domain constants shared between the domain's validators,
 * forms, and Route Handlers.
 */

/** `EffectiveDate` wire format (`YYYY-MM-DD`), matching the backend contract (see docs/HR_System_BE.postman_collection.json). */
export const EXCHANGE_RATE_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** A rate of exactly 0 (or negative) would make invoice currency conversion meaningless, so rates must be strictly positive. */
export const MIN_EXCHANGE_RATE = 0.000001;

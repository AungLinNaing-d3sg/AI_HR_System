/**
 * Country-related constants shared between the Country domain's validators,
 * forms, and Route Handlers.
 */

/** ISO 3166-1 alpha-2 country codes are always exactly 2 uppercase letters (e.g. SG, US, MM). */
export const COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;

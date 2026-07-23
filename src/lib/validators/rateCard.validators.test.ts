import { createRateCardSchema, updateRateCardSchema } from './rateCard.validators';

const validCreatePayload = {
  countryId: 'country-1',
  resourceRoleTypeId: 'role-1',
  currencyId: 'currency-1',
  hourlyRate: 25,
  billingRate: 75,
  effectiveDate: '2025-01-01',
  isActive: true,
};

describe('createRateCardSchema', () => {
  it('accepts a fully-populated valid payload', () => {
    expect(createRateCardSchema.safeParse(validCreatePayload).success).toBe(true);
  });

  it('coerces numeric string rates (as `<input type="number">` reports them) into numbers', () => {
    const result = createRateCardSchema.safeParse({ ...validCreatePayload, hourlyRate: '25', billingRate: '75' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hourlyRate).toBe(25);
      expect(result.data.billingRate).toBe(75);
    }
  });

  it('rejects a missing country', () => {
    const result = createRateCardSchema.safeParse({ ...validCreatePayload, countryId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing resource role type', () => {
    const result = createRateCardSchema.safeParse({ ...validCreatePayload, resourceRoleTypeId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing currency', () => {
    const result = createRateCardSchema.safeParse({ ...validCreatePayload, currencyId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty hourly rate (as `<input type="number">` reports when cleared)', () => {
    const result = createRateCardSchema.safeParse({ ...validCreatePayload, hourlyRate: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a zero hourly rate', () => {
    const result = createRateCardSchema.safeParse({ ...validCreatePayload, hourlyRate: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects a negative hourly rate', () => {
    const result = createRateCardSchema.safeParse({ ...validCreatePayload, hourlyRate: -5 });
    expect(result.success).toBe(false);
  });

  it('rejects a non-numeric hourly rate', () => {
    const result = createRateCardSchema.safeParse({ ...validCreatePayload, hourlyRate: 'abc' });
    expect(result.success).toBe(false);
  });

  it('accepts a zero billing rate (an unpriced role is a valid state)', () => {
    const result = createRateCardSchema.safeParse({ ...validCreatePayload, billingRate: 0 });
    expect(result.success).toBe(true);
  });

  it('rejects a negative billing rate', () => {
    const result = createRateCardSchema.safeParse({ ...validCreatePayload, billingRate: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects a missing effective date', () => {
    const result = createRateCardSchema.safeParse({ ...validCreatePayload, effectiveDate: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed effective date', () => {
    const result = createRateCardSchema.safeParse({ ...validCreatePayload, effectiveDate: '01/01/2025' });
    expect(result.success).toBe(false);
  });

  it('rejects an impossible calendar date', () => {
    const result = createRateCardSchema.safeParse({ ...validCreatePayload, effectiveDate: '2025-13-45' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-boolean isActive', () => {
    const result = createRateCardSchema.safeParse({ ...validCreatePayload, isActive: 'yes' });
    expect(result.success).toBe(false);
  });
});

describe('updateRateCardSchema', () => {
  const validUpdatePayload = { hourlyRate: 25, billingRate: 75, effectiveDate: '2025-01-01', isActive: true };

  it('accepts a valid payload without countryId/resourceRoleTypeId/currencyId', () => {
    expect(updateRateCardSchema.safeParse(validUpdatePayload).success).toBe(true);
  });

  it('rejects a missing hourly rate', () => {
    const result = updateRateCardSchema.safeParse({ ...validUpdatePayload, hourlyRate: '' });
    expect(result.success).toBe(false);
  });

  it('coerces an empty billing rate (as `<input type="number">` reports when cleared) to 0, which is valid', () => {
    // Unlike hourlyRate, a billing rate of 0 is a valid state (see MIN_BILLING_RATE's comment),
    // so an empty/cleared input coerces to 0 and passes rather than failing as "required".
    const result = updateRateCardSchema.safeParse({ ...validUpdatePayload, billingRate: '' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.billingRate).toBe(0);
    }
  });

  it('rejects a negative billing rate', () => {
    const result = updateRateCardSchema.safeParse({ ...validUpdatePayload, billingRate: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects a missing effective date', () => {
    const result = updateRateCardSchema.safeParse({ ...validUpdatePayload, effectiveDate: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing isActive', () => {
    const withoutIsActive = { ...validUpdatePayload, isActive: undefined };
    const result = updateRateCardSchema.safeParse(withoutIsActive);
    expect(result.success).toBe(false);
  });
});

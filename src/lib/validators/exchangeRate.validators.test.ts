import { createExchangeRateSchema, updateExchangeRateSchema } from './exchangeRate.validators';

const validCreatePayload = {
  toCurrencyId: 'currency-2',
  rate: 0.74,
  effectiveDate: '2025-01-01',
  isActive: true,
};

describe('createExchangeRateSchema', () => {
  it('accepts a fully-populated valid payload', () => {
    expect(createExchangeRateSchema.safeParse(validCreatePayload).success).toBe(true);
  });

  it('coerces a numeric string rate (as `<input type="number">` reports it) into a number', () => {
    const result = createExchangeRateSchema.safeParse({ ...validCreatePayload, rate: '0.74' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rate).toBe(0.74);
    }
  });

  it('rejects a missing target currency', () => {
    const result = createExchangeRateSchema.safeParse({ ...validCreatePayload, toCurrencyId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty rate (as `<input type="number">` reports when cleared)', () => {
    const result = createExchangeRateSchema.safeParse({ ...validCreatePayload, rate: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a zero rate', () => {
    const result = createExchangeRateSchema.safeParse({ ...validCreatePayload, rate: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects a negative rate', () => {
    const result = createExchangeRateSchema.safeParse({ ...validCreatePayload, rate: -1.5 });
    expect(result.success).toBe(false);
  });

  it('rejects a non-numeric rate', () => {
    const result = createExchangeRateSchema.safeParse({ ...validCreatePayload, rate: 'abc' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing effective date', () => {
    const result = createExchangeRateSchema.safeParse({ ...validCreatePayload, effectiveDate: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed effective date', () => {
    const result = createExchangeRateSchema.safeParse({ ...validCreatePayload, effectiveDate: '01/01/2025' });
    expect(result.success).toBe(false);
  });

  it('rejects an impossible calendar date', () => {
    const result = createExchangeRateSchema.safeParse({ ...validCreatePayload, effectiveDate: '2025-13-45' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-boolean isActive', () => {
    const result = createExchangeRateSchema.safeParse({ ...validCreatePayload, isActive: 'yes' });
    expect(result.success).toBe(false);
  });
});

describe('updateExchangeRateSchema', () => {
  const validUpdatePayload = { rate: 0.8, effectiveDate: '2025-02-01', isActive: true };

  it('accepts a valid payload without toCurrencyId', () => {
    expect(updateExchangeRateSchema.safeParse(validUpdatePayload).success).toBe(true);
  });

  it('rejects a missing rate', () => {
    const result = updateExchangeRateSchema.safeParse({ ...validUpdatePayload, rate: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing effective date', () => {
    const result = updateExchangeRateSchema.safeParse({ ...validUpdatePayload, effectiveDate: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing isActive', () => {
    const withoutIsActive = { rate: validUpdatePayload.rate, effectiveDate: validUpdatePayload.effectiveDate };
    const result = updateExchangeRateSchema.safeParse(withoutIsActive);
    expect(result.success).toBe(false);
  });
});

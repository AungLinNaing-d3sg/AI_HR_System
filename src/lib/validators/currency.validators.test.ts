import { createCurrencySchema, updateCurrencySchema } from './currency.validators';

const validCreatePayload = {
  code: 'usd',
  name: 'US Dollar',
  symbol: '$',
  isBaseCurrency: false,
  isActive: true,
};

describe('createCurrencySchema', () => {
  it('accepts a fully-populated valid payload', () => {
    expect(createCurrencySchema.safeParse(validCreatePayload).success).toBe(true);
  });

  it('normalizes a lowercase code to uppercase', () => {
    const result = createCurrencySchema.safeParse(validCreatePayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe('USD');
    }
  });

  it('rejects a missing code', () => {
    const result = createCurrencySchema.safeParse({ ...validCreatePayload, code: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a code that is not exactly 3 letters', () => {
    const result = createCurrencySchema.safeParse({ ...validCreatePayload, code: 'US' });
    expect(result.success).toBe(false);
  });

  it('rejects a code containing digits', () => {
    const result = createCurrencySchema.safeParse({ ...validCreatePayload, code: 'US1' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing name', () => {
    const result = createCurrencySchema.safeParse({ ...validCreatePayload, name: '  ' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing symbol', () => {
    const result = createCurrencySchema.safeParse({ ...validCreatePayload, symbol: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-boolean isBaseCurrency', () => {
    const result = createCurrencySchema.safeParse({ ...validCreatePayload, isBaseCurrency: 'yes' });
    expect(result.success).toBe(false);
  });
});

describe('updateCurrencySchema', () => {
  const validUpdatePayload = { name: 'Singapore Dollar', symbol: 'SGD', isActive: true };

  it('accepts a valid payload without code/isBaseCurrency', () => {
    expect(updateCurrencySchema.safeParse(validUpdatePayload).success).toBe(true);
  });

  it('rejects a missing name', () => {
    const result = updateCurrencySchema.safeParse({ ...validUpdatePayload, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing symbol', () => {
    const result = updateCurrencySchema.safeParse({ ...validUpdatePayload, symbol: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing isActive', () => {
    const withoutIsActive = { name: validUpdatePayload.name, symbol: validUpdatePayload.symbol };
    const result = updateCurrencySchema.safeParse(withoutIsActive);
    expect(result.success).toBe(false);
  });
});

import { createCountrySchema, updateCountrySchema } from './country.validators';

const validCreatePayload = {
  code: 'sg',
  name: 'Singapore',
};

describe('createCountrySchema', () => {
  it('accepts a fully-populated valid payload', () => {
    expect(createCountrySchema.safeParse(validCreatePayload).success).toBe(true);
  });

  it('normalizes a lowercase code to uppercase', () => {
    const result = createCountrySchema.safeParse(validCreatePayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe('SG');
    }
  });

  it('rejects a missing code', () => {
    const result = createCountrySchema.safeParse({ ...validCreatePayload, code: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a code that is not exactly 2 letters', () => {
    const result = createCountrySchema.safeParse({ ...validCreatePayload, code: 'SGP' });
    expect(result.success).toBe(false);
  });

  it('rejects a code containing digits', () => {
    const result = createCountrySchema.safeParse({ ...validCreatePayload, code: 'S1' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing name', () => {
    const result = createCountrySchema.safeParse({ ...validCreatePayload, name: '  ' });
    expect(result.success).toBe(false);
  });

  it('rejects a name that is too long', () => {
    const result = createCountrySchema.safeParse({ ...validCreatePayload, name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });
});

describe('updateCountrySchema', () => {
  const validUpdatePayload = { name: 'Union of Myanmar' };

  it('accepts a valid payload without code', () => {
    expect(updateCountrySchema.safeParse(validUpdatePayload).success).toBe(true);
  });

  it('rejects a missing name', () => {
    const result = updateCountrySchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});

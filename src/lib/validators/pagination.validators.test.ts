import { paginationQuerySchema } from './pagination.validators';

describe('paginationQuerySchema', () => {
  it('accepts both fields absent (both optional)', () => {
    const result = paginationQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('coerces valid numeric strings', () => {
    const result = paginationQuerySchema.safeParse({ pageNo: '2', pageSize: '20' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ pageNo: 2, pageSize: 20 });
    }
  });

  it('rejects a pageNo below 1', () => {
    const result = paginationQuerySchema.safeParse({ pageNo: '0' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-integer pageNo', () => {
    const result = paginationQuerySchema.safeParse({ pageNo: '1.5' });
    expect(result.success).toBe(false);
  });

  it('rejects a pageSize below 1', () => {
    const result = paginationQuerySchema.safeParse({ pageSize: '0' });
    expect(result.success).toBe(false);
  });

  it('rejects a pageSize above the maximum', () => {
    const result = paginationQuerySchema.safeParse({ pageSize: '9999' });
    expect(result.success).toBe(false);
  });
});

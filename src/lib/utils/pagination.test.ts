import { resolvePagination } from './pagination';

describe('resolvePagination', () => {
  const defaults = { pageNo: 1, pageSize: 100 };

  it('falls back to defaults when pageNo/pageSize are both absent', () => {
    const params = new URLSearchParams('');
    expect(resolvePagination(params, defaults)).toEqual(defaults);
  });

  it('uses the provided pageNo/pageSize when both are present and valid', () => {
    const params = new URLSearchParams('pageNo=2&pageSize=20');
    expect(resolvePagination(params, defaults)).toEqual({ pageNo: 2, pageSize: 20 });
  });

  it('falls back to the default pageSize when only pageNo is provided', () => {
    const params = new URLSearchParams('pageNo=3');
    expect(resolvePagination(params, defaults)).toEqual({ pageNo: 3, pageSize: 100 });
  });

  it('falls back to the default pageNo when only pageSize is provided', () => {
    const params = new URLSearchParams('pageSize=50');
    expect(resolvePagination(params, defaults)).toEqual({ pageNo: 1, pageSize: 50 });
  });

  it('falls back to defaults entirely when pageNo is not a positive integer', () => {
    const params = new URLSearchParams('pageNo=0&pageSize=20');
    expect(resolvePagination(params, defaults)).toEqual(defaults);
  });

  it('falls back to defaults entirely when pageSize exceeds the maximum allowed', () => {
    const params = new URLSearchParams('pageNo=1&pageSize=99999');
    expect(resolvePagination(params, defaults)).toEqual(defaults);
  });

  it('falls back to defaults entirely when pageNo is not numeric', () => {
    const params = new URLSearchParams('pageNo=not-a-number');
    expect(resolvePagination(params, defaults)).toEqual(defaults);
  });
});

import { getPageNumbers, resolvePagination } from './pagination';

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

describe('getPageNumbers', () => {
  it('returns every page, with no ellipsis, when they all fit', () => {
    expect(getPageNumbers(1, 1)).toEqual([1]);
    expect(getPageNumbers(2, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageNumbers(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('shows a trailing ellipsis when the current page is near the start', () => {
    expect(getPageNumbers(1, 20)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 20]);
    expect(getPageNumbers(2, 20)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 20]);
  });

  it('shows a leading ellipsis when the current page is near the end', () => {
    expect(getPageNumbers(20, 20)).toEqual([1, 'ellipsis', 16, 17, 18, 19, 20]);
    expect(getPageNumbers(19, 20)).toEqual([1, 'ellipsis', 16, 17, 18, 19, 20]);
  });

  it('shows both a leading and trailing ellipsis when the current page is in the middle', () => {
    expect(getPageNumbers(10, 20)).toEqual([1, 'ellipsis', 9, 10, 11, 'ellipsis', 20]);
  });

  it('clamps an out-of-range pageNo into [1, totalPages] rather than throwing', () => {
    expect(getPageNumbers(0, 20)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 20]);
    expect(getPageNumbers(999, 20)).toEqual([1, 'ellipsis', 16, 17, 18, 19, 20]);
  });
});

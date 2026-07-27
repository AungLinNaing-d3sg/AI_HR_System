import { act, renderHook } from '@testing-library/react';
import { usePagination } from './usePagination';
import { DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination.constants';

describe('usePagination', () => {
  it('defaults to page 1 and the shared default page size', () => {
    const { result } = renderHook(() => usePagination());
    expect(result.current.pageNo).toBe(DEFAULT_PAGE_NO);
    expect(result.current.pageSize).toBe(DEFAULT_PAGE_SIZE);
  });

  it('honors initialPageNo/initialPageSize overrides', () => {
    const { result } = renderHook(() => usePagination({ initialPageNo: 3, initialPageSize: 50 }));
    expect(result.current.pageNo).toBe(3);
    expect(result.current.pageSize).toBe(50);
  });

  it('goToPage updates the current page', () => {
    const { result } = renderHook(() => usePagination());

    act(() => result.current.goToPage(4));

    expect(result.current.pageNo).toBe(4);
  });

  it('goToPage clamps to a minimum of page 1', () => {
    const { result } = renderHook(() => usePagination());

    act(() => result.current.goToPage(0));
    expect(result.current.pageNo).toBe(1);

    act(() => result.current.goToPage(-5));
    expect(result.current.pageNo).toBe(1);
  });

  it('setPageSize updates the page size and resets back to page 1', () => {
    const { result } = renderHook(() => usePagination());

    act(() => result.current.goToPage(3));
    expect(result.current.pageNo).toBe(3);

    act(() => result.current.setPageSize(50));

    expect(result.current.pageSize).toBe(50);
    expect(result.current.pageNo).toBe(DEFAULT_PAGE_NO);
  });

  it('reset restores the initial pageNo/pageSize', () => {
    const { result } = renderHook(() => usePagination({ initialPageNo: 2, initialPageSize: 10 }));

    act(() => result.current.goToPage(9));
    act(() => result.current.setPageSize(100));

    act(() => result.current.reset());

    expect(result.current.pageNo).toBe(2);
    expect(result.current.pageSize).toBe(10);
  });
});

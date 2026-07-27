import {
  getCurrentMonthDateRange,
  getCurrentYearMonth,
  parseMonthInputValue,
  toMonthInputValue,
} from './dateRange';

describe('getCurrentMonthDateRange', () => {
  it('returns the first and last day of the reference month', () => {
    const reference = new Date('2025-02-14T10:00:00.000Z');
    expect(getCurrentMonthDateRange(reference)).toEqual({ from: '2025-02-01', to: '2025-02-28' });
  });

  it('handles a 31-day month', () => {
    const reference = new Date('2025-01-05T00:00:00.000Z');
    expect(getCurrentMonthDateRange(reference)).toEqual({ from: '2025-01-01', to: '2025-01-31' });
  });

  it('handles December rolling into the next year correctly', () => {
    const reference = new Date('2025-12-25T00:00:00.000Z');
    expect(getCurrentMonthDateRange(reference)).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });
});

describe('getCurrentYearMonth', () => {
  it('returns a 1-12 month, not the 0-11 JS Date month', () => {
    const reference = new Date('2025-01-15T00:00:00.000Z');
    expect(getCurrentYearMonth(reference)).toEqual({ year: 2025, month: 1 });
  });

  it('returns December as month 12', () => {
    const reference = new Date('2025-12-01T00:00:00.000Z');
    expect(getCurrentYearMonth(reference)).toEqual({ year: 2025, month: 12 });
  });
});

describe('toMonthInputValue', () => {
  it('pads the month to two digits', () => {
    expect(toMonthInputValue(2025, 3)).toBe('2025-03');
  });

  it('does not pad a two-digit month', () => {
    expect(toMonthInputValue(2025, 12)).toBe('2025-12');
  });
});

describe('parseMonthInputValue', () => {
  it('parses a well-formed YYYY-MM value', () => {
    expect(parseMonthInputValue('2025-03')).toEqual({ year: 2025, month: 3 });
  });

  it('returns null for a malformed value', () => {
    expect(parseMonthInputValue('not-a-month')).toBeNull();
  });

  it('returns null for an out-of-range month', () => {
    expect(parseMonthInputValue('2025-13')).toBeNull();
    expect(parseMonthInputValue('2025-00')).toBeNull();
  });
});

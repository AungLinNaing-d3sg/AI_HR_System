import {
  addDays,
  formatDayHeader,
  formatDayLabel,
  formatWeekRangeLabel,
  getMondayOfWeek,
  getWeekDates,
  isValidDateString,
} from './week';

describe('isValidDateString', () => {
  it('accepts a well-formed calendar date', () => {
    expect(isValidDateString('2025-02-24')).toBe(true);
  });

  it('rejects a malformed string', () => {
    expect(isValidDateString('02/24/2025')).toBe(false);
    expect(isValidDateString('not-a-date')).toBe(false);
    expect(isValidDateString('')).toBe(false);
  });

  it('rejects an impossible calendar date', () => {
    expect(isValidDateString('2025-02-30')).toBe(false);
    expect(isValidDateString('2025-13-01')).toBe(false);
  });
});

describe('addDays', () => {
  it('adds whole days within the same month', () => {
    expect(addDays('2025-02-24', 3)).toBe('2025-02-27');
  });

  it('rolls over a month boundary', () => {
    expect(addDays('2025-02-27', 3)).toBe('2025-03-02');
  });

  it('subtracts days for a negative amount', () => {
    expect(addDays('2025-03-02', -7)).toBe('2025-02-23');
  });

  it('rolls over a year boundary', () => {
    expect(addDays('2025-12-30', 5)).toBe('2026-01-04');
  });
});

describe('getMondayOfWeek', () => {
  it('returns the same date when given a Monday', () => {
    expect(getMondayOfWeek(new Date('2025-02-24T12:00:00.000Z'))).toBe('2025-02-24');
  });

  it('returns the prior Monday for a mid-week date', () => {
    expect(getMondayOfWeek(new Date('2025-02-26T00:00:00.000Z'))).toBe('2025-02-24');
  });

  it('returns the prior Monday for a Sunday (ISO week wraps back, not forward)', () => {
    expect(getMondayOfWeek(new Date('2025-03-02T00:00:00.000Z'))).toBe('2025-02-24');
  });
});

describe('getWeekDates', () => {
  it('returns 7 dates, Monday first, spanning a month boundary', () => {
    expect(getWeekDates('2025-02-24')).toEqual([
      '2025-02-24',
      '2025-02-25',
      '2025-02-26',
      '2025-02-27',
      '2025-02-28',
      '2025-03-01',
      '2025-03-02',
    ]);
  });
});

describe('formatDayHeader', () => {
  it('formats the weekday and month/day separately', () => {
    expect(formatDayHeader('2025-02-24')).toEqual({ weekday: 'Mon', monthDay: 'Feb 24' });
  });
});

describe('formatDayLabel', () => {
  it('combines weekday and month/day into one label', () => {
    expect(formatDayLabel('2025-02-24')).toBe('Mon, Feb 24');
  });
});

describe('formatWeekRangeLabel', () => {
  it('formats a week spanning two months with the year on the end date', () => {
    expect(formatWeekRangeLabel('2025-02-24')).toBe('Feb 24 – Mar 2, 2025');
  });
});

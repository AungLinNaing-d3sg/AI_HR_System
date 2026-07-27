import { pickSearchParams } from './searchParams';

describe('pickSearchParams', () => {
  it('picks only the requested keys that are present', () => {
    const params = new URLSearchParams('startDate=2025-01-01&endDate=2025-01-31&extra=ignored');
    expect(pickSearchParams(params, ['startDate', 'endDate', 'projectId'])).toEqual({
      startDate: '2025-01-01',
      endDate: '2025-01-31',
    });
  });

  it('returns an empty object when no requested keys are present', () => {
    const params = new URLSearchParams('');
    expect(pickSearchParams(params, ['startDate', 'endDate'])).toEqual({});
  });

  it('includes a key present as an empty string (distinct from absent)', () => {
    const params = new URLSearchParams('projectId=');
    expect(pickSearchParams(params, ['projectId'])).toEqual({ projectId: '' });
  });
});

import { AxiosError, AxiosHeaders } from 'axios';
import { getApiErrorMessage } from './apiError';

function makeAxiosError(data: unknown, status = 400): AxiosError {
  return new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    {
      status,
      statusText: 'Bad Request',
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
      data,
    }
  );
}

describe('getApiErrorMessage', () => {
  it('returns the backend message when present', () => {
    const error = makeAxiosError({ message: 'Invalid credentials' });
    expect(getApiErrorMessage(error)).toBe('Invalid credentials');
  });

  it('falls back to the first field validation error when no top-level message exists', () => {
    const error = makeAxiosError({
      errors: { Email: ['Email is required.'], Password: ['Too short.'] },
    });
    expect(getApiErrorMessage(error)).toBe('Email is required.');
  });

  it('returns the default fallback for a non-axios error', () => {
    expect(getApiErrorMessage(new Error('boom'))).toBe(
      'Something went wrong. Please try again.'
    );
  });

  it('returns a custom fallback when provided and no message/errors are present', () => {
    const error = makeAxiosError({});
    expect(getApiErrorMessage(error, 'Custom fallback')).toBe('Custom fallback');
  });

  it('handles an axios error with no response object', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK');
    expect(getApiErrorMessage(error)).toBe('Something went wrong. Please try again.');
  });

  it('ignores an errors object whose first field has an empty message array', () => {
    const error = makeAxiosError({ errors: { Email: [] } });
    expect(getApiErrorMessage(error)).toBe('Something went wrong. Please try again.');
  });
});

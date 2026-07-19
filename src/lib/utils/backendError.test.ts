/**
 * @jest-environment node
 */
import { AxiosError, AxiosHeaders } from 'axios';
import { getBackendErrorDetails } from './backendError';

function makeAxiosError(status: number, data: unknown): AxiosError {
  return new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    {
      status,
      statusText: '',
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
      data,
    }
  );
}

describe('getBackendErrorDetails', () => {
  it('extracts the message and status from a backend AxiosError', () => {
    const error = makeAxiosError(401, { Message: 'Invalid credentials.' });
    expect(getBackendErrorDetails(error)).toEqual({
      status: 401,
      message: 'Invalid credentials.',
      errors: undefined,
    });
  });

  it('extracts field-level errors when present', () => {
    const error = makeAxiosError(400, {
      Message: 'Validation failed.',
      Errors: { Email: ['Email is required.'] },
    });
    expect(getBackendErrorDetails(error)).toEqual({
      status: 400,
      message: 'Validation failed.',
      errors: { Email: ['Email is required.'] },
    });
  });

  it('falls back to the default message when the backend body has none', () => {
    const error = makeAxiosError(500, {});
    expect(getBackendErrorDetails(error, 'fallback message').message).toBe('fallback message');
  });

  it('surfaces ASP.NET Core\'s raw ProblemDetails validation message (e.g. a malformed GUID that fails model binding before the envelope even runs)', () => {
    const error = makeAxiosError(400, {
      title: 'One or more validation errors occurred.',
      status: 400,
      errors: {
        RoleId: [
          'The JSON value could not be converted to System.Guid. Path: $.RoleId | LineNumber: 0 | BytePositionInLine: 171.',
        ],
      },
    });
    const details = getBackendErrorDetails(error);
    expect(details.message).toBe(
      'The JSON value could not be converted to System.Guid. Path: $.RoleId | LineNumber: 0 | BytePositionInLine: 171.'
    );
    expect(details.errors).toEqual({
      RoleId: [
        'The JSON value could not be converted to System.Guid. Path: $.RoleId | LineNumber: 0 | BytePositionInLine: 171.',
      ],
    });
  });

  it('falls back to the ProblemDetails title when there is no per-field errors message', () => {
    const error = makeAxiosError(400, { title: 'One or more validation errors occurred.' });
    expect(getBackendErrorDetails(error).message).toBe('One or more validation errors occurred.');
  });

  it('returns a 502 with a generic message for a network-level failure', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK');
    expect(getBackendErrorDetails(error)).toEqual({ status: 502, message: 'Something went wrong. Please try again.' });
  });

  it('returns a 500 for a non-Axios error', () => {
    expect(getBackendErrorDetails(new Error('boom'))).toEqual({
      status: 500,
      message: 'Something went wrong. Please try again.',
    });
  });
});

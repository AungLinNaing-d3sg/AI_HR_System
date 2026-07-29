/**
 * @jest-environment node
 *
 * `jose`'s WebCrypto build expects Web platform globals (TextEncoder, etc.)
 * that the jsdom test environment doesn't provide out of the box. jwt.ts is
 * server-only anyway, so `node` is both correct and sufficient here.
 */
import { decodeAccessToken, extractRole, extractUserId, isTokenExpired } from './jwt';

/**
 * Builds a syntactically-valid (but unsigned/fake-signed) JWT string so
 * `decodeJwt` (which only base64-decodes, never verifies) can parse it.
 */
function makeToken(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');

  const header = base64url({ alg: 'HS256', typ: 'JWT' });
  const body = base64url(payload);
  return `${header}.${body}.fake-signature`;
}

describe('decodeAccessToken', () => {
  it('decodes a well-formed token', () => {
    const token = makeToken({ sub: 'user-1', role: 'User' });
    const claims = decodeAccessToken(token);
    expect(claims).toEqual({ sub: 'user-1', role: 'User' });
  });

  it('returns null for a malformed token', () => {
    expect(decodeAccessToken('not-a-jwt')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(decodeAccessToken('')).toBeNull();
  });
});

describe('extractRole', () => {
  it('reads the plain "role" claim', () => {
    expect(extractRole({ role: 'SystemAdmin' })).toBe('SystemAdmin');
  });

  it('reads the capitalized "Role" claim', () => {
    expect(extractRole({ Role: 'ProjectAdmin' })).toBe('ProjectAdmin');
  });

  it('reads the Microsoft claims-schema role URI when present', () => {
    const claims = {
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'User',
    };
    expect(extractRole(claims)).toBe('User');
  });

  it('takes the first entry when the role claim is an array', () => {
    expect(extractRole({ roles: ['ProjectAdmin', 'User'] })).toBe('ProjectAdmin');
  });

  it('returns null when no recognized role claim exists', () => {
    expect(extractRole({ sub: 'user-1' })).toBeNull();
  });

  it('returns null when claims are null', () => {
    expect(extractRole(null)).toBeNull();
  });
});

describe('extractUserId', () => {
  it('reads the standard "sub" claim', () => {
    expect(extractUserId({ sub: 'user-1' })).toBe('user-1');
  });

  it('reads the Microsoft claims-schema nameidentifier URI when "sub" is absent', () => {
    const claims = {
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': 'user-2',
    };
    expect(extractUserId(claims)).toBe('user-2');
  });

  it('returns null when no recognized user-id claim exists', () => {
    expect(extractUserId({ role: 'User' })).toBeNull();
  });

  it('returns null when claims are null', () => {
    expect(extractUserId(null)).toBeNull();
  });
});

describe('isTokenExpired', () => {
  it('returns true when claims are null', () => {
    expect(isTokenExpired(null)).toBe(true);
  });

  it('returns true when exp is missing', () => {
    expect(isTokenExpired({})).toBe(true);
  });

  it('returns true for a timestamp in the past', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 60;
    expect(isTokenExpired({ exp: pastExp })).toBe(true);
  });

  it('returns false for a timestamp in the future', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 60 * 60;
    expect(isTokenExpired({ exp: futureExp })).toBe(false);
  });
});

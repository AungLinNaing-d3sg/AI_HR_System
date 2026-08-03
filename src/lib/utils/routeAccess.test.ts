import { resolveRouteAccess } from './routeAccess';

describe('resolveRouteAccess', () => {
  it('redirects to login when there is no access token and no refresh token', () => {
    expect(
      resolveRouteAccess({
        pathname: '/profile',
        hasAccessToken: false,
        isAccessTokenExpired: true,
        hasRefreshToken: false,
        role: null,
      })
    ).toEqual({ type: 'redirect', destination: 'login' });
  });

  it('asks to refresh when the access token is expired but a refresh token exists', () => {
    expect(
      resolveRouteAccess({
        pathname: '/profile',
        hasAccessToken: true,
        isAccessTokenExpired: true,
        hasRefreshToken: true,
        role: 'Employee',
      })
    ).toEqual({ type: 'refresh' });
  });

  it('asks to refresh when there is no access token cookie at all but a refresh token exists', () => {
    expect(
      resolveRouteAccess({
        pathname: '/profile',
        hasAccessToken: false,
        isAccessTokenExpired: true,
        hasRefreshToken: true,
        role: null,
      })
    ).toEqual({ type: 'refresh' });
  });

  it('allows a valid session on a normal protected route', () => {
    expect(
      resolveRouteAccess({
        pathname: '/profile',
        hasAccessToken: true,
        isAccessTokenExpired: false,
        hasRefreshToken: true,
        role: 'Employee',
      })
    ).toEqual({ type: 'allow' });
  });

  it('allows a SystemAdmin on a SystemAdmin-only route', () => {
    expect(
      resolveRouteAccess({
        pathname: '/admin/users/create',
        hasAccessToken: true,
        isAccessTokenExpired: false,
        hasRefreshToken: true,
        role: 'SystemAdmin',
      })
    ).toEqual({ type: 'allow' });
  });

  it('redirects to forbidden when a non-admin hits a SystemAdmin-only route', () => {
    expect(
      resolveRouteAccess({
        pathname: '/admin/users/create',
        hasAccessToken: true,
        isAccessTokenExpired: false,
        hasRefreshToken: true,
        role: 'ProjectAdmin',
      })
    ).toEqual({ type: 'redirect', destination: 'forbidden' });
  });

  it('allows a SystemAdmin on /admin/exchange-rates', () => {
    expect(
      resolveRouteAccess({
        pathname: '/admin/exchange-rates',
        hasAccessToken: true,
        isAccessTokenExpired: false,
        hasRefreshToken: true,
        role: 'SystemAdmin',
      })
    ).toEqual({ type: 'allow' });
  });

  it('redirects to forbidden when a non-admin hits /admin/exchange-rates', () => {
    expect(
      resolveRouteAccess({
        pathname: '/admin/exchange-rates',
        hasAccessToken: true,
        isAccessTokenExpired: false,
        hasRefreshToken: true,
        role: 'ProjectAdmin',
      })
    ).toEqual({ type: 'redirect', destination: 'forbidden' });
  });

  it('allows a SystemAdmin on /admin/rate-cards', () => {
    expect(
      resolveRouteAccess({
        pathname: '/admin/rate-cards',
        hasAccessToken: true,
        isAccessTokenExpired: false,
        hasRefreshToken: true,
        role: 'SystemAdmin',
      })
    ).toEqual({ type: 'allow' });
  });

  it('redirects to forbidden when a non-admin hits /admin/rate-cards', () => {
    expect(
      resolveRouteAccess({
        pathname: '/admin/rate-cards',
        hasAccessToken: true,
        isAccessTokenExpired: false,
        hasRefreshToken: true,
        role: 'ProjectAdmin',
      })
    ).toEqual({ type: 'redirect', destination: 'forbidden' });
  });

  it('allows a SystemAdmin on /admin/resource-role-types', () => {
    expect(
      resolveRouteAccess({
        pathname: '/admin/resource-role-types',
        hasAccessToken: true,
        isAccessTokenExpired: false,
        hasRefreshToken: true,
        role: 'SystemAdmin',
      })
    ).toEqual({ type: 'allow' });
  });

  it('redirects to forbidden when a non-admin hits /admin/resource-role-types', () => {
    expect(
      resolveRouteAccess({
        pathname: '/admin/resource-role-types',
        hasAccessToken: true,
        isAccessTokenExpired: false,
        hasRefreshToken: true,
        role: 'ProjectAdmin',
      })
    ).toEqual({ type: 'redirect', destination: 'forbidden' });
  });

  it('redirects to forbidden for a nested path under a SystemAdmin-only route', () => {
    expect(
      resolveRouteAccess({
        pathname: '/admin/users/create/extra',
        hasAccessToken: true,
        isAccessTokenExpired: false,
        hasRefreshToken: true,
        role: 'Employee',
      })
    ).toEqual({ type: 'redirect', destination: 'forbidden' });
  });

  it('allows a SystemAdmin on the /projects route', () => {
    expect(
      resolveRouteAccess({
        pathname: '/projects',
        hasAccessToken: true,
        isAccessTokenExpired: false,
        hasRefreshToken: true,
        role: 'SystemAdmin',
      })
    ).toEqual({ type: 'allow' });
  });

  it('allows a ProjectAdmin on a nested /projects path', () => {
    expect(
      resolveRouteAccess({
        pathname: '/projects/new',
        hasAccessToken: true,
        isAccessTokenExpired: false,
        hasRefreshToken: true,
        role: 'ProjectAdmin',
      })
    ).toEqual({ type: 'allow' });
  });

  it('allows a plain User on /projects (Projects is open to every authenticated role)', () => {
    expect(
      resolveRouteAccess({
        pathname: '/projects',
        hasAccessToken: true,
        isAccessTokenExpired: false,
        hasRefreshToken: true,
        role: 'Employee',
      })
    ).toEqual({ type: 'allow' });
  });

  it('allows a Guest on a nested /projects/:id path', () => {
    expect(
      resolveRouteAccess({
        pathname: '/projects/123',
        hasAccessToken: true,
        isAccessTokenExpired: false,
        hasRefreshToken: true,
        role: 'Guest',
      })
    ).toEqual({ type: 'allow' });
  });
});

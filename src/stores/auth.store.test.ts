import { useAuthStore } from './auth.store';
import type { AuthenticatedUser } from '@/types/domain.types';

const user: AuthenticatedUser = {
  id: 'user-1',
  username: 'jdoe',
  email: 'jdoe@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  employeeId: null,
  countryId: null,
  role: 'Employee',
};

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, hasHydrated: false });
    window.localStorage.clear();
  });

  it('starts with no user', () => {
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('setUser stores the authenticated user', () => {
    useAuthStore.getState().setUser(user);
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it('clearUser removes the authenticated user', () => {
    useAuthStore.getState().setUser(user);
    useAuthStore.getState().clearUser();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('persists only the user to localStorage, never tokens', () => {
    useAuthStore.getState().setUser(user);
    const raw = window.localStorage.getItem('hr-auth-user');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.state.user).toEqual(user);
    expect(JSON.stringify(parsed)).not.toContain('accessToken');
    expect(JSON.stringify(parsed)).not.toContain('refreshToken');
  });

  it('persists to localStorage (not sessionStorage) so a new browser tab shares the already-known profile', () => {
    useAuthStore.getState().setUser(user);
    expect(window.sessionStorage.getItem('hr-auth-user')).toBeNull();
    expect(window.localStorage.getItem('hr-auth-user')).not.toBeNull();
  });

  it('clearUser removes the persisted snapshot from localStorage on logout', () => {
    useAuthStore.getState().setUser(user);
    useAuthStore.getState().clearUser();
    const raw = window.localStorage.getItem('hr-auth-user');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string).state.user).toBeNull();
  });
});

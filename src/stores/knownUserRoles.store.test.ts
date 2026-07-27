import { useKnownUserRolesStore } from './knownUserRoles.store';

describe('useKnownUserRolesStore', () => {
  beforeEach(() => {
    useKnownUserRolesStore.setState({ roleNameByUserId: {} });
    window.sessionStorage.clear();
  });

  it('starts with no known roles', () => {
    expect(useKnownUserRolesStore.getState().roleNameByUserId).toEqual({});
  });

  it('records a role for a user id', () => {
    useKnownUserRolesStore.getState().recordUserRole('user-1', 'SystemAdmin');
    expect(useKnownUserRolesStore.getState().roleNameByUserId).toEqual({ 'user-1': 'SystemAdmin' });
  });

  it('records roles for multiple users without overwriting each other', () => {
    useKnownUserRolesStore.getState().recordUserRole('user-1', 'SystemAdmin');
    useKnownUserRolesStore.getState().recordUserRole('user-2', 'ProjectAdmin');
    expect(useKnownUserRolesStore.getState().roleNameByUserId).toEqual({
      'user-1': 'SystemAdmin',
      'user-2': 'ProjectAdmin',
    });
  });

  it('overwrites a previously recorded role for the same user id', () => {
    useKnownUserRolesStore.getState().recordUserRole('user-1', 'Employee');
    useKnownUserRolesStore.getState().recordUserRole('user-1', 'ProjectAdmin');
    expect(useKnownUserRolesStore.getState().roleNameByUserId['user-1']).toBe('ProjectAdmin');
  });

  it('persists to sessionStorage only', () => {
    useKnownUserRolesStore.getState().recordUserRole('user-1', 'SystemAdmin');
    const raw = window.sessionStorage.getItem('hr-known-user-roles');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.state.roleNameByUserId).toEqual({ 'user-1': 'SystemAdmin' });
  });
});

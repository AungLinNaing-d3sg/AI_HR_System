/**
 * @jest-environment node
 */
jest.mock('./backendClient', () => ({
  backendClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));

const { backendClient } = jest.requireMock('./backendClient') as {
  backendClient: { get: jest.Mock; post: jest.Mock; put: jest.Mock };
};

import * as authBackend from './authBackend.api';

describe('authBackend.api (server)', () => {
  beforeEach(() => {
    backendClient.get.mockReset();
    backendClient.post.mockReset();
    backendClient.put.mockReset();
  });

  it('login posts to /Auth/Login without an Authorization header', async () => {
    backendClient.post.mockResolvedValue({ data: { AccessToken: 'a' } });
    await authBackend.login({ UsernameOrEmail: 'jdoe', Password: 'Password@123' });
    expect(backendClient.post).toHaveBeenCalledWith('/Auth/Login', {
      UsernameOrEmail: 'jdoe',
      Password: 'Password@123',
    });
  });

  it('refreshToken posts to /Auth/RefreshToken', async () => {
    backendClient.post.mockResolvedValue({ data: { AccessToken: 'a' } });
    await authBackend.refreshToken({ RefreshToken: 'r' });
    expect(backendClient.post).toHaveBeenCalledWith('/Auth/RefreshToken', { RefreshToken: 'r' });
  });

  it('logout posts to /Auth/Logout with a Bearer header', async () => {
    backendClient.post.mockResolvedValue({ data: {} });
    await authBackend.logout({ RefreshToken: 'r' }, 'access-token');
    expect(backendClient.post).toHaveBeenCalledWith('/Auth/Logout', { RefreshToken: 'r' }, {
      headers: { Authorization: 'Bearer access-token' },
    });
  });

  it('updateProfile puts to /Auth/UpdateProfile with a Bearer header', async () => {
    backendClient.put.mockResolvedValue({ data: { Id: 'user-1' } });
    const payload = { FirstName: 'Jane', LastName: 'Doe', Email: 'jdoe@example.com', CountryId: null };
    await authBackend.updateProfile(payload, 'access-token');
    expect(backendClient.put).toHaveBeenCalledWith('/Auth/UpdateProfile', payload, {
      headers: { Authorization: 'Bearer access-token' },
    });
  });

  it('changePassword puts to /Auth/ChangePassword with a Bearer header', async () => {
    backendClient.put.mockResolvedValue({ data: {} });
    const payload = { CurrentPassword: 'a', NewPassword: 'b', ConfirmNewPassword: 'b' };
    await authBackend.changePassword(payload, 'access-token');
    expect(backendClient.put).toHaveBeenCalledWith('/Auth/ChangePassword', payload, {
      headers: { Authorization: 'Bearer access-token' },
    });
  });

  it('createUser posts to /Auth/CreateUser with a Bearer header', async () => {
    backendClient.post.mockResolvedValue({ data: { Id: 'user-2' } });
    const payload = {
      Username: 'jdoe',
      Email: 'jdoe@example.com',
      Password: 'Password@123',
      FirstName: 'Jane',
      LastName: 'Doe',
      RoleId: 'role-1',
    };
    await authBackend.createUser(payload, 'access-token');
    expect(backendClient.post).toHaveBeenCalledWith('/Auth/CreateUser', payload, {
      headers: { Authorization: 'Bearer access-token' },
    });
  });

  it('getRoles gets /Auth/GetRoles with a Bearer header', async () => {
    backendClient.get.mockResolvedValue({ data: [{ Id: 'role-1', Name: 'SystemAdmin', Description: null }] });
    const result = await authBackend.getRoles('access-token');
    expect(backendClient.get).toHaveBeenCalledWith('/Auth/GetRoles', {
      headers: { Authorization: 'Bearer access-token' },
    });
    expect(result).toEqual([{ Id: 'role-1', Name: 'SystemAdmin', Description: null }]);
  });

  it('getUnassignedUsers gets /Auth/GetUnassignedUsers with a Bearer header', async () => {
    backendClient.get.mockResolvedValue({
      data: [{ UserId: 'user-1', Username: 'jdoe', Email: 'jdoe@example.com', FirstName: 'Jane', LastName: 'Doe', EmployeeId: null }],
    });
    const result = await authBackend.getUnassignedUsers('access-token');
    expect(backendClient.get).toHaveBeenCalledWith('/Auth/GetUnassignedUsers', {
      headers: { Authorization: 'Bearer access-token' },
    });
    expect(result).toEqual([
      { UserId: 'user-1', Username: 'jdoe', Email: 'jdoe@example.com', FirstName: 'Jane', LastName: 'Doe', EmployeeId: null },
    ]);
  });
});

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

  it('getUserList gets /Auth/GetUserList with a Bearer header and defaults to pageNo=1/pageSize=10', async () => {
    const page = {
      TotalCount: 1,
      PageNo: 1,
      PageSize: 10,
      Items: [{ UserId: 'user-1', Username: 'jdoe', Email: 'jdoe@example.com', FirstName: 'Jane', LastName: 'Doe', EmployeeId: null }],
    };
    backendClient.get.mockResolvedValue({ data: page });
    const result = await authBackend.getUserList('access-token');
    expect(backendClient.get).toHaveBeenCalledWith('/Auth/GetUserList', {
      headers: { Authorization: 'Bearer access-token' },
      params: { pageNo: 1, pageSize: 10 },
    });
    expect(result).toEqual(page);
  });

  it('getUserList forwards an explicit pageNo/pageSize when provided', async () => {
    backendClient.get.mockResolvedValue({ data: { TotalCount: 0, PageNo: 2, PageSize: 20, Items: [] } });
    await authBackend.getUserList('access-token', { pageNo: 2, pageSize: 20 });
    expect(backendClient.get).toHaveBeenCalledWith('/Auth/GetUserList', {
      headers: { Authorization: 'Bearer access-token' },
      params: { pageNo: 2, pageSize: 20 },
    });
  });

  it('updateUser puts to /Auth/UpdateUser/{id} with a Bearer header', async () => {
    const responseData = {
      UserId: 'user-2',
      Username: 'testedited',
      Email: 'test@d3-sg.com',
      FirstName: 'Lin Thit',
      LastName: 'Htoo',
      EmployeeId: 'EMP002',
      CountryId: 'country-1',
      IsActive: true,
      RoleName: 'SystemAdmin',
    };
    backendClient.put.mockResolvedValue({ data: responseData });
    const payload = {
      Username: 'testedited',
      Email: 'test@d3-sg.com',
      FirstName: 'Lin Thit',
      LastName: 'Htoo',
      EmployeeId: 'EMP002',
      CountryId: 'country-1',
      IsActive: true,
      RoleId: null,
    };
    const result = await authBackend.updateUser('user-2', payload, 'access-token');
    expect(backendClient.put).toHaveBeenCalledWith('/Auth/UpdateUser/user-2', payload, {
      headers: { Authorization: 'Bearer access-token' },
    });
    expect(result).toEqual(responseData);
  });

  it('resetPassword puts to /Auth/ResetPassword/{id} with a Bearer header', async () => {
    backendClient.put.mockResolvedValue({ data: null });
    const payload = { NewPassword: 'NewPass@123', ConfirmNewPassword: 'NewPass@123' };
    await authBackend.resetPassword('user-2', payload, 'access-token');
    expect(backendClient.put).toHaveBeenCalledWith('/Auth/ResetPassword/user-2', payload, {
      headers: { Authorization: 'Bearer access-token' },
    });
  });

  it('searchUsers gets /Auth/SearchUsers with a Bearer header and the given email/userName params', async () => {
    const results = [
      { UserId: 'user-1', Username: 'jdoe', Email: 'jdoe@example.com', FirstName: 'Jane', LastName: 'Doe', EmployeeId: null },
    ];
    backendClient.get.mockResolvedValue({ data: results });
    const result = await authBackend.searchUsers({ email: 'jdoe', userName: 'jdoe' }, 'access-token');
    expect(backendClient.get).toHaveBeenCalledWith('/Auth/SearchUsers', {
      headers: { Authorization: 'Bearer access-token' },
      params: { email: 'jdoe', userName: 'jdoe' },
    });
    expect(result).toEqual(results);
  });
});

jest.mock('./axios', () => ({
  axiosInstance: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));

const { axiosInstance } = jest.requireMock('./axios') as {
  axiosInstance: { get: jest.Mock; post: jest.Mock; put: jest.Mock };
};

import * as authApi from './auth.api';
import type { AuthenticatedUser, Role, UserListItem } from '@/types/domain.types';

const user: AuthenticatedUser = {
  id: 'user-1',
  username: 'jdoe',
  email: 'jdoe@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  employeeId: null,
  countryId: null,
  role: 'User',
};

describe('auth.api (client)', () => {
  beforeEach(() => {
    axiosInstance.get.mockReset();
    axiosInstance.post.mockReset();
    axiosInstance.put.mockReset();
  });

  it('login posts to /auth/login and returns the user', async () => {
    axiosInstance.post.mockResolvedValue({ data: { user } });
    const result = await authApi.login({ usernameOrEmail: 'jdoe', password: 'Password@123' });
    expect(axiosInstance.post).toHaveBeenCalledWith('/auth/login', {
      usernameOrEmail: 'jdoe',
      password: 'Password@123',
    });
    expect(result).toEqual(user);
  });

  it('logout posts to /auth/logout', async () => {
    axiosInstance.post.mockResolvedValue({ data: { success: true } });
    await authApi.logout();
    expect(axiosInstance.post).toHaveBeenCalledWith('/auth/logout');
  });

  it('updateProfile puts to /auth/profile and returns the user', async () => {
    axiosInstance.put.mockResolvedValue({ data: { user } });
    const values = { firstName: 'Jane', lastName: 'Doe', email: 'jdoe@example.com', countryId: null };
    const result = await authApi.updateProfile(values);
    expect(axiosInstance.put).toHaveBeenCalledWith('/auth/profile', values);
    expect(result).toEqual(user);
  });

  it('changePassword puts to /auth/change-password', async () => {
    axiosInstance.put.mockResolvedValue({ data: { success: true } });
    const values = {
      currentPassword: 'OldPass@123',
      newPassword: 'NewPass@123',
      confirmNewPassword: 'NewPass@123',
    };
    await authApi.changePassword(values);
    expect(axiosInstance.put).toHaveBeenCalledWith('/auth/change-password', values);
  });

  it('createUser posts to /auth/users and returns the created user', async () => {
    axiosInstance.post.mockResolvedValue({ data: { user } });
    const values = {
      username: 'jdoe',
      email: 'jdoe@example.com',
      password: 'Password@123',
      firstName: 'Jane',
      lastName: 'Doe',
      employeeId: '',
      countryId: '',
      roleId: 'role-1',
    };
    const result = await authApi.createUser(values);
    expect(axiosInstance.post).toHaveBeenCalledWith('/auth/users', values);
    expect(result).toEqual(user);
  });

  it('getRoles gets /auth/roles and returns the role list', async () => {
    const role: Role = { id: 'role-1', name: 'SystemAdmin', description: 'Full system access' };
    axiosInstance.get.mockResolvedValue({ data: { roles: [role] } });
    const result = await authApi.getRoles();
    expect(axiosInstance.get).toHaveBeenCalledWith('/auth/roles');
    expect(result).toEqual([role]);
  });

  it('getUserList gets /auth/user-list and returns the candidate user list', async () => {
    const candidate: UserListItem = {
      userId: 'user-2',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
    };
    axiosInstance.get.mockResolvedValue({ data: { users: [candidate] } });
    const result = await authApi.getUserList();
    expect(axiosInstance.get).toHaveBeenCalledWith('/auth/user-list');
    expect(result).toEqual([candidate]);
  });
});

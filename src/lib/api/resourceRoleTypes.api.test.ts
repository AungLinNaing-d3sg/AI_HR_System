jest.mock('./axios', () => ({
  axiosInstance: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const { axiosInstance } = jest.requireMock('./axios') as {
  axiosInstance: { get: jest.Mock; post: jest.Mock; put: jest.Mock; delete: jest.Mock };
};

import * as resourceRoleTypesApi from './resourceRoleTypes.api';
import type { ResourceRoleType } from '@/types/domain.types';

const roleType: ResourceRoleType = {
  id: 'role-1',
  name: 'Senior Developer',
  description: 'Senior software engineer with 5+ years experience',
};

describe('resourceRoleTypes.api (client)', () => {
  beforeEach(() => {
    axiosInstance.get.mockReset();
    axiosInstance.post.mockReset();
    axiosInstance.put.mockReset();
    axiosInstance.delete.mockReset();
  });

  it('getResourceRoleTypes gets /resource-role-types and returns the role type list', async () => {
    axiosInstance.get.mockResolvedValue({ data: { roleTypes: [roleType] } });
    const result = await resourceRoleTypesApi.getResourceRoleTypes();
    expect(axiosInstance.get).toHaveBeenCalledWith('/resource-role-types');
    expect(result).toEqual([roleType]);
  });

  it('createResourceRoleType posts /resource-role-types with the form values and returns the new role type', async () => {
    axiosInstance.post.mockResolvedValue({ data: { roleType } });
    const values = { name: 'Senior Developer', description: 'Senior software engineer with 5+ years experience' };
    const result = await resourceRoleTypesApi.createResourceRoleType(values);
    expect(axiosInstance.post).toHaveBeenCalledWith('/resource-role-types', values);
    expect(result).toEqual(roleType);
  });

  it('updateResourceRoleType puts /resource-role-types/:id with the form values and returns the updated role type', async () => {
    axiosInstance.put.mockResolvedValue({ data: { roleType } });
    const values = { name: 'Senior Developer', description: 'Updated description' };
    const result = await resourceRoleTypesApi.updateResourceRoleType(roleType.id, values);
    expect(axiosInstance.put).toHaveBeenCalledWith(`/resource-role-types/${roleType.id}`, values);
    expect(result).toEqual(roleType);
  });

  it('deleteResourceRoleType deletes /resource-role-types/:id', async () => {
    axiosInstance.delete.mockResolvedValue({ data: undefined });
    await resourceRoleTypesApi.deleteResourceRoleType(roleType.id);
    expect(axiosInstance.delete).toHaveBeenCalledWith(`/resource-role-types/${roleType.id}`);
  });
});

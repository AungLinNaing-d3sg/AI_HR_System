/**
 * @jest-environment node
 */
jest.mock('./backendClient', () => ({
  backendClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const { backendClient } = jest.requireMock('./backendClient') as {
  backendClient: { get: jest.Mock; post: jest.Mock; put: jest.Mock; delete: jest.Mock };
};

import * as resourceRoleTypesBackend from './resourceRoleTypesBackend.api';

const roleTypeDto = {
  Id: '33f724ff-c089-4691-8fe1-5d3ecc41ba1b',
  Name: 'Software Engineer',
  Description: 'Full-stack software engineer role',
};

describe('resourceRoleTypesBackend.api (server)', () => {
  beforeEach(() => {
    backendClient.get.mockReset();
    backendClient.post.mockReset();
    backendClient.put.mockReset();
    backendClient.delete.mockReset();
  });

  it('getAllResourceRoleTypes gets /ResourceRoleType/GetAllResourceRoleTypes with a Bearer header and default pagination', async () => {
    backendClient.get.mockResolvedValue({ data: { Items: [], TotalCount: 0, Page: 1, PageSize: 100 } });
    await resourceRoleTypesBackend.getAllResourceRoleTypes('access-token');
    expect(backendClient.get).toHaveBeenCalledWith('/ResourceRoleType/GetAllResourceRoleTypes', {
      headers: { Authorization: 'Bearer access-token' },
      params: { page: 1, pageSize: 100 },
    });
  });

  it('allows overriding the query params', async () => {
    backendClient.get.mockResolvedValue({ data: { Items: [], TotalCount: 0, Page: 2, PageSize: 10 } });
    await resourceRoleTypesBackend.getAllResourceRoleTypes('access-token', { page: 2, pageSize: 10 });
    expect(backendClient.get).toHaveBeenCalledWith('/ResourceRoleType/GetAllResourceRoleTypes', {
      headers: { Authorization: 'Bearer access-token' },
      params: { page: 2, pageSize: 10 },
    });
  });

  it('createResourceRoleType posts /ResourceRoleType/CreateResourceRoleType with the payload and a Bearer header', async () => {
    backendClient.post.mockResolvedValue({ data: roleTypeDto });
    const result = await resourceRoleTypesBackend.createResourceRoleType(
      { Name: 'Software Engineer', Description: 'Full-stack software engineer role' },
      'access-token'
    );
    expect(backendClient.post).toHaveBeenCalledWith(
      '/ResourceRoleType/CreateResourceRoleType',
      { Name: 'Software Engineer', Description: 'Full-stack software engineer role' },
      { headers: { Authorization: 'Bearer access-token' } }
    );
    expect(result).toEqual(roleTypeDto);
  });

  it('updateResourceRoleType puts /ResourceRoleType/UpdateResourceRoleType/:id with the payload and a Bearer header', async () => {
    backendClient.put.mockResolvedValue({ data: { ...roleTypeDto, Name: 'Senior Software Engineer' } });
    const result = await resourceRoleTypesBackend.updateResourceRoleType(
      roleTypeDto.Id,
      { Name: 'Senior Software Engineer', Description: 'Senior full-stack software engineer role' },
      'access-token'
    );
    expect(backendClient.put).toHaveBeenCalledWith(
      `/ResourceRoleType/UpdateResourceRoleType/${roleTypeDto.Id}`,
      { Name: 'Senior Software Engineer', Description: 'Senior full-stack software engineer role' },
      { headers: { Authorization: 'Bearer access-token' } }
    );
    expect(result).toEqual({ ...roleTypeDto, Name: 'Senior Software Engineer' });
  });

  it('deleteResourceRoleType deletes /ResourceRoleType/DeleteResourceRoleType/:id with a Bearer header', async () => {
    backendClient.delete.mockResolvedValue({ data: null });
    await resourceRoleTypesBackend.deleteResourceRoleType(roleTypeDto.Id, 'access-token');
    expect(backendClient.delete).toHaveBeenCalledWith(`/ResourceRoleType/DeleteResourceRoleType/${roleTypeDto.Id}`, {
      headers: { Authorization: 'Bearer access-token' },
    });
  });
});

/**
 * @jest-environment node
 */
jest.mock('./backendClient', () => ({
  backendClient: {
    get: jest.fn(),
  },
}));

const { backendClient } = jest.requireMock('./backendClient') as { backendClient: { get: jest.Mock } };

import * as resourceRoleTypesBackend from './resourceRoleTypesBackend.api';

describe('resourceRoleTypesBackend.api (server)', () => {
  beforeEach(() => {
    backendClient.get.mockReset();
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
});

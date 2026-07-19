jest.mock('./axios', () => ({
  axiosInstance: {
    get: jest.fn(),
  },
}));

const { axiosInstance } = jest.requireMock('./axios') as { axiosInstance: { get: jest.Mock } };

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
  });

  it('getResourceRoleTypes gets /resource-role-types and returns the role type list', async () => {
    axiosInstance.get.mockResolvedValue({ data: { roleTypes: [roleType] } });
    const result = await resourceRoleTypesApi.getResourceRoleTypes();
    expect(axiosInstance.get).toHaveBeenCalledWith('/resource-role-types');
    expect(result).toEqual([roleType]);
  });
});

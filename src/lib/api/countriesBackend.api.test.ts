/**
 * @jest-environment node
 */
jest.mock('./backendClient', () => ({
  backendClient: {
    get: jest.fn(),
  },
}));

const { backendClient } = jest.requireMock('./backendClient') as {
  backendClient: { get: jest.Mock };
};

import * as countriesBackend from './countriesBackend.api';

describe('countriesBackend.api (server)', () => {
  beforeEach(() => {
    backendClient.get.mockReset();
  });

  it('getAllCountries gets /Country/GetAllCountries with default query params and a Bearer header', async () => {
    backendClient.get.mockResolvedValue({ data: { Items: [], TotalCount: 0, Page: 1, PageSize: 100 } });
    await countriesBackend.getAllCountries('access-token');
    expect(backendClient.get).toHaveBeenCalledWith('/Country/GetAllCountries', {
      headers: { Authorization: 'Bearer access-token' },
      params: { page: 1, pageSize: 100 },
    });
  });

  it('lets an explicit query override the defaults', async () => {
    backendClient.get.mockResolvedValue({ data: { Items: [], TotalCount: 0, Page: 2, PageSize: 10 } });
    await countriesBackend.getAllCountries('access-token', { page: 2, pageSize: 10 });
    expect(backendClient.get).toHaveBeenCalledWith('/Country/GetAllCountries', {
      headers: { Authorization: 'Bearer access-token' },
      params: { page: 2, pageSize: 10 },
    });
  });
});

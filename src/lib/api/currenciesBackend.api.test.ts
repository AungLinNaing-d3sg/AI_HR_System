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

import * as currenciesBackend from './currenciesBackend.api';

describe('currenciesBackend.api (server)', () => {
  beforeEach(() => {
    backendClient.get.mockReset();
  });

  it('getAllCurrencies gets /Currency/GetAllCurrencies with default query params and a Bearer header', async () => {
    backendClient.get.mockResolvedValue({ data: { Items: [], TotalCount: 0, Page: 1, PageSize: 100 } });
    await currenciesBackend.getAllCurrencies('access-token');
    expect(backendClient.get).toHaveBeenCalledWith('/Currency/GetAllCurrencies', {
      headers: { Authorization: 'Bearer access-token' },
      params: { isActive: true, page: 1, pageSize: 100 },
    });
  });

  it('lets an explicit query override the defaults', async () => {
    backendClient.get.mockResolvedValue({ data: { Items: [], TotalCount: 0, Page: 2, PageSize: 10 } });
    await currenciesBackend.getAllCurrencies('access-token', { page: 2, pageSize: 10 });
    expect(backendClient.get).toHaveBeenCalledWith('/Currency/GetAllCurrencies', {
      headers: { Authorization: 'Bearer access-token' },
      params: { isActive: true, page: 2, pageSize: 10 },
    });
  });
});

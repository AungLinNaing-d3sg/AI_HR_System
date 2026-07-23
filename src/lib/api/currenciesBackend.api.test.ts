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

import * as currenciesBackend from './currenciesBackend.api';

const currencyDto = {
  Id: 'currency-1',
  Code: 'SGD',
  Name: 'Singapore Dollar',
  Symbol: 'S$',
  IsBaseCurrency: true,
  IsActive: true,
  CreatedAt: '2026-06-11T10:14:31Z',
};

describe('currenciesBackend.api (server)', () => {
  beforeEach(() => {
    backendClient.get.mockReset();
    backendClient.post.mockReset();
    backendClient.put.mockReset();
    backendClient.delete.mockReset();
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

  it('createCurrency posts /Currency/CreateCurrency with the payload and a Bearer header', async () => {
    backendClient.post.mockResolvedValue({ data: currencyDto });
    const result = await currenciesBackend.createCurrency(
      { Code: 'SGD', Name: 'Singapore Dollar', Symbol: 'S$', IsBaseCurrency: true, IsActive: true },
      'access-token'
    );
    expect(backendClient.post).toHaveBeenCalledWith(
      '/Currency/CreateCurrency',
      { Code: 'SGD', Name: 'Singapore Dollar', Symbol: 'S$', IsBaseCurrency: true, IsActive: true },
      { headers: { Authorization: 'Bearer access-token' } }
    );
    expect(result).toEqual(currencyDto);
  });

  it('updateCurrency puts /Currency/UpdateCurrency/:id with the payload and a Bearer header', async () => {
    backendClient.put.mockResolvedValue({ data: currencyDto });
    const result = await currenciesBackend.updateCurrency(
      'currency-1',
      { Name: 'Singapore Dollar', Symbol: 'SGD', IsActive: true },
      'access-token'
    );
    expect(backendClient.put).toHaveBeenCalledWith(
      '/Currency/UpdateCurrency/currency-1',
      { Name: 'Singapore Dollar', Symbol: 'SGD', IsActive: true },
      { headers: { Authorization: 'Bearer access-token' } }
    );
    expect(result).toEqual(currencyDto);
  });

  it('deleteCurrency deletes /Currency/DeleteCurrency/:id with a Bearer header', async () => {
    backendClient.delete.mockResolvedValue({ data: null });
    await currenciesBackend.deleteCurrency('currency-1', 'access-token');
    expect(backendClient.delete).toHaveBeenCalledWith('/Currency/DeleteCurrency/currency-1', {
      headers: { Authorization: 'Bearer access-token' },
    });
  });
});

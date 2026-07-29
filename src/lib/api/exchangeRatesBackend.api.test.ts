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

import * as exchangeRatesBackend from './exchangeRatesBackend.api';

const exchangeRateDto = {
  Id: 'rate-1',
  FromCurrency: { Id: 'currency-1', Code: 'SGD', Symbol: 'S$' },
  ToCurrency: { Id: 'currency-2', Code: 'USD', Symbol: '$' },
  Rate: 0.74,
  EffectiveDate: '2025-01-01',
  IsActive: true,
  CreatedAt: '2026-06-22T12:44:02Z',
};

describe('exchangeRatesBackend.api (server)', () => {
  beforeEach(() => {
    backendClient.get.mockReset();
    backendClient.post.mockReset();
    backendClient.put.mockReset();
    backendClient.delete.mockReset();
  });

  it('getAllExchangeRates gets /ExchangeRate/GetAllExchangeRates with default paging and a Bearer header', async () => {
    backendClient.get.mockResolvedValue({ data: { Items: [exchangeRateDto], TotalCount: 1, Page: 1, PageSize: 100 } });
    await exchangeRatesBackend.getAllExchangeRates('access-token');
    expect(backendClient.get).toHaveBeenCalledWith('/ExchangeRate/GetAllExchangeRates', {
      headers: { Authorization: 'Bearer access-token' },
      params: { page: 1, pageSize: 100 },
    });
  });

  it('lets an explicit query override the defaults', async () => {
    backendClient.get.mockResolvedValue({ data: { Items: [], TotalCount: 0, Page: 2, PageSize: 10 } });
    await exchangeRatesBackend.getAllExchangeRates('access-token', { page: 2, pageSize: 10, isActive: true });
    expect(backendClient.get).toHaveBeenCalledWith('/ExchangeRate/GetAllExchangeRates', {
      headers: { Authorization: 'Bearer access-token' },
      params: { page: 2, pageSize: 10, isActive: true },
    });
  });

  it('createExchangeRate posts /ExchangeRate/CreateExchangeRate with the payload and a Bearer header', async () => {
    backendClient.post.mockResolvedValue({
      data: { Id: 'rate-1', FromCurrencyId: 'currency-1', ToCurrencyId: 'currency-2', Rate: 0.74, EffectiveDate: '2025-01-01', IsActive: true },
    });
    const result = await exchangeRatesBackend.createExchangeRate(
      { FromCurrencyId: 'currency-1', ToCurrencyId: 'currency-2', Rate: 0.74, EffectiveDate: '2025-01-01', IsActive: true },
      'access-token'
    );
    expect(backendClient.post).toHaveBeenCalledWith(
      '/ExchangeRate/CreateExchangeRate',
      { FromCurrencyId: 'currency-1', ToCurrencyId: 'currency-2', Rate: 0.74, EffectiveDate: '2025-01-01', IsActive: true },
      { headers: { Authorization: 'Bearer access-token' } }
    );
    expect(result.Id).toBe('rate-1');
  });

  it('updateExchangeRate puts /ExchangeRate/UpdateExchangeRate/:id with the payload and a Bearer header', async () => {
    backendClient.put.mockResolvedValue({
      data: { Id: 'rate-1', FromCurrencyId: 'currency-1', ToCurrencyId: 'currency-2', Rate: 0.8, EffectiveDate: '2025-02-01', IsActive: true },
    });
    const result = await exchangeRatesBackend.updateExchangeRate(
      'rate-1',
      { Rate: 0.8, EffectiveDate: '2025-02-01', IsActive: true },
      'access-token'
    );
    expect(backendClient.put).toHaveBeenCalledWith(
      '/ExchangeRate/UpdateExchangeRate/rate-1',
      { Rate: 0.8, EffectiveDate: '2025-02-01', IsActive: true },
      { headers: { Authorization: 'Bearer access-token' } }
    );
    expect(result.Rate).toBe(0.8);
  });

  it('deleteExchangeRate deletes /ExchangeRate/DeleteExchangeRate/:id with a Bearer header', async () => {
    backendClient.delete.mockResolvedValue({ data: null });
    await exchangeRatesBackend.deleteExchangeRate('rate-1', 'access-token');
    expect(backendClient.delete).toHaveBeenCalledWith('/ExchangeRate/DeleteExchangeRate/rate-1', {
      headers: { Authorization: 'Bearer access-token' },
    });
  });
});

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

import * as exchangeRatesApi from './exchangeRates.api';
import type { ExchangeRate } from '@/types/domain.types';

const exchangeRate: ExchangeRate = {
  id: 'rate-1',
  fromCurrency: { id: 'currency-1', code: 'SGD', symbol: 'S$' },
  toCurrency: { id: 'currency-2', code: 'USD', symbol: '$' },
  rate: 0.74,
  effectiveDate: '2025-01-01',
  isActive: true,
};

const mutationResult = {
  id: 'rate-1',
  fromCurrencyId: 'currency-1',
  toCurrencyId: 'currency-2',
  rate: 0.74,
  effectiveDate: '2025-01-01',
  isActive: true,
};

describe('exchangeRates.api (client)', () => {
  beforeEach(() => {
    axiosInstance.get.mockReset();
    axiosInstance.post.mockReset();
    axiosInstance.put.mockReset();
    axiosInstance.delete.mockReset();
  });

  it('getExchangeRates gets /exchange-rates and returns the exchange rate list', async () => {
    axiosInstance.get.mockResolvedValue({ data: { exchangeRates: [exchangeRate] } });
    const result = await exchangeRatesApi.getExchangeRates();
    expect(axiosInstance.get).toHaveBeenCalledWith('/exchange-rates');
    expect(result).toEqual([exchangeRate]);
  });

  it('createExchangeRate posts /exchange-rates with the form values and returns the new exchange rate', async () => {
    axiosInstance.post.mockResolvedValue({ data: { exchangeRate: mutationResult } });
    const values = { toCurrencyId: 'currency-2', rate: 0.74, effectiveDate: '2025-01-01', isActive: true };
    const result = await exchangeRatesApi.createExchangeRate(values);
    expect(axiosInstance.post).toHaveBeenCalledWith('/exchange-rates', values);
    expect(result).toEqual(mutationResult);
  });

  it('updateExchangeRate puts /exchange-rates/:id with the form values and returns the updated exchange rate', async () => {
    axiosInstance.put.mockResolvedValue({ data: { exchangeRate: mutationResult } });
    const values = { rate: 0.74, effectiveDate: '2025-01-01', isActive: true };
    const result = await exchangeRatesApi.updateExchangeRate('rate-1', values);
    expect(axiosInstance.put).toHaveBeenCalledWith('/exchange-rates/rate-1', values);
    expect(result).toEqual(mutationResult);
  });

  it('deleteExchangeRate deletes /exchange-rates/:id', async () => {
    axiosInstance.delete.mockResolvedValue({ data: undefined });
    await exchangeRatesApi.deleteExchangeRate('rate-1');
    expect(axiosInstance.delete).toHaveBeenCalledWith('/exchange-rates/rate-1');
  });
});

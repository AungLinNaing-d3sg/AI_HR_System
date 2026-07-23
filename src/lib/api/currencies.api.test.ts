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

import * as currenciesApi from './currencies.api';
import type { Currency } from '@/types/domain.types';

const currency: Currency = {
  id: 'currency-1',
  code: 'SGD',
  name: 'Singapore Dollar',
  symbol: 'S$',
  isBaseCurrency: true,
  isActive: true,
};

describe('currencies.api (client)', () => {
  beforeEach(() => {
    axiosInstance.get.mockReset();
    axiosInstance.post.mockReset();
    axiosInstance.put.mockReset();
    axiosInstance.delete.mockReset();
  });

  it('getCurrencies gets /currencies and returns the currency list', async () => {
    axiosInstance.get.mockResolvedValue({ data: { currencies: [currency] } });
    const result = await currenciesApi.getCurrencies();
    expect(axiosInstance.get).toHaveBeenCalledWith('/currencies');
    expect(result).toEqual([currency]);
  });

  it('createCurrency posts /currencies with the form values and returns the new currency', async () => {
    axiosInstance.post.mockResolvedValue({ data: { currency } });
    const values = { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', isBaseCurrency: true, isActive: true };
    const result = await currenciesApi.createCurrency(values);
    expect(axiosInstance.post).toHaveBeenCalledWith('/currencies', values);
    expect(result).toEqual(currency);
  });

  it('updateCurrency puts /currencies/:id with the form values and returns the updated currency', async () => {
    axiosInstance.put.mockResolvedValue({ data: { currency } });
    const values = { name: 'Singapore Dollar', symbol: 'SGD', isActive: true };
    const result = await currenciesApi.updateCurrency('currency-1', values);
    expect(axiosInstance.put).toHaveBeenCalledWith('/currencies/currency-1', values);
    expect(result).toEqual(currency);
  });

  it('deleteCurrency deletes /currencies/:id', async () => {
    axiosInstance.delete.mockResolvedValue({ data: undefined });
    await currenciesApi.deleteCurrency('currency-1');
    expect(axiosInstance.delete).toHaveBeenCalledWith('/currencies/currency-1');
  });
});

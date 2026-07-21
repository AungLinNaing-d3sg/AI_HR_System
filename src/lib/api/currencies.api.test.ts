jest.mock('./axios', () => ({
  axiosInstance: {
    get: jest.fn(),
  },
}));

const { axiosInstance } = jest.requireMock('./axios') as {
  axiosInstance: { get: jest.Mock };
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
  });

  it('getCurrencies gets /currencies and returns the currency list', async () => {
    axiosInstance.get.mockResolvedValue({ data: { currencies: [currency] } });
    const result = await currenciesApi.getCurrencies();
    expect(axiosInstance.get).toHaveBeenCalledWith('/currencies');
    expect(result).toEqual([currency]);
  });
});

jest.mock('./axios', () => ({
  axiosInstance: {
    get: jest.fn(),
  },
}));

const { axiosInstance } = jest.requireMock('./axios') as {
  axiosInstance: { get: jest.Mock };
};

import * as countriesApi from './countries.api';
import type { Country } from '@/types/domain.types';

const country: Country = {
  id: '22222222-2222-2222-2222-222222222201',
  code: 'SG',
  name: 'Singapore',
};

describe('countries.api (client)', () => {
  beforeEach(() => {
    axiosInstance.get.mockReset();
  });

  it('getCountries gets /countries and returns the country list', async () => {
    axiosInstance.get.mockResolvedValue({ data: { countries: [country] } });
    const result = await countriesApi.getCountries();
    expect(axiosInstance.get).toHaveBeenCalledWith('/countries');
    expect(result).toEqual([country]);
  });
});

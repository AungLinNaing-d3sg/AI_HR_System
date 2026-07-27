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
    axiosInstance.post.mockReset();
    axiosInstance.put.mockReset();
    axiosInstance.delete.mockReset();
  });

  it('getCountries gets /countries and returns the country list with a total count', async () => {
    axiosInstance.get.mockResolvedValue({ data: { countries: [country], totalCount: 1 } });
    const result = await countriesApi.getCountries();
    expect(axiosInstance.get).toHaveBeenCalledWith('/countries', { params: {} });
    expect(result).toEqual({ countries: [country], totalCount: 1 });
  });

  it('getCountries forwards pageNo/pageSize params', async () => {
    axiosInstance.get.mockResolvedValue({ data: { countries: [country], totalCount: 1 } });
    await countriesApi.getCountries({ pageNo: 2, pageSize: 10 });
    expect(axiosInstance.get).toHaveBeenCalledWith('/countries', { params: { pageNo: 2, pageSize: 10 } });
  });

  it('createCountry posts /countries with the form values and returns the new country', async () => {
    axiosInstance.post.mockResolvedValue({ data: { country } });
    const values = { code: 'SG', name: 'Singapore' };
    const result = await countriesApi.createCountry(values);
    expect(axiosInstance.post).toHaveBeenCalledWith('/countries', values);
    expect(result).toEqual(country);
  });

  it('updateCountry puts /countries/:id with the form values and returns the updated country', async () => {
    axiosInstance.put.mockResolvedValue({ data: { country } });
    const values = { name: 'Singapore' };
    const result = await countriesApi.updateCountry(country.id, values);
    expect(axiosInstance.put).toHaveBeenCalledWith(`/countries/${country.id}`, values);
    expect(result).toEqual(country);
  });

  it('deleteCountry deletes /countries/:id', async () => {
    axiosInstance.delete.mockResolvedValue({ data: undefined });
    await countriesApi.deleteCountry(country.id);
    expect(axiosInstance.delete).toHaveBeenCalledWith(`/countries/${country.id}`);
  });
});

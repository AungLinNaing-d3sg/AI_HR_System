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

import * as countriesBackend from './countriesBackend.api';

const countryDto = {
  Id: 'aa532dd2-1a51-4be0-b09b-be3d99ea15f3',
  Code: 'MM',
  Name: 'Myanmar',
  CreatedAt: '2026-06-23T13:02:46Z',
};

describe('countriesBackend.api (server)', () => {
  beforeEach(() => {
    backendClient.get.mockReset();
    backendClient.post.mockReset();
    backendClient.put.mockReset();
    backendClient.delete.mockReset();
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

  it('createCountry posts /Country/CreateCountry with the payload and a Bearer header', async () => {
    backendClient.post.mockResolvedValue({ data: countryDto });
    const result = await countriesBackend.createCountry({ Code: 'MM', Name: 'Myanmar' }, 'access-token');
    expect(backendClient.post).toHaveBeenCalledWith(
      '/Country/CreateCountry',
      { Code: 'MM', Name: 'Myanmar' },
      { headers: { Authorization: 'Bearer access-token' } }
    );
    expect(result).toEqual(countryDto);
  });

  it('updateCountry puts /Country/UpdateCountry/:id with the payload and a Bearer header', async () => {
    backendClient.put.mockResolvedValue({ data: { ...countryDto, Name: 'Union of Myanmar' } });
    const result = await countriesBackend.updateCountry(
      countryDto.Id,
      { Name: 'Union of Myanmar' },
      'access-token'
    );
    expect(backendClient.put).toHaveBeenCalledWith(
      `/Country/UpdateCountry/${countryDto.Id}`,
      { Name: 'Union of Myanmar' },
      { headers: { Authorization: 'Bearer access-token' } }
    );
    expect(result).toEqual({ ...countryDto, Name: 'Union of Myanmar' });
  });

  it('deleteCountry deletes /Country/DeleteCountry/:id with a Bearer header', async () => {
    backendClient.delete.mockResolvedValue({ data: null });
    await countriesBackend.deleteCountry(countryDto.Id, 'access-token');
    expect(backendClient.delete).toHaveBeenCalledWith(`/Country/DeleteCountry/${countryDto.Id}`, {
      headers: { Authorization: 'Bearer access-token' },
    });
  });
});

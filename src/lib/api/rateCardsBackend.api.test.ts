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

import * as rateCardsBackend from './rateCardsBackend.api';

const rateCardDto = {
  Id: 'rate-card-1',
  Country: { Id: 'country-1', Code: 'SG', Name: 'Singapore' },
  ResourceRoleType: { Id: 'role-1', Name: 'Junior Developer' },
  Currency: { Id: 'currency-1', Code: 'SGD', Symbol: 'S$' },
  HourlyRate: 20,
  BillingRate: 400,
  EffectiveDate: '2025-01-01',
  IsActive: true,
};

describe('rateCardsBackend.api (server)', () => {
  beforeEach(() => {
    backendClient.get.mockReset();
    backendClient.post.mockReset();
    backendClient.put.mockReset();
    backendClient.delete.mockReset();
  });

  it('getAllRateCards gets /RateCard/GetAllRateCards with default paging and a Bearer header', async () => {
    backendClient.get.mockResolvedValue({ data: { Items: [rateCardDto], TotalCount: 1, Page: 1, PageSize: 100 } });
    await rateCardsBackend.getAllRateCards('access-token');
    expect(backendClient.get).toHaveBeenCalledWith('/RateCard/GetAllRateCards', {
      headers: { Authorization: 'Bearer access-token' },
      params: { page: 1, pageSize: 100 },
    });
  });

  it('lets an explicit query override the defaults', async () => {
    backendClient.get.mockResolvedValue({ data: { Items: [], TotalCount: 0, Page: 2, PageSize: 10 } });
    await rateCardsBackend.getAllRateCards('access-token', { page: 2, pageSize: 10, countryId: 'country-1' });
    expect(backendClient.get).toHaveBeenCalledWith('/RateCard/GetAllRateCards', {
      headers: { Authorization: 'Bearer access-token' },
      params: { page: 2, pageSize: 10, countryId: 'country-1' },
    });
  });

  it('createRateCard posts /RateCard/CreateRateCard with the payload and a Bearer header', async () => {
    backendClient.post.mockResolvedValue({
      data: {
        Id: 'rate-card-1',
        CountryId: 'country-1',
        ResourceRoleTypeId: 'role-1',
        CurrencyId: 'currency-1',
        HourlyRate: 20,
        BillingRate: 400,
        EffectiveDate: '2025-01-01',
        IsActive: true,
      },
    });
    const result = await rateCardsBackend.createRateCard(
      {
        CountryId: 'country-1',
        ResourceRoleTypeId: 'role-1',
        CurrencyId: 'currency-1',
        HourlyRate: 20,
        BillingRate: 400,
        EffectiveDate: '2025-01-01',
        IsActive: true,
      },
      'access-token'
    );
    expect(backendClient.post).toHaveBeenCalledWith(
      '/RateCard/CreateRateCard',
      {
        CountryId: 'country-1',
        ResourceRoleTypeId: 'role-1',
        CurrencyId: 'currency-1',
        HourlyRate: 20,
        BillingRate: 400,
        EffectiveDate: '2025-01-01',
        IsActive: true,
      },
      { headers: { Authorization: 'Bearer access-token' } }
    );
    expect(result.Id).toBe('rate-card-1');
  });

  it('updateRateCard puts /RateCard/UpdateRateCard/:id with the payload and a Bearer header', async () => {
    backendClient.put.mockResolvedValue({
      data: {
        Id: 'rate-card-1',
        CountryId: 'country-1',
        ResourceRoleTypeId: 'role-1',
        CurrencyId: 'currency-1',
        HourlyRate: 25,
        BillingRate: 450,
        EffectiveDate: '2025-02-01',
        IsActive: true,
      },
    });
    const result = await rateCardsBackend.updateRateCard(
      'rate-card-1',
      { HourlyRate: 25, BillingRate: 450, EffectiveDate: '2025-02-01', IsActive: true },
      'access-token'
    );
    expect(backendClient.put).toHaveBeenCalledWith(
      '/RateCard/UpdateRateCard/rate-card-1',
      { HourlyRate: 25, BillingRate: 450, EffectiveDate: '2025-02-01', IsActive: true },
      { headers: { Authorization: 'Bearer access-token' } }
    );
    expect(result.BillingRate).toBe(450);
  });

  it('deleteRateCard deletes /RateCard/DeleteRateCard/:id with a Bearer header', async () => {
    backendClient.delete.mockResolvedValue({ data: null });
    await rateCardsBackend.deleteRateCard('rate-card-1', 'access-token');
    expect(backendClient.delete).toHaveBeenCalledWith('/RateCard/DeleteRateCard/rate-card-1', {
      headers: { Authorization: 'Bearer access-token' },
    });
  });
});

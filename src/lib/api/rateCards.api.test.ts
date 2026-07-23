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

import * as rateCardsApi from './rateCards.api';
import type { RateCard } from '@/types/domain.types';

const rateCard: RateCard = {
  id: 'rate-card-1',
  country: { id: 'country-1', code: 'SG', name: 'Singapore' },
  resourceRoleType: { id: 'role-1', name: 'Junior Developer' },
  currency: { id: 'currency-1', code: 'SGD', symbol: 'S$' },
  hourlyRate: 20,
  billingRate: 400,
  effectiveDate: '2025-01-01',
  isActive: true,
};

const mutationResult = {
  id: 'rate-card-1',
  countryId: 'country-1',
  resourceRoleTypeId: 'role-1',
  currencyId: 'currency-1',
  hourlyRate: 20,
  billingRate: 400,
  effectiveDate: '2025-01-01',
  isActive: true,
};

describe('rateCards.api (client)', () => {
  beforeEach(() => {
    axiosInstance.get.mockReset();
    axiosInstance.post.mockReset();
    axiosInstance.put.mockReset();
    axiosInstance.delete.mockReset();
  });

  it('getRateCards gets /rate-cards and returns the rate card list', async () => {
    axiosInstance.get.mockResolvedValue({ data: { rateCards: [rateCard] } });
    const result = await rateCardsApi.getRateCards();
    expect(axiosInstance.get).toHaveBeenCalledWith('/rate-cards');
    expect(result).toEqual([rateCard]);
  });

  it('createRateCard posts /rate-cards with the form values and returns the new rate card', async () => {
    axiosInstance.post.mockResolvedValue({ data: { rateCard: mutationResult } });
    const values = {
      countryId: 'country-1',
      resourceRoleTypeId: 'role-1',
      currencyId: 'currency-1',
      hourlyRate: 20,
      billingRate: 400,
      effectiveDate: '2025-01-01',
      isActive: true,
    };
    const result = await rateCardsApi.createRateCard(values);
    expect(axiosInstance.post).toHaveBeenCalledWith('/rate-cards', values);
    expect(result).toEqual(mutationResult);
  });

  it('updateRateCard puts /rate-cards/:id with the form values and returns the updated rate card', async () => {
    axiosInstance.put.mockResolvedValue({ data: { rateCard: mutationResult } });
    const values = { hourlyRate: 20, billingRate: 400, effectiveDate: '2025-01-01', isActive: true };
    const result = await rateCardsApi.updateRateCard('rate-card-1', values);
    expect(axiosInstance.put).toHaveBeenCalledWith('/rate-cards/rate-card-1', values);
    expect(result).toEqual(mutationResult);
  });

  it('deleteRateCard deletes /rate-cards/:id', async () => {
    axiosInstance.delete.mockResolvedValue({ data: undefined });
    await rateCardsApi.deleteRateCard('rate-card-1');
    expect(axiosInstance.delete).toHaveBeenCalledWith('/rate-cards/rate-card-1');
  });
});

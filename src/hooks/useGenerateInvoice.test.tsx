import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useGenerateInvoice } from './useGenerateInvoice';
import type { GeneratedInvoice } from '@/types/domain.types';

jest.mock('../lib/api/invoices.api', () => ({
  generateInvoice: jest.fn(),
}));

const invoicesApi = jest.requireMock('../lib/api/invoices.api') as { generateInvoice: jest.Mock };

const generatedInvoice: GeneratedInvoice = {
  id: 'invoice-1',
  invoiceNumber: 'INV-2025-0001',
  projectId: 'project-1',
  projectName: 'Project Helix',
  clientName: 'TM',
  billingPeriodStart: '2025-03-01',
  billingPeriodEnd: '2025-03-31',
  currency: { code: 'SGD', symbol: 'S$' },
  exchangeRate: 1,
  subTotal: 1800,
  taxAmount: 0,
  totalAmount: 1800,
  status: 'Draft',
  lineItemCount: 7,
};

const values = {
  projectId: 'project-1',
  billingPeriodStart: '2025-03-01',
  billingPeriodEnd: '2025-03-31',
  currencyId: 'currency-1',
  clientName: 'TM',
  clientEmail: '',
  issuedDate: '2025-04-01',
  dueDate: '2025-04-10',
  notes: '',
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useGenerateInvoice', () => {
  beforeEach(() => {
    invoicesApi.generateInvoice.mockReset();
  });

  it('generates an invoice and returns it', async () => {
    invoicesApi.generateInvoice.mockResolvedValue(generatedInvoice);
    const { result } = renderHook(() => useGenerateInvoice(), { wrapper });

    let returned: GeneratedInvoice | undefined;
    await act(async () => {
      returned = await result.current.generateInvoice(values);
    });

    expect(invoicesApi.generateInvoice).toHaveBeenCalledWith(values);
    expect(returned).toEqual(generatedInvoice);
  });

  it('surfaces an error message on failure', async () => {
    invoicesApi.generateInvoice.mockRejectedValue(new Error('no approved entries'));
    const { result } = renderHook(() => useGenerateInvoice(), { wrapper });

    await act(async () => {
      try {
        await result.current.generateInvoice(values);
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});

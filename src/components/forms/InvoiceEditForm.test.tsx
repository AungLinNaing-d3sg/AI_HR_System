import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { InvoiceEditForm } from './InvoiceEditForm';
import type { Currency, InvoiceDetail } from '@/types/domain.types';

jest.mock('../../lib/api/currencies.api', () => ({
  getCurrencies: jest.fn(),
}));

jest.mock('../../lib/api/invoices.api', () => ({
  updateInvoice: jest.fn(),
}));

const currenciesApi = jest.requireMock('../../lib/api/currencies.api') as { getCurrencies: jest.Mock };
const invoicesApi = jest.requireMock('../../lib/api/invoices.api') as { updateInvoice: jest.Mock };

const currency: Currency = {
  id: 'currency-1',
  code: 'USD',
  name: 'US Dollar',
  symbol: '$',
  isBaseCurrency: false,
  isActive: true,
};

const invoice: InvoiceDetail = {
  id: 'invoice-1',
  invoiceNumber: 'INV-2025-0001',
  project: { id: 'project-1', code: 'PRJ-001', name: 'Project Helix' },
  clientName: 'TM',
  clientEmail: 'billing@tm.com',
  billingPeriodStart: '2025-03-01',
  billingPeriodEnd: '2025-03-31',
  currency: { id: 'currency-1', code: 'USD', symbol: '$' },
  exchangeRate: 1,
  subTotal: 1800,
  taxAmount: 0,
  totalAmount: 1800,
  status: 'Draft',
  issuedDate: '2025-04-01',
  dueDate: '2025-04-10',
  notes: 'Invoice for March services',
  lineItems: [],
  createdAt: '2026-06-22T12:22:44Z',
};

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('InvoiceEditForm', () => {
  const onCancel = jest.fn();
  const onSaved = jest.fn();

  beforeEach(() => {
    onCancel.mockReset();
    onSaved.mockReset();
    currenciesApi.getCurrencies.mockReset();
    invoicesApi.updateInvoice.mockReset();
    currenciesApi.getCurrencies.mockResolvedValue([currency]);
  });

  it('pre-fills the form with the invoice values', async () => {
    renderWithProviders(<InvoiceEditForm invoice={invoice} onCancel={onCancel} onSaved={onSaved} />);

    expect(await screen.findByLabelText(/client name/i)).toHaveValue('TM');
    expect(screen.getByLabelText(/client email/i)).toHaveValue('billing@tm.com');
    expect(screen.getByLabelText(/^issued date/i)).toHaveValue('2025-04-01');
    expect(screen.getByLabelText(/^due date/i)).toHaveValue('2025-04-10');
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoiceEditForm invoice={invoice} onCancel={onCancel} onSaved={onSaved} />);

    await screen.findByLabelText(/client name/i);
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalled();
  });

  it('submits the updated values and calls onSaved', async () => {
    const user = userEvent.setup();
    invoicesApi.updateInvoice.mockResolvedValue({
      id: 'invoice-1',
      invoiceNumber: 'INV-2025-0001',
      clientName: 'TM Updated',
      clientEmail: 'billing@tm.com',
      issuedDate: '2025-04-01',
      dueDate: '2025-04-10',
      notes: 'Invoice for March services',
      status: 'Draft',
    });
    renderWithProviders(<InvoiceEditForm invoice={invoice} onCancel={onCancel} onSaved={onSaved} />);

    const clientNameInput = await screen.findByLabelText(/client name/i);
    await user.clear(clientNameInput);
    await user.type(clientNameInput, 'TM Updated');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(invoicesApi.updateInvoice).toHaveBeenCalledWith('invoice-1', expect.objectContaining({ clientName: 'TM Updated' })));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('shows an error message when the update fails', async () => {
    const user = userEvent.setup();
    invoicesApi.updateInvoice.mockRejectedValue(new Error('only Draft invoices can be updated'));
    renderWithProviders(<InvoiceEditForm invoice={invoice} onCancel={onCancel} onSaved={onSaved} />);

    await screen.findByLabelText(/client name/i);
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });
});

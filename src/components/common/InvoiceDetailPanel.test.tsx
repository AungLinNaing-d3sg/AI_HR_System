import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { InvoiceDetailPanel } from './InvoiceDetailPanel';
import type { InvoiceDetail } from '@/types/domain.types';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock('../../lib/api/invoices.api', () => ({
  getInvoice: jest.fn(),
  updateInvoice: jest.fn(),
  sendInvoice: jest.fn(),
  markInvoicePaid: jest.fn(),
  voidInvoice: jest.fn(),
  cancelInvoice: jest.fn(),
  deleteInvoice: jest.fn(),
  downloadInvoicePdf: jest.fn(),
}));

jest.mock('../../lib/api/currencies.api', () => ({
  getCurrencies: jest.fn(),
}));

const invoicesApi = jest.requireMock('../../lib/api/invoices.api') as {
  getInvoice: jest.Mock;
  updateInvoice: jest.Mock;
  sendInvoice: jest.Mock;
  markInvoicePaid: jest.Mock;
  voidInvoice: jest.Mock;
  cancelInvoice: jest.Mock;
  deleteInvoice: jest.Mock;
  downloadInvoicePdf: jest.Mock;
};
const currenciesApi = jest.requireMock('../../lib/api/currencies.api') as { getCurrencies: jest.Mock };

const draftInvoice: InvoiceDetail = {
  id: 'invoice-1',
  invoiceNumber: 'INV-2025-0001',
  project: { id: 'project-1', code: 'PRJ-001', name: 'Project Helix' },
  clientName: 'Acme Corp',
  clientEmail: 'billing@acme.com',
  billingPeriodStart: '2025-02-01',
  billingPeriodEnd: '2025-02-28',
  currency: { id: 'currency-1', code: 'SGD', symbol: 'S$' },
  exchangeRate: 1,
  subTotal: 8000,
  taxAmount: 400,
  totalAmount: 8400,
  status: 'Draft',
  issuedDate: '2025-02-28',
  dueDate: '2025-03-10',
  notes: 'Thanks for your business.',
  lineItems: [
    {
      id: 'line-1',
      user: { id: 'user-1', fullName: 'Alex Kumar', employeeId: 'EMP001' },
      resourceRoleType: { id: 'role-1', name: 'Senior Developer' },
      timesheetEntryId: 'entry-1',
      description: 'Frontend component development',
      hours: 6,
      unitRate: 700,
      amount: 4200,
    },
  ],
  createdAt: '2026-06-22T12:22:44Z',
};

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('InvoiceDetailPanel', () => {
  beforeEach(() => {
    pushMock.mockReset();
    invoicesApi.getInvoice.mockReset();
    invoicesApi.updateInvoice.mockReset();
    invoicesApi.sendInvoice.mockReset();
    invoicesApi.markInvoicePaid.mockReset();
    invoicesApi.voidInvoice.mockReset();
    invoicesApi.cancelInvoice.mockReset();
    invoicesApi.deleteInvoice.mockReset();
    invoicesApi.downloadInvoicePdf.mockReset();
    currenciesApi.getCurrencies.mockReset();
    currenciesApi.getCurrencies.mockResolvedValue({ currencies: [], totalCount: 0 });
    window.print = jest.fn();
  });

  it('shows a loading state initially', () => {
    invoicesApi.getInvoice.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<InvoiceDetailPanel id="invoice-1" />);
    expect(screen.getByText(/loading invoice/i)).toBeInTheDocument();
  });

  it('shows an error state when the invoice cannot be found', async () => {
    invoicesApi.getInvoice.mockRejectedValue(new Error('not found'));
    renderWithProviders(<InvoiceDetailPanel id="missing-id" />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('renders the invoice document with bill-to, line items, and totals', async () => {
    invoicesApi.getInvoice.mockResolvedValue(draftInvoice);
    renderWithProviders(<InvoiceDetailPanel id="invoice-1" />);

    expect(await screen.findByText('INV-2025-0001')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Alex Kumar')).toBeInTheDocument();
    expect(screen.getByText('Senior Developer')).toBeInTheDocument();
    expect(screen.getByText('S$8,400.00')).toBeInTheDocument();
    expect(screen.getByText('Thanks for your business.')).toBeInTheDocument();
  });

  it('shows Edit/Send/Void/Cancel/Delete actions for a Draft invoice', async () => {
    invoicesApi.getInvoice.mockResolvedValue(draftInvoice);
    renderWithProviders(<InvoiceDetailPanel id="invoice-1" />);

    await screen.findByText('INV-2025-0001');
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send invoice/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^void$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
  });

  it('shows only Mark as Paid for a Sent invoice (no Edit/Delete)', async () => {
    invoicesApi.getInvoice.mockResolvedValue({ ...draftInvoice, status: 'Sent' });
    renderWithProviders(<InvoiceDetailPanel id="invoice-1" />);

    await screen.findByText('INV-2025-0001');
    expect(screen.getByRole('button', { name: /mark as paid/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();
  });

  it('shows no status actions for a Paid invoice', async () => {
    invoicesApi.getInvoice.mockResolvedValue({ ...draftInvoice, status: 'Paid' });
    renderWithProviders(<InvoiceDetailPanel id="invoice-1" />);

    await screen.findByText('INV-2025-0001');
    expect(screen.queryByRole('button', { name: /mark as paid/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^void$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^cancel$/i })).not.toBeInTheDocument();
  });

  it('switches to the edit form and back via Cancel', async () => {
    const user = userEvent.setup();
    invoicesApi.getInvoice.mockResolvedValue(draftInvoice);
    renderWithProviders(<InvoiceDetailPanel id="invoice-1" />);

    await screen.findByText('INV-2025-0001');
    await user.click(screen.getByRole('button', { name: /^edit$/i }));

    expect(await screen.findByRole('heading', { name: /edit invoice/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(await screen.findByText('INV-2025-0001')).toBeInTheDocument();
  });

  it('confirms and sends a Draft invoice', async () => {
    const user = userEvent.setup();
    invoicesApi.getInvoice.mockResolvedValue(draftInvoice);
    invoicesApi.sendInvoice.mockResolvedValue({ id: 'invoice-1', status: 'Sent' });
    renderWithProviders(<InvoiceDetailPanel id="invoice-1" />);

    await screen.findByText('INV-2025-0001');
    await user.click(screen.getByRole('button', { name: /send invoice/i }));

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(invoicesApi.sendInvoice).toHaveBeenCalledWith('invoice-1'));
  });

  it('confirms and deletes a Draft invoice, then redirects to /invoices', async () => {
    const user = userEvent.setup();
    invoicesApi.getInvoice.mockResolvedValue(draftInvoice);
    invoicesApi.deleteInvoice.mockResolvedValue(undefined);
    renderWithProviders(<InvoiceDetailPanel id="invoice-1" />);

    await screen.findByText('INV-2025-0001');
    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(invoicesApi.deleteInvoice).toHaveBeenCalledWith('invoice-1'));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/invoices'));
  });

  it('downloads the PDF when Download PDF is clicked', async () => {
    const user = userEvent.setup();
    invoicesApi.getInvoice.mockResolvedValue(draftInvoice);
    invoicesApi.downloadInvoicePdf.mockResolvedValue(undefined);
    renderWithProviders(<InvoiceDetailPanel id="invoice-1" />);

    await screen.findByText('INV-2025-0001');
    await user.click(screen.getByRole('button', { name: /download pdf/i }));

    await waitFor(() =>
      expect(invoicesApi.downloadInvoicePdf).toHaveBeenCalledWith('invoice-1', 'INV-2025-0001')
    );
  });

  it('calls window.print when Print is clicked', async () => {
    const user = userEvent.setup();
    invoicesApi.getInvoice.mockResolvedValue(draftInvoice);
    renderWithProviders(<InvoiceDetailPanel id="invoice-1" />);

    await screen.findByText('INV-2025-0001');
    await user.click(screen.getByRole('button', { name: /^print$/i }));

    expect(window.print).toHaveBeenCalled();
  });
});

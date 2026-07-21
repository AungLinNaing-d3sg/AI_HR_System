import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { InvoicesTable } from './InvoicesTable';
import type { InvoiceSummary, Project } from '@/types/domain.types';

jest.mock('../../lib/api/invoices.api', () => ({
  getInvoices: jest.fn(),
}));

jest.mock('../../lib/api/projects.api', () => ({
  getProjects: jest.fn(),
}));

const invoicesApi = jest.requireMock('../../lib/api/invoices.api') as { getInvoices: jest.Mock };
const projectsApi = jest.requireMock('../../lib/api/projects.api') as { getProjects: jest.Mock };

const project: Project = {
  id: 'project-1',
  code: 'PRJ-001',
  name: 'Project Helix',
  description: null,
  clientName: 'Acme Corp',
  clientEmail: null,
  startDate: null,
  endDate: null,
  maxDailyHours: null,
  isActive: true,
};

const draftInvoice: InvoiceSummary = {
  id: 'invoice-1',
  invoiceNumber: 'INV-2025-0001',
  project: { id: 'project-1', code: 'PRJ-001', name: 'Project Helix' },
  clientName: 'Acme Corp',
  billingPeriodStart: '2025-02-01',
  billingPeriodEnd: '2025-02-28',
  currency: { code: 'SGD', symbol: 'S$' },
  totalAmount: 8400,
  status: 'Draft',
  issuedDate: '2025-02-28',
  dueDate: '2025-03-10',
};

const sentInvoice: InvoiceSummary = {
  ...draftInvoice,
  id: 'invoice-2',
  invoiceNumber: 'INV-2025-0002',
  status: 'Sent',
};

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('InvoicesTable', () => {
  beforeEach(() => {
    invoicesApi.getInvoices.mockReset();
    projectsApi.getProjects.mockReset();
    projectsApi.getProjects.mockResolvedValue([project]);
  });

  it('shows a loading state initially', () => {
    invoicesApi.getInvoices.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<InvoicesTable />);
    expect(screen.getByText(/loading invoices/i)).toBeInTheDocument();
  });

  it('shows an error state with a retry action when the list fails to load', async () => {
    invoicesApi.getInvoices.mockRejectedValue(new Error('network down'));
    renderWithProviders(<InvoicesTable />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows an empty state with a generate link when there are no invoices', async () => {
    invoicesApi.getInvoices.mockResolvedValue({ invoices: [], totalCount: 0 });
    renderWithProviders(<InvoicesTable />);

    expect(await screen.findByText(/no invoices yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /generate your first invoice/i })).toHaveAttribute(
      'href',
      '/invoices/generate'
    );
  });

  it('renders a row per invoice with invoice number, client, amount, and status', async () => {
    invoicesApi.getInvoices.mockResolvedValue({ invoices: [draftInvoice, sentInvoice], totalCount: 2 });
    renderWithProviders(<InvoicesTable />);

    expect(await screen.findByText('INV-2025-0001')).toBeInTheDocument();
    expect(screen.getByText('INV-2025-0002')).toBeInTheDocument();
    expect(screen.getAllByText('Acme Corp')).toHaveLength(2);
    const table = screen.getByRole('table');
    expect(within(table).getByText('Draft')).toBeInTheDocument();
    expect(within(table).getByText('Sent')).toBeInTheDocument();
  });

  it('links each row View action to /invoices/:id', async () => {
    invoicesApi.getInvoices.mockResolvedValue({ invoices: [draftInvoice], totalCount: 1 });
    renderWithProviders(<InvoicesTable />);

    await screen.findByText('INV-2025-0001');
    expect(screen.getByRole('link', { name: /view/i })).toHaveAttribute('href', '/invoices/invoice-1');
  });

  it('filters rows by status when a status tab is selected', async () => {
    const user = userEvent.setup();
    invoicesApi.getInvoices.mockResolvedValue({ invoices: [draftInvoice, sentInvoice], totalCount: 2 });
    renderWithProviders(<InvoicesTable />);

    await screen.findByText('INV-2025-0001');
    await user.click(screen.getByRole('tab', { name: /^draft/i }));

    expect(screen.getByText('INV-2025-0001')).toBeInTheDocument();
    expect(screen.queryByText('INV-2025-0002')).not.toBeInTheDocument();
  });

  it('refetches with the selected project filter', async () => {
    const user = userEvent.setup();
    invoicesApi.getInvoices.mockResolvedValue({ invoices: [draftInvoice], totalCount: 1 });
    renderWithProviders(<InvoicesTable />);

    await screen.findByText('INV-2025-0001');
    await user.selectOptions(screen.getByLabelText(/project/i), 'project-1');

    await waitFor(() =>
      expect(invoicesApi.getInvoices).toHaveBeenLastCalledWith({ projectId: 'project-1' })
    );
  });
});

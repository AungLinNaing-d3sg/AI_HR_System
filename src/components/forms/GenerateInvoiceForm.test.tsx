import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { GenerateInvoiceForm } from './GenerateInvoiceForm';
import type { Currency, GeneratedInvoice, Project } from '@/types/domain.types';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock('../../lib/api/projects.api', () => ({
  getProjects: jest.fn(),
}));

jest.mock('../../lib/api/currencies.api', () => ({
  getCurrencies: jest.fn(),
}));

jest.mock('../../lib/api/invoices.api', () => ({
  generateInvoice: jest.fn(),
}));

const projectsApi = jest.requireMock('../../lib/api/projects.api') as { getProjects: jest.Mock };
const currenciesApi = jest.requireMock('../../lib/api/currencies.api') as { getCurrencies: jest.Mock };
const invoicesApi = jest.requireMock('../../lib/api/invoices.api') as { generateInvoice: jest.Mock };

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

const currency: Currency = {
  id: 'currency-1',
  code: 'SGD',
  name: 'Singapore Dollar',
  symbol: 'S$',
  isBaseCurrency: true,
  isActive: true,
};

const generatedInvoice: GeneratedInvoice = {
  id: 'invoice-1',
  invoiceNumber: 'INV-2025-0001',
  projectId: 'project-1',
  projectName: 'Project Helix',
  clientName: 'Acme Corp',
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

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText(/project/i), 'project-1');
  await user.type(screen.getByLabelText(/billing period from/i), '2025-03-01');
  await user.type(screen.getByLabelText(/billing period to/i), '2025-03-31');
  await user.selectOptions(screen.getByLabelText(/invoice currency/i), 'currency-1');
  await user.type(screen.getByLabelText(/client name/i), 'Acme Corp');
  await user.type(screen.getByLabelText(/^issued date/i), '2025-04-01');
  await user.type(screen.getByLabelText(/^due date/i), '2025-04-10');
}

describe('GenerateInvoiceForm', () => {
  beforeEach(() => {
    pushMock.mockReset();
    projectsApi.getProjects.mockReset();
    currenciesApi.getCurrencies.mockReset();
    invoicesApi.generateInvoice.mockReset();
    projectsApi.getProjects.mockResolvedValue([project]);
    currenciesApi.getCurrencies.mockResolvedValue([currency]);
  });

  it('renders the parameters form with a disabled, informational tax rate field', async () => {
    renderWithProviders(<GenerateInvoiceForm />);
    await screen.findByText('Project Helix');
    expect(screen.getByLabelText(/tax rate/i)).toBeDisabled();
  });

  it('shows validation errors when required fields are missing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GenerateInvoiceForm />);
    await screen.findByText('Project Helix');

    await user.click(screen.getByRole('button', { name: /preview & review/i }));

    expect(await screen.findByText('Select a project.')).toBeInTheDocument();
  });

  it('moves to the review step and generates the invoice on confirmation', async () => {
    const user = userEvent.setup();
    invoicesApi.generateInvoice.mockResolvedValue(generatedInvoice);
    renderWithProviders(<GenerateInvoiceForm />);

    await screen.findByText('Project Helix');
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: /preview & review/i }));

    expect(await screen.findByText(/review invoice details/i)).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /generate invoice/i }));

    await waitFor(() => expect(invoicesApi.generateInvoice).toHaveBeenCalled());
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/invoices/invoice-1'));
  });

  it('lets the user go back from the review step without submitting', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GenerateInvoiceForm />);

    await screen.findByText('Project Helix');
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: /preview & review/i }));

    await screen.findByText(/review invoice details/i);
    await user.click(screen.getByRole('button', { name: /back/i }));

    expect(screen.getByRole('button', { name: /preview & review/i })).toBeInTheDocument();
    expect(invoicesApi.generateInvoice).not.toHaveBeenCalled();
  });
});

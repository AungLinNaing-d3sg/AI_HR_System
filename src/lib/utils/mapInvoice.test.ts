import { mapGeneratedInvoice, mapInvoiceDetail, mapInvoiceLineItem, mapInvoiceSummary, mapInvoiceSummaryList } from './mapInvoice';
import type {
  GenerateInvoiceResponseDto,
  InvoiceDetailDto,
  InvoiceLineItemDto,
  InvoiceListItemDto,
} from '@/types/api.types';

const listItemDto: InvoiceListItemDto = {
  Id: 'invoice-1',
  InvoiceNumber: 'INV-2025-0001',
  Project: { Id: 'project-1', Code: 'PRJ-001', Name: 'Project Helix' },
  ClientName: 'TM',
  BillingPeriodStart: '2025-03-01',
  BillingPeriodEnd: '2025-03-31',
  Currency: { Code: 'SGD', Symbol: 'S$' },
  TotalAmount: 1800,
  Status: 'Draft',
  IssuedDate: '2025-04-01',
  DueDate: '2025-04-10',
};

describe('mapInvoiceSummary', () => {
  it('maps every PascalCase field to its camelCase domain equivalent', () => {
    expect(mapInvoiceSummary(listItemDto)).toEqual({
      id: 'invoice-1',
      invoiceNumber: 'INV-2025-0001',
      project: { id: 'project-1', code: 'PRJ-001', name: 'Project Helix' },
      clientName: 'TM',
      billingPeriodStart: '2025-03-01',
      billingPeriodEnd: '2025-03-31',
      currency: { code: 'SGD', symbol: 'S$' },
      totalAmount: 1800,
      status: 'Draft',
      issuedDate: '2025-04-01',
      dueDate: '2025-04-10',
    });
  });
});

describe('mapInvoiceSummaryList', () => {
  it('maps an array of DTOs', () => {
    const result = mapInvoiceSummaryList([listItemDto, { ...listItemDto, Id: 'invoice-2' }]);
    expect(result).toHaveLength(2);
    expect(result[1].id).toBe('invoice-2');
  });

  it('returns an empty array for an empty list', () => {
    expect(mapInvoiceSummaryList([])).toEqual([]);
  });
});

const lineItemDto: InvoiceLineItemDto = {
  Id: 'line-1',
  User: { Id: 'user-1', FullName: 'Lin Thit Htoo', EmployeeId: 'EMP003' },
  ResourceRoleType: { Id: 'role-1', Name: 'Senior Developer' },
  TimesheetEntryId: 'entry-1',
  Description: 'Worked on feature implementation',
  Hours: 2,
  UnitRate: 75,
  Amount: 150,
};

describe('mapInvoiceLineItem', () => {
  it('maps every PascalCase field to its camelCase domain equivalent', () => {
    expect(mapInvoiceLineItem(lineItemDto)).toEqual({
      id: 'line-1',
      user: { id: 'user-1', fullName: 'Lin Thit Htoo', employeeId: 'EMP003' },
      resourceRoleType: { id: 'role-1', name: 'Senior Developer' },
      timesheetEntryId: 'entry-1',
      description: 'Worked on feature implementation',
      hours: 2,
      unitRate: 75,
      amount: 150,
    });
  });
});

const detailDto: InvoiceDetailDto = {
  Id: 'invoice-1',
  InvoiceNumber: 'INV-2025-0001',
  Project: { Id: 'project-1', Code: 'PRJ-001', Name: 'Project Helix' },
  ClientName: 'TM',
  ClientEmail: 'billing@tm.com',
  BillingPeriodStart: '2025-03-01',
  BillingPeriodEnd: '2025-03-31',
  Currency: { Id: 'currency-1', Code: 'USD', Symbol: '$' },
  ExchangeRate: 1,
  SubTotal: 1800,
  TaxAmount: 0,
  TotalAmount: 1800,
  Status: 'Draft',
  IssuedDate: '2025-04-01',
  DueDate: '2025-04-10',
  Notes: 'Invoice for March services',
  LineItems: [lineItemDto],
  CreatedAt: '2026-06-22T12:22:44Z',
};

describe('mapInvoiceDetail', () => {
  it('maps every PascalCase field to its camelCase domain equivalent, including nested line items', () => {
    const result = mapInvoiceDetail(detailDto);
    expect(result).toEqual({
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
      lineItems: [mapInvoiceLineItem(lineItemDto)],
      createdAt: '2026-06-22T12:22:44Z',
    });
  });

  it('passes through a null clientEmail/notes unchanged', () => {
    const result = mapInvoiceDetail({ ...detailDto, ClientEmail: null, Notes: null });
    expect(result.clientEmail).toBeNull();
    expect(result.notes).toBeNull();
  });

  it('maps an empty LineItems array to an empty array', () => {
    const result = mapInvoiceDetail({ ...detailDto, LineItems: [] });
    expect(result.lineItems).toEqual([]);
  });
});

const generatedDto: GenerateInvoiceResponseDto = {
  Id: 'invoice-1',
  InvoiceNumber: 'INV-2025-0001',
  ProjectId: 'project-1',
  ProjectName: 'Project Helix',
  ClientName: 'TM',
  BillingPeriodStart: '2025-03-01',
  BillingPeriodEnd: '2025-03-31',
  Currency: { Code: 'SGD', Symbol: 'S$' },
  ExchangeRate: 1,
  SubTotal: 1800,
  TaxAmount: 0,
  TotalAmount: 1800,
  Status: 'Draft',
  LineItemCount: 7,
};

describe('mapGeneratedInvoice', () => {
  it('maps every PascalCase field to its camelCase domain equivalent', () => {
    expect(mapGeneratedInvoice(generatedDto)).toEqual({
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
    });
  });
});

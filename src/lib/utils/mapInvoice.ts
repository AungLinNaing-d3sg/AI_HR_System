import 'server-only';

import type {
  GenerateInvoiceResponseDto,
  InvoiceDetailDto,
  InvoiceLineItemDto,
  InvoiceListItemDto,
} from '@/types/api.types';
import type { GeneratedInvoice, InvoiceDetail, InvoiceLineItem, InvoiceSummary } from '@/types/domain.types';

/** Maps the backend's PascalCase Invoice DTOs to the app's camelCase domain models. */

export function mapInvoiceSummary(dto: InvoiceListItemDto): InvoiceSummary {
  return {
    id: dto.Id,
    invoiceNumber: dto.InvoiceNumber,
    project: { id: dto.Project.Id, code: dto.Project.Code, name: dto.Project.Name },
    clientName: dto.ClientName,
    billingPeriodStart: dto.BillingPeriodStart,
    billingPeriodEnd: dto.BillingPeriodEnd,
    currency: { code: dto.Currency.Code, symbol: dto.Currency.Symbol },
    totalAmount: dto.TotalAmount,
    status: dto.Status,
    issuedDate: dto.IssuedDate,
    dueDate: dto.DueDate,
  };
}

export function mapInvoiceSummaryList(dtos: InvoiceListItemDto[]): InvoiceSummary[] {
  return dtos.map(mapInvoiceSummary);
}

export function mapInvoiceLineItem(dto: InvoiceLineItemDto): InvoiceLineItem {
  return {
    id: dto.Id,
    user: { id: dto.User.Id, fullName: dto.User.FullName, employeeId: dto.User.EmployeeId },
    resourceRoleType: { id: dto.ResourceRoleType.Id, name: dto.ResourceRoleType.Name },
    timesheetEntryId: dto.TimesheetEntryId,
    description: dto.Description,
    hours: dto.Hours,
    unitRate: dto.UnitRate,
    amount: dto.Amount,
  };
}

export function mapInvoiceDetail(dto: InvoiceDetailDto): InvoiceDetail {
  return {
    id: dto.Id,
    invoiceNumber: dto.InvoiceNumber,
    project: { id: dto.Project.Id, code: dto.Project.Code, name: dto.Project.Name },
    clientName: dto.ClientName,
    clientEmail: dto.ClientEmail,
    billingPeriodStart: dto.BillingPeriodStart,
    billingPeriodEnd: dto.BillingPeriodEnd,
    currency: { id: dto.Currency.Id, code: dto.Currency.Code, symbol: dto.Currency.Symbol },
    exchangeRate: dto.ExchangeRate,
    subTotal: dto.SubTotal,
    taxAmount: dto.TaxAmount,
    totalAmount: dto.TotalAmount,
    status: dto.Status,
    issuedDate: dto.IssuedDate,
    dueDate: dto.DueDate,
    notes: dto.Notes,
    lineItems: dto.LineItems.map(mapInvoiceLineItem),
    createdAt: dto.CreatedAt,
  };
}

export function mapGeneratedInvoice(dto: GenerateInvoiceResponseDto): GeneratedInvoice {
  return {
    id: dto.Id,
    invoiceNumber: dto.InvoiceNumber,
    projectId: dto.ProjectId,
    projectName: dto.ProjectName,
    clientName: dto.ClientName,
    billingPeriodStart: dto.BillingPeriodStart,
    billingPeriodEnd: dto.BillingPeriodEnd,
    currency: { code: dto.Currency.Code, symbol: dto.Currency.Symbol },
    exchangeRate: dto.ExchangeRate,
    subTotal: dto.SubTotal,
    taxAmount: dto.TaxAmount,
    totalAmount: dto.TotalAmount,
    status: dto.Status,
    lineItemCount: dto.LineItemCount,
  };
}

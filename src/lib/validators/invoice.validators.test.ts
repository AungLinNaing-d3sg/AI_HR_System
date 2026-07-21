import { generateInvoiceSchema, invoiceListQuerySchema, updateInvoiceSchema } from './invoice.validators';

const validGeneratePayload = {
  projectId: 'project-1',
  billingPeriodStart: '2025-03-01',
  billingPeriodEnd: '2025-03-31',
  currencyId: 'currency-1',
  clientName: 'Acme Corp',
  clientEmail: 'billing@acme.com',
  issuedDate: '2025-04-01',
  dueDate: '2025-04-10',
  notes: 'Invoice for March services',
};

describe('generateInvoiceSchema', () => {
  it('accepts a fully-populated valid payload', () => {
    expect(generateInvoiceSchema.safeParse(validGeneratePayload).success).toBe(true);
  });

  it('accepts a payload with optional fields omitted', () => {
    const { clientEmail, notes, ...required } = validGeneratePayload;
    void clientEmail;
    void notes;
    expect(generateInvoiceSchema.safeParse(required).success).toBe(true);
  });

  it('rejects a missing project', () => {
    const result = generateInvoiceSchema.safeParse({ ...validGeneratePayload, projectId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing currency', () => {
    const result = generateInvoiceSchema.safeParse({ ...validGeneratePayload, currencyId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing client name', () => {
    const result = generateInvoiceSchema.safeParse({ ...validGeneratePayload, clientName: '  ' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid client email', () => {
    const result = generateInvoiceSchema.safeParse({ ...validGeneratePayload, clientEmail: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid date format', () => {
    const result = generateInvoiceSchema.safeParse({ ...validGeneratePayload, issuedDate: '04/01/2025' });
    expect(result.success).toBe(false);
  });

  it('rejects a billing period end before the start', () => {
    const result = generateInvoiceSchema.safeParse({
      ...validGeneratePayload,
      billingPeriodStart: '2025-03-31',
      billingPeriodEnd: '2025-03-01',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.billingPeriodEnd).toBeTruthy();
    }
  });

  it('rejects a due date before the issued date', () => {
    const result = generateInvoiceSchema.safeParse({
      ...validGeneratePayload,
      issuedDate: '2025-04-10',
      dueDate: '2025-04-01',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.dueDate).toBeTruthy();
    }
  });
});

const validUpdatePayload = {
  currencyId: 'currency-1',
  clientName: 'Acme Corp',
  clientEmail: 'billing@acme.com',
  issuedDate: '2025-04-01',
  dueDate: '2025-04-10',
  notes: 'Invoice for March services',
};

describe('updateInvoiceSchema', () => {
  it('accepts a fully-populated valid payload', () => {
    expect(updateInvoiceSchema.safeParse(validUpdatePayload).success).toBe(true);
  });

  it('rejects a missing client name', () => {
    const result = updateInvoiceSchema.safeParse({ ...validUpdatePayload, clientName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a due date before the issued date', () => {
    const result = updateInvoiceSchema.safeParse({
      ...validUpdatePayload,
      issuedDate: '2025-04-10',
      dueDate: '2025-04-01',
    });
    expect(result.success).toBe(false);
  });

  it('accepts an empty optional client email/notes', () => {
    const result = updateInvoiceSchema.safeParse({ ...validUpdatePayload, clientEmail: '', notes: '' });
    expect(result.success).toBe(true);
  });
});

describe('invoiceListQuerySchema', () => {
  it('accepts an empty query (both filters optional)', () => {
    expect(invoiceListQuerySchema.safeParse({}).success).toBe(true);
  });

  it('accepts a valid status filter', () => {
    expect(invoiceListQuerySchema.safeParse({ status: 'Draft' }).success).toBe(true);
  });

  it('rejects an invalid status value', () => {
    const result = invoiceListQuerySchema.safeParse({ status: 'Finalized' });
    expect(result.success).toBe(false);
  });
});

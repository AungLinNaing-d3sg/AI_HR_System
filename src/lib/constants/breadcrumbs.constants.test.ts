import { getBreadcrumbs } from './breadcrumbs.constants';

describe('getBreadcrumbs', () => {
  it('returns the Reports hub trail', () => {
    expect(getBreadcrumbs('/reports')).toEqual([{ label: 'Dashboard', href: '/dashboard' }, { label: 'Reports' }]);
  });

  it('returns the Timesheet Report trail, nested under Reports', () => {
    expect(getBreadcrumbs('/reports/timesheet')).toEqual([
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Reports', href: '/reports' },
      { label: 'Timesheet Report' },
    ]);
  });

  it('returns the Roles Summary trail, nested under Reports', () => {
    expect(getBreadcrumbs('/reports/roles-summary')).toEqual([
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Reports', href: '/reports' },
      { label: 'Roles Summary' },
    ]);
  });

  it('returns the Cost & Revenue trail, nested under Reports', () => {
    expect(getBreadcrumbs('/reports/cost-revenue')).toEqual([
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Reports', href: '/reports' },
      { label: 'Cost & Revenue' },
    ]);
  });

  it('returns the Invoices list trail', () => {
    expect(getBreadcrumbs('/invoices')).toEqual([{ label: 'Dashboard', href: '/dashboard' }, { label: 'Invoices' }]);
  });

  it('returns the Generate Invoice trail, nested under Invoices', () => {
    expect(getBreadcrumbs('/invoices/generate')).toEqual([
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Invoices', href: '/invoices' },
      { label: 'Generate Invoice' },
    ]);
  });

  it('returns the invoice detail trail, nested under Invoices', () => {
    expect(getBreadcrumbs('/invoices/abc-123')).toEqual([
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Invoices', href: '/invoices' },
      { label: 'Edit' },
    ]);
  });

  it('returns the Currencies management trail', () => {
    expect(getBreadcrumbs('/admin/currencies')).toEqual([
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Currencies' },
    ]);
  });

  it('falls back to just Dashboard for an unknown path', () => {
    expect(getBreadcrumbs('/unknown')).toEqual([{ label: 'Dashboard', href: '/dashboard' }]);
  });
});

import { render, screen } from '@testing-library/react';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';

describe('InvoiceStatusBadge', () => {
  it.each([
    ['Draft', 'Draft'],
    ['Sent', 'Sent'],
    ['Paid', 'Paid'],
    ['Void', 'Void'],
    ['Cancelled', 'Cancelled'],
  ] as const)('renders the %s status label', (status, label) => {
    render(<InvoiceStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

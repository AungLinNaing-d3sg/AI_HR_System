import { render, screen } from '@testing-library/react';
import { FileText } from 'lucide-react';
import { ReportCard } from './ReportCard';

describe('ReportCard', () => {
  it('renders the title, description, tags, and links to the given href', () => {
    render(
      <ReportCard
        href="/reports/timesheet"
        icon={FileText}
        iconClassName="bg-blue-100 text-blue-700"
        title="Timesheet Report"
        description="View detailed timesheet entries by project, user, and date range."
        tags={['Hours', 'Projects', 'Users']}
      />
    );

    const link = screen.getByRole('link', { name: /timesheet report/i });
    expect(link).toHaveAttribute('href', '/reports/timesheet');
    expect(screen.getByText(/view detailed timesheet entries/i)).toBeInTheDocument();
    expect(screen.getByText('Hours')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText(/view report/i)).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { UserRoleBadge } from './UserRoleBadge';

describe('UserRoleBadge', () => {
  it.each([
    ['SystemAdmin', 'System Admin'],
    ['ProjectAdmin', 'Project Admin'],
    ['Employee', 'Assigned User'],
  ] as const)('renders the %s role as "%s"', (roleName, label) => {
    render(<UserRoleBadge roleName={roleName} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('renders a neutral "Role unavailable" state when the role is not known', () => {
    render(<UserRoleBadge roleName={null} />);
    expect(screen.getByText('Role unavailable')).toBeInTheDocument();
  });

  it('renders "Role unavailable" for an unrecognized role string instead of guessing', () => {
    render(<UserRoleBadge roleName="SomethingUnexpected" />);
    expect(screen.getByText('Role unavailable')).toBeInTheDocument();
  });
});

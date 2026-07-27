import { render, screen } from '@testing-library/react';
import { DashboardGreeting } from './DashboardGreeting';

const mockUseAuth = jest.fn();
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('DashboardGreeting', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders a time-of-day greeting without a name before the auth store hydrates', () => {
    mockUseAuth.mockReturnValue({ user: { firstName: 'Sarah' }, hasHydrated: false });
    render(<DashboardGreeting />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Good (morning|afternoon|evening)$/);
  });

  it('greets the signed-in user by first name with a wave once hydrated', () => {
    mockUseAuth.mockReturnValue({ user: { firstName: 'Sarah' }, hasHydrated: true });
    render(<DashboardGreeting />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Sarah');
    expect(heading).toHaveTextContent('👋');
  });

  it('omits the name and wave when there is no signed-in user', () => {
    mockUseAuth.mockReturnValue({ user: null, hasHydrated: true });
    render(<DashboardGreeting />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).not.toHaveTextContent('👋');
  });

  it('shows "Good morning" before noon', () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
    mockUseAuth.mockReturnValue({ user: null, hasHydrated: false });
    render(<DashboardGreeting />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Good morning');
  });

  it('shows "Good afternoon" between noon and 6pm', () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
    mockUseAuth.mockReturnValue({ user: null, hasHydrated: false });
    render(<DashboardGreeting />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Good afternoon');
  });

  it('shows "Good evening" after 6pm', () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(20);
    mockUseAuth.mockReturnValue({ user: null, hasHydrated: false });
    render(<DashboardGreeting />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Good evening');
  });
});

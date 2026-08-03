import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { UserSearchCombobox } from './UserSearchCombobox';
import type { UserListItem } from '@/types/domain.types';

jest.mock('../../lib/api/auth.api', () => ({
  searchUsers: jest.fn(),
}));

const authApi = jest.requireMock('../../lib/api/auth.api') as {
  searchUsers: jest.Mock;
};

const users: UserListItem[] = [
  { userId: 'user-2', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
  { userId: 'user-3', firstName: 'John', lastName: 'Smith', email: 'john@example.com' },
];

function renderCombobox(initialValue = '') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onChange = jest.fn();

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  function Harness() {
    const [value, setValue] = useState(initialValue);
    return (
      <UserSearchCombobox
        id="userId"
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
      />
    );
  }

  render(<Harness />, { wrapper: Wrapper });
  return { onChange };
}

describe('UserSearchCombobox', () => {
  beforeEach(() => {
    authApi.searchUsers.mockReset();
    // By default every call to `GET /Auth/SearchUsers` (via `searchUsers`) -
    // whether it's the initial, unfiltered `''` call this combobox fires on
    // mount (replacing the removed `GetUserList` call) or an as-you-type
    // search once the query is long enough - resolves the same fixture list;
    // individual tests override this for pending/error/no-match cases.
    authApi.searchUsers.mockResolvedValue(users);
  });

  it('shows every candidate user as soon as the input is focused, before anything is typed', async () => {
    renderCombobox();
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));

    expect(await screen.findByRole('option', { name: /jane doe/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /john smith/i })).toBeInTheDocument();
    // The initial candidate list is now itself sourced from `SearchUsers`
    // called with no `email`/`userName` (the backend's documented
    // no-params behavior), not a 1/short-character search term.
    expect(authApi.searchUsers).toHaveBeenCalledWith('');
  });

  it('shows a loading state while the full user list is still loading', async () => {
    authApi.searchUsers.mockReturnValue(new Promise(() => {}));
    renderCombobox();
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));

    expect(await screen.findByText(/loading users/i)).toBeInTheDocument();
  });

  it('shows an error message when the full user list fails to load', async () => {
    authApi.searchUsers.mockRejectedValue(new Error('network down'));
    renderCombobox();
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('filters the already-loaded user list client-side for a one-character query, without searching for that character', async () => {
    renderCombobox();
    const user = userEvent.setup();
    await user.type(screen.getByRole('combobox'), 'j');

    await screen.findByRole('option', { name: /jane doe/i });
    expect(screen.getByRole('option', { name: /john smith/i })).toBeInTheDocument();
    expect(authApi.searchUsers).not.toHaveBeenCalledWith('j');
  });

  it('searches server-side once the debounced query is long enough', async () => {
    renderCombobox();
    const user = userEvent.setup();
    await user.type(screen.getByRole('combobox'), 'ja');

    await waitFor(() => expect(authApi.searchUsers).toHaveBeenCalledWith('ja'));
  });

  it('searches and lists matching users once the debounced query is long enough', async () => {
    renderCombobox();
    const user = userEvent.setup();
    await user.type(screen.getByRole('combobox'), 'ja');

    await waitFor(() => expect(authApi.searchUsers).toHaveBeenCalledWith('ja'));
    expect(await screen.findByRole('option', { name: /jane doe/i })).toBeInTheDocument();
  });

  it('shows a "no users found" empty state', async () => {
    authApi.searchUsers.mockImplementation((query: string) => Promise.resolve(query === '' ? users : []));
    renderCombobox();
    const user = userEvent.setup();
    await user.type(screen.getByRole('combobox'), 'zz');

    expect(await screen.findByText(/no users found/i)).toBeInTheDocument();
  });

  it('shows an error message when the search fails', async () => {
    authApi.searchUsers.mockImplementation((query: string) =>
      query === '' ? Promise.resolve(users) : Promise.reject(new Error('network down'))
    );
    renderCombobox();
    const user = userEvent.setup();
    await user.type(screen.getByRole('combobox'), 'ja');

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('selects a user on click, filling the input and emitting the userId', async () => {
    const { onChange } = renderCombobox();
    const user = userEvent.setup();
    await user.type(screen.getByRole('combobox'), 'ja');

    const option = await screen.findByRole('option', { name: /jane doe/i });
    await user.click(option);

    expect(onChange).toHaveBeenCalledWith('user-2');
    expect(screen.getByRole('combobox')).toHaveValue('Jane Doe (jane@example.com)');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('selects a user straight from the initial full list on click, without ever searching for a query term', async () => {
    const { onChange } = renderCombobox();
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));

    const option = await screen.findByRole('option', { name: /jane doe/i });
    await user.click(option);

    expect(onChange).toHaveBeenCalledWith('user-2');
    expect(authApi.searchUsers).not.toHaveBeenCalledWith(expect.stringMatching(/.+/));
  });

  it('clears the previously selected userId when the user resumes typing', async () => {
    const { onChange } = renderCombobox();
    const user = userEvent.setup();
    await user.type(screen.getByRole('combobox'), 'ja');
    const option = await screen.findByRole('option', { name: /jane doe/i });
    await user.click(option);

    onChange.mockClear();
    await user.type(screen.getByRole('combobox'), 'x');

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(''));
  });

  it('supports selecting an option via keyboard (ArrowDown + Enter)', async () => {
    const { onChange } = renderCombobox();
    const user = userEvent.setup();
    const input = screen.getByRole('combobox');
    await user.type(input, 'jo');
    await screen.findByRole('option', { name: /john smith/i });

    // The first ArrowDown highlights the first result (Jane Doe, index 0);
    // a second ArrowDown moves to John Smith (index 1) before Enter selects it.
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(onChange).toHaveBeenCalledWith('user-3');
  });

  it('closes the listbox on Escape without changing the selection', async () => {
    renderCombobox();
    const user = userEvent.setup();
    await user.type(screen.getByRole('combobox'), 'ja');
    await screen.findByRole('listbox');

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('clears the visible text when the selected value is reset externally', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    function Harness() {
      const [value, setValue] = useState('user-2');
      return (
        <div>
          <UserSearchCombobox id="userId" value={value} onChange={setValue} />
          <button type="button" onClick={() => setValue('')}>
            reset
          </button>
        </div>
      );
    }

    render(
      <QueryClientProvider client={queryClient}>
        <Harness />
      </QueryClientProvider>
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'reset' }));

    expect(screen.getByRole('combobox')).toHaveValue('');
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { CountrySearchCombobox } from './CountrySearchCombobox';
import type { Country } from '@/types/domain.types';

jest.mock('../../lib/api/countries.api', () => ({
  getCountries: jest.fn(),
}));

const countriesApi = jest.requireMock('../../lib/api/countries.api') as { getCountries: jest.Mock };

const countries: Country[] = [
  { id: 'country-1', code: 'SG', name: 'Singapore' },
  { id: 'country-2', code: 'US', name: 'United States' },
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
      <CountrySearchCombobox
        id="countryId"
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

describe('CountrySearchCombobox', () => {
  beforeEach(() => {
    countriesApi.getCountries.mockReset();
    countriesApi.getCountries.mockResolvedValue({ countries, totalCount: countries.length });
  });

  it('shows every country as soon as the input is focused, before anything is typed', async () => {
    renderCombobox();
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));

    expect(await screen.findByRole('option', { name: /singapore/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /united states/i })).toBeInTheDocument();
  });

  it('shows a loading state while the country list is still loading', async () => {
    countriesApi.getCountries.mockReturnValue(new Promise(() => {}));
    renderCombobox();
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));

    expect(await screen.findByText(/loading countries/i)).toBeInTheDocument();
  });

  it('shows an error message when the country list fails to load', async () => {
    countriesApi.getCountries.mockRejectedValue(new Error('network down'));
    renderCombobox();
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('filters the country list client-side by name as the user types', async () => {
    renderCombobox();
    const user = userEvent.setup();
    await user.type(screen.getByRole('combobox'), 'sing');

    expect(await screen.findByRole('option', { name: /singapore/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /united states/i })).not.toBeInTheDocument();
  });

  it('filters the country list client-side by ISO code as the user types', async () => {
    renderCombobox();
    const user = userEvent.setup();
    await user.type(screen.getByRole('combobox'), 'US');

    expect(await screen.findByRole('option', { name: /united states/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /singapore/i })).not.toBeInTheDocument();
  });

  it('shows a "no countries found" empty state', async () => {
    renderCombobox();
    const user = userEvent.setup();
    await user.type(screen.getByRole('combobox'), 'zzz');

    expect(await screen.findByText(/no countries found/i)).toBeInTheDocument();
  });

  it('selects a country on click, filling the input and emitting the countryId', async () => {
    const { onChange } = renderCombobox();
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));

    const option = await screen.findByRole('option', { name: /singapore/i });
    await user.click(option);

    expect(onChange).toHaveBeenCalledWith('country-1');
    expect(screen.getByRole('combobox')).toHaveValue('Singapore (SG)');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('clears the previously selected countryId when the user resumes typing', async () => {
    const { onChange } = renderCombobox();
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));
    const option = await screen.findByRole('option', { name: /singapore/i });
    await user.click(option);

    onChange.mockClear();
    await user.type(screen.getByRole('combobox'), 'x');

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('supports selecting an option via keyboard (ArrowDown + Enter)', async () => {
    const { onChange } = renderCombobox();
    const user = userEvent.setup();
    const input = screen.getByRole('combobox');
    await user.click(input);
    await screen.findByRole('option', { name: /united states/i });

    // The first ArrowDown highlights the first result (Singapore, index 0);
    // a second ArrowDown moves to United States (index 1) before Enter selects it.
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(onChange).toHaveBeenCalledWith('country-2');
  });

  it('closes the listbox on Escape without changing the selection', async () => {
    renderCombobox();
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));
    await screen.findByRole('listbox');

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('pre-fills the input with the matching country label when mounted with a non-empty value (e.g. an edit form)', async () => {
    renderCombobox('country-1');

    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('Singapore (SG)'));
  });

  it('shows every country (not filtered by the pre-filled label) when the listbox is opened right after mounting with a value', async () => {
    renderCombobox('country-1');
    const user = userEvent.setup();

    await screen.findByDisplayValue('Singapore (SG)');
    await user.click(screen.getByRole('combobox'));

    expect(await screen.findByRole('option', { name: /singapore/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /united states/i })).toBeInTheDocument();
  });

  it('filters normally by query once the caller starts typing over a pre-filled value', async () => {
    renderCombobox('country-1');
    const user = userEvent.setup();

    await screen.findByDisplayValue('Singapore (SG)');
    await user.type(screen.getByRole('combobox'), 'x');

    expect(await screen.findByText(/no countries found/i)).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /singapore/i })).not.toBeInTheDocument();
  });

  it('leaves the input blank when mounted with a value that matches no known country (e.g. a deleted reference record)', async () => {
    renderCombobox('country-does-not-exist');

    await screen.findByRole('combobox');
    expect(screen.getByRole('combobox')).toHaveValue('');
  });

  it('clears the visible text when the selected value is reset externally', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    function Harness() {
      const [value, setValue] = useState('country-1');
      return (
        <div>
          <CountrySearchCombobox id="countryId" value={value} onChange={setValue} />
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

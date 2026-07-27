import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('renders nothing when there is no data', () => {
    const { container } = render(
      <Pagination pageNo={1} pageSize={20} totalCount={0} onPageChange={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when everything fits on a single page', () => {
    const { container } = render(
      <Pagination pageNo={1} pageSize={20} totalCount={10} onPageChange={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the range summary and page count when there is more than one page', () => {
    render(<Pagination pageNo={2} pageSize={20} totalCount={45} onPageChange={jest.fn()} itemLabel="countries" />);

    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    expect(nav).toHaveTextContent('Showing 21–40 of 45 countries');
    expect(nav).toHaveTextContent('Page 2 of 3');
  });

  it('disables Previous on the first page and Next on the last page', () => {
    const { rerender } = render(
      <Pagination pageNo={1} pageSize={20} totalCount={45} onPageChange={jest.fn()} />
    );
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();

    rerender(<Pagination pageNo={3} pageSize={20} totalCount={45} onPageChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: /previous/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('calls onPageChange with the next/previous page number', async () => {
    const user = userEvent.setup();
    const onPageChange = jest.fn();
    render(<Pagination pageNo={2} pageSize={20} totalCount={45} onPageChange={onPageChange} />);

    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    await user.click(screen.getByRole('button', { name: /previous/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('disables both controls while isLoading is true', () => {
    render(<Pagination pageNo={2} pageSize={20} totalCount={45} onPageChange={jest.fn()} isLoading />);

    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });
});

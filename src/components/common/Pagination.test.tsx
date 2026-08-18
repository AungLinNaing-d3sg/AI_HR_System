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

  it('renders a clickable button for every page number when they all fit', () => {
    render(<Pagination pageNo={2} pageSize={20} totalCount={45} onPageChange={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Page 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 3' })).toBeInTheDocument();
  });

  it('marks the current page number as active (aria-current + disabled) and every other page as enabled', () => {
    render(<Pagination pageNo={2} pageSize={20} totalCount={45} onPageChange={jest.fn()} />);

    const currentPageButton = screen.getByRole('button', { name: 'Page 2' });
    expect(currentPageButton).toHaveAttribute('aria-current', 'page');
    expect(currentPageButton).toBeDisabled();

    const otherPageButton = screen.getByRole('button', { name: 'Page 3' });
    expect(otherPageButton).not.toHaveAttribute('aria-current');
    expect(otherPageButton).toBeEnabled();
  });

  it('calls onPageChange with the clicked page number', async () => {
    const user = userEvent.setup();
    const onPageChange = jest.fn();
    render(<Pagination pageNo={1} pageSize={20} totalCount={45} onPageChange={onPageChange} />);

    await user.click(screen.getByRole('button', { name: 'Page 3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('collapses a long page range into an ellipsis instead of listing every page', () => {
    render(<Pagination pageNo={1} pageSize={10} totalCount={200} onPageChange={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Page 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 20' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Page 10' })).not.toBeInTheDocument();
  });

  it('disables every page-number button while isLoading is true', () => {
    render(<Pagination pageNo={2} pageSize={20} totalCount={45} onPageChange={jest.fn()} isLoading />);

    expect(screen.getByRole('button', { name: 'Page 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Page 3' })).toBeDisabled();
  });
});

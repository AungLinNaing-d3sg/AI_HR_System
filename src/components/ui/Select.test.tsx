import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';

describe('Select', () => {
  it('renders as a native select with its options', () => {
    render(
      <Select aria-label="Project">
        <option value="a">Project A</option>
        <option value="b">Project B</option>
      </Select>
    );

    const select = screen.getByRole('combobox', { name: 'Project' });
    expect(select.tagName).toBe('SELECT');
    expect(screen.getByRole('option', { name: 'Project A' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Project B' })).toBeInTheDocument();
  });

  it('forwards a ref to the underlying <select> element', () => {
    const ref = createRef<HTMLSelectElement>();
    render(
      <Select aria-label="Project" ref={ref}>
        <option value="a">Project A</option>
      </Select>
    );

    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
  });

  it('supports selecting an option and firing onChange', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    render(
      <Select aria-label="Project" onChange={handleChange}>
        <option value="a">Project A</option>
        <option value="b">Project B</option>
      </Select>
    );

    await user.selectOptions(screen.getByRole('combobox', { name: 'Project' }), 'b');
    expect(handleChange).toHaveBeenCalled();
    expect(screen.getByRole('combobox', { name: 'Project' })).toHaveValue('b');
  });

  it('marks the select as invalid via aria-invalid when hasError is set', () => {
    render(
      <Select aria-label="Project" hasError>
        <option value="a">Project A</option>
      </Select>
    );

    expect(screen.getByRole('combobox', { name: 'Project' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not set aria-invalid when hasError is false/unset', () => {
    render(
      <Select aria-label="Project">
        <option value="a">Project A</option>
      </Select>
    );

    expect(screen.getByRole('combobox', { name: 'Project' })).not.toHaveAttribute('aria-invalid');
  });

  it('forwards className to the <select> and wrapperClassName to the outer wrapper', () => {
    const { container } = render(
      <Select aria-label="Project" className="w-auto" wrapperClassName="max-w-xs">
        <option value="a">Project A</option>
      </Select>
    );

    expect(screen.getByRole('combobox', { name: 'Project' })).toHaveClass('w-auto');
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveClass('relative', 'max-w-xs');
  });

  it('disables the select and applies the disabled styling hook', () => {
    render(
      <Select aria-label="Project" disabled>
        <option value="a">Project A</option>
      </Select>
    );

    expect(screen.getByRole('combobox', { name: 'Project' })).toBeDisabled();
  });
});

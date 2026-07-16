import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    render(
      <ConfirmDialog
        open={false}
        title="Delete project"
        description="This cannot be undone."
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('renders the title and description with accessible roles when open', () => {
    render(
      <ConfirmDialog
        open
        title="Delete project"
        description="This cannot be undone."
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Delete project')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('calls onConfirm when the confirm button is clicked', async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        open
        title="Delete project"
        description="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when the cancel button is clicked', async () => {
    const onCancel = jest.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        open
        title="Delete project"
        description="This cannot be undone."
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Escape is pressed', async () => {
    const onCancel = jest.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        open
        title="Delete project"
        description="This cannot be undone."
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />
    );
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('moves focus to the confirm button when opened', () => {
    render(
      <ConfirmDialog
        open
        title="Delete project"
        description="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { hydrateAxeThemeColors } from '@/renderer/lib/a11yTestHelpers';

import { Badge } from './Badge';
import { Button } from './Button';
import { Callout } from './Callout';
import { Card, CardHeader } from './Card';
import { Dialog } from './Dialog';
import { EmptyState } from './EmptyState';

describe('Callout', () => {
  it('announces danger as an alert and other tones as status', () => {
    render(
      <>
        <Callout tone="danger">Radio disconnected</Callout>
        <Callout tone="warning" title="Low battery">
          12% left
        </Callout>
      </>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Radio disconnected');
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Low battery');
    expect(status.className).toContain('bg-warning-500/10');
  });

  it('can be a static note with no live region', () => {
    const { container } = render(
      <Callout tone="info" role="none">
        Connect a device to configure it.
      </Callout>,
    );
    expect(screen.queryByRole('status')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

describe('Badge', () => {
  it('renders soft and solid tones', () => {
    render(
      <>
        <Badge tone="success">Online</Badge>
        <Badge tone="danger" variant="solid">
          3
        </Badge>
      </>,
    );
    expect(screen.getByText('Online').className).toContain('text-success-200');
    expect(screen.getByText('3').className).toContain('bg-danger-700');
  });
});

describe('Button extras', () => {
  it('loading disables the button and marks it busy', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('destructive is a solid red fill under white text', () => {
    render(<Button variant="destructive">Delete</Button>);
    const cls = screen.getByRole('button', { name: 'Delete' }).className;
    expect(cls).toContain('bg-danger-700');
    expect(cls).toContain('text-white');
  });
});

describe('Dialog', () => {
  it('labels itself, traps Escape and returns focus to the opener', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const { unmount } = render(
      <Dialog title="Forget device" description="This removes saved pairing." onClose={onClose}>
        <input aria-label="Name" />
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Forget device' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('This removes saved pairing.');
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });

  it('keeps the dialog open on backdrop click when asked', async () => {
    const onClose = vi.fn();
    render(
      <Dialog title="Edit" onClose={onClose} dismissOnBackdrop={false}>
        body
      </Dialog>,
    );
    // The backdrop is the dialog's previous sibling.
    const backdrop = screen.getByRole('dialog').previousElementSibling as HTMLElement;
    await userEvent.click(backdrop);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('EmptyState and Card', () => {
  it('shows a title, guidance and the next step', () => {
    render(
      <EmptyState
        title="No messages yet"
        description="Messages on this channel appear here."
        action={<Button variant="primary">Connect a radio</Button>}
      />,
    );
    expect(screen.getByText('No messages yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect a radio' })).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <div className="bg-app-bg">
        <Card>
          <CardHeader title="Radio" description="LoRa settings" />
          <Callout tone="success">Saved</Callout>
          <Badge tone="info">Beta</Badge>
        </Card>
        <EmptyState title="Nothing here" />
      </div>,
    );
    hydrateAxeThemeColors(container);
    expect(await axe(container)).toHaveNoViolations();
  });
});

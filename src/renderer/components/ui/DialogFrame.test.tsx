import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Dialog } from './Dialog';
import { DialogFrame } from './DialogFrame';

function Frame({
  title,
  onClose,
  onEscape,
  captureEscape,
  children,
}: {
  title: string;
  onClose: () => void;
  onEscape?: () => void;
  captureEscape?: boolean;
  children?: React.ReactNode;
}) {
  const id = `t-${title}`;
  return (
    <DialogFrame
      labelledBy={id}
      onClose={onClose}
      onEscape={onEscape}
      captureEscape={captureEscape}
    >
      <h2 id={id}>{title}</h2>
      {children}
    </DialogFrame>
  );
}

describe('DialogFrame', () => {
  it('names the dialog from its heading and focuses the first control', () => {
    render(
      <Frame title="Groups" onClose={vi.fn()}>
        <button type="button">First</button>
        <button type="button">Second</button>
      </Frame>,
    );
    expect(screen.getByRole('dialog', { name: 'Groups' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
  });

  it('wraps Tab and Shift+Tab inside the panel', async () => {
    const user = userEvent.setup();
    render(
      <Frame title="Trap" onClose={vi.fn()}>
        <button type="button">First</button>
        <button type="button">Last</button>
      </Frame>,
    );
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
  });

  it('routes Escape to onEscape when given (step back before closing)', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onEscape = vi.fn();
    render(
      <Frame title="Views" onClose={onClose} onEscape={onEscape}>
        <button type="button">Back</button>
      </Frame>,
    );
    await user.keyboard('{Escape}');
    expect(onEscape).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('only the topmost of nested dialogs answers Escape and Tab', async () => {
    const user = userEvent.setup();
    const outerClose = vi.fn();
    const innerClose = vi.fn();
    render(
      <>
        <Frame title="Node" onClose={outerClose}>
          <button type="button">Node action</button>
        </Frame>
        <Dialog title="Sign in" onClose={innerClose}>
          <input aria-label="Password" />
        </Dialog>
      </>,
    );
    expect(screen.getByLabelText('Password')).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText('Password')).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(innerClose).toHaveBeenCalledOnce();
    expect(outerClose).not.toHaveBeenCalled();
  });

  it('moves focus to the first control again when focusKey changes', async () => {
    const user = userEvent.setup();
    function TwoViews() {
      const [view, setView] = useState<'list' | 'detail'>('list');
      return (
        <DialogFrame labelledBy="tv" onClose={vi.fn()} focusKey={view}>
          <h2 id="tv">Two views</h2>
          {view === 'list' ? (
            <button
              type="button"
              onClick={() => {
                setView('detail');
              }}
            >
              Open detail
            </button>
          ) : (
            <>
              <button type="button">Detail first</button>
              <button type="button">Detail second</button>
            </>
          )}
        </DialogFrame>
      );
    }
    render(<TwoViews />);
    await user.click(screen.getByRole('button', { name: 'Open detail' }));
    expect(screen.getByRole('button', { name: 'Detail first' })).toHaveFocus();
  });

  it('captureEscape keeps Escape from reaching handlers on the page underneath', () => {
    const pageHandler = vi.fn();
    document.addEventListener('keydown', pageHandler);
    const onClose = vi.fn();
    render(<Frame title="Emergency" onClose={onClose} captureEscape />);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    document.removeEventListener('keydown', pageHandler);
    expect(onClose).toHaveBeenCalledOnce();
    expect(pageHandler).not.toHaveBeenCalled();
  });

  it('returns focus to the opener when it closes', async () => {
    const user = userEvent.setup();
    function Opener() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setOpen(true);
            }}
          >
            Open
          </button>
          {open && (
            <Frame
              title="Closable"
              onClose={() => {
                setOpen(false);
              }}
            />
          )}
        </>
      );
    }
    render(<Opener />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
  });
});

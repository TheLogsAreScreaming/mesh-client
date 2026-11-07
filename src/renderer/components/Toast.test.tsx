import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { pushAppToast, ToastProvider } from './Toast';

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('announces errors as alerts and other toasts as status', () => {
    render(
      <ToastProvider>
        <span />
      </ToastProvider>,
    );
    act(() => {
      pushAppToast('Saved', 'success');
      pushAppToast('Send failed', 'error');
    });
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    expect(screen.getByRole('alert')).toHaveTextContent('Send failed');
  });

  it('pauses auto-dismiss while hovered', () => {
    render(
      <ToastProvider>
        <span />
      </ToastProvider>,
    );
    act(() => {
      pushAppToast('Hold on', 'info', 2000);
    });
    const toast = screen.getByRole('status');
    act(() => {
      toast.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByRole('status')).toHaveTextContent('Hold on');
    act(() => {
      toast.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    });
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(screen.queryByRole('status')).toBeNull();
  });
});

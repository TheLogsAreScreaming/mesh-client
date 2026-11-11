import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  resetTeamRosterStoreForTests,
  useTeamRosterStore,
} from '@/renderer/stores/teamRosterStore';

import { ToastProvider } from '../Toast';
import { SuggestToTeamContactModal } from './SuggestToTeamContactModal';

function renderModal(ui: ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

beforeEach(() => {
  resetTeamRosterStoreForTests();
  useTeamRosterStore.setState({
    hydrated: true,
    members: [
      {
        unitId: 1,
        callsign: 'Alpha',
        role: 'IC',
        isSelf: false,
        onRoster: false,
        createdAt: 1,
        updatedAt: 1,
        links: [{ protocol: 'meshtastic', durableKey: '1', nodeId: 1, onRoster: false }],
      },
    ],
  });
});

describe('SuggestToTeamContactModal', () => {
  it('links a second same-protocol node to an existing card', async () => {
    const user = userEvent.setup();
    const setLink = vi.fn().mockResolvedValue({
      unitId: 1,
      callsign: 'Alpha',
      role: 'IC',
      isSelf: false,
      onRoster: false,
      createdAt: 1,
      updatedAt: 2,
      links: [
        { protocol: 'meshtastic', durableKey: '1', nodeId: 1, onRoster: false },
        { protocol: 'meshtastic', durableKey: '42', nodeId: 42, onRoster: false },
      ],
    });
    useTeamRosterStore.setState({ setLink });
    const onClose = vi.fn();

    renderModal(
      <SuggestToTeamContactModal
        candidate={{
          protocol: 'meshtastic',
          durableKey: '42',
          nodeId: 42,
          longName: 'Node',
        }}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('button', { name: /#1 Alpha/i }));
    await user.click(screen.getByRole('button', { name: /add to card/i }));
    expect(setLink).toHaveBeenCalledWith(
      expect.objectContaining({ unitId: 1, durableKey: '42', protocol: 'meshtastic' }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('shows already-linked status', () => {
    useTeamRosterStore.setState({
      members: [
        {
          unitId: 3,
          callsign: 'Charlie',
          role: null,
          isSelf: false,
          onRoster: false,
          createdAt: 1,
          updatedAt: 1,
          links: [{ protocol: 'meshtastic', durableKey: '99', nodeId: 99, onRoster: false }],
        },
      ],
    });
    renderModal(
      <SuggestToTeamContactModal
        candidate={{ protocol: 'meshtastic', durableKey: '99', nodeId: 99 }}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/already linked to Charlie/i);
  });
});

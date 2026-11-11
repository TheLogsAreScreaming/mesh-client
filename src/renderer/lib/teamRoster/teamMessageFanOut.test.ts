import { describe, expect, it, vi } from 'vitest';

import type { TeamMember } from '@/shared/teamRosterTypes';

import type { MemberPresenceSnapshot } from './contactPresence';
import { activePresenceFanOutLinks, fanOutTeamMessage } from './teamMessageFanOut';

function member(
  partial: Partial<TeamMember> & Pick<TeamMember, 'unitId' | 'callsign'>,
): TeamMember {
  return {
    isSelf: false,
    onRoster: true,
    createdAt: 1,
    updatedAt: 1,
    links: [],
    ...partial,
  };
}

describe('fanOutTeamMessage', () => {

  it('skips when no link or online destination and when all sends fail', () => {
    const sendDm = vi.fn().mockReturnValue(false);
    const presenceByUnit = new Map<number, MemberPresenceSnapshot>([
      [
        1,
        {
          unitId: 1,
          aggregateStatus: 'offline',
          lastActive: null,
          links: [],
        },
      ],
      [
        2,
        {
          unitId: 2,
          aggregateStatus: 'stale',
          lastActive: {
            link: { protocol: 'meshtastic', durableKey: 'x', onRoster: true },
            peerNodeId: null,
            lastHeardMs: 1,
            status: 'stale',
            displayName: null,
          },
          links: [
            {
              link: { protocol: 'meshtastic', durableKey: 'x', onRoster: true },
              peerNodeId: null,
              lastHeardMs: 1,
              status: 'stale',
              displayName: null,
            },
          ],
        },
      ],
      [
        3,
        {
          unitId: 3,
          aggregateStatus: 'online',
          lastActive: {
            link: { protocol: 'meshtastic', durableKey: '30', nodeId: 30, onRoster: true },
            peerNodeId: 30,
            lastHeardMs: 50,
            status: 'online',
            displayName: null,
          },
          links: [
            {
              link: { protocol: 'meshtastic', durableKey: '30', nodeId: 30, onRoster: true },
              peerNodeId: 30,
              lastHeardMs: 50,
              status: 'online',
              displayName: null,
            },
          ],
        },
      ],
    ]);

    const result = fanOutTeamMessage({
      recipients: [
        member({ unitId: 1, callsign: 'None' }),
        member({ unitId: 2, callsign: 'NoDest' }),
        member({ unitId: 3, callsign: 'Fail' }),
      ],
      presenceByUnit,
      text: 'ping',
      sendDm,
    });

    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(3);
    expect(result.results.map((r) => r.skipReason)).toEqual([
      'no_link',
      'no_destination',
      'send_failed',
    ]);
  });

  it('skips isSelf roster members without calling send', () => {
    const sendDm = vi.fn().mockReturnValue(true);
    const result = fanOutTeamMessage({
      recipients: [member({ unitId: 1, callsign: 'Me', isSelf: true })],
      presenceByUnit: new Map(),
      text: 'hello',
      sendDm,
    });
    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.results[0]?.skipReason).toBe('no_destination');
    expect(sendDm).not.toHaveBeenCalled();
  });
});

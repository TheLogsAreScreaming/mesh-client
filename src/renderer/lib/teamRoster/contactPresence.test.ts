import { describe, expect, it } from 'vitest';

import type { MeshNode } from '@/renderer/lib/types';
import type { TeamMember } from '@/shared/teamRosterTypes';

import { resolveLinkPresence, resolveMemberPresence } from './contactPresence';

function node(partial: Partial<MeshNode> & { node_id: number }): MeshNode {
  return {
    long_name: '',
    short_name: '',
    hw_model: '',
    snr: 0,
    battery: 0,
    last_heard: 0,
    latitude: null,
    longitude: null,
    ...partial,
  };
}

describe('contactPresence', () => {
  it('marks a recently heard meshtastic link online', () => {
    const now = Date.now();
    const snap = resolveLinkPresence(
      { protocol: 'meshtastic', durableKey: '42', nodeId: 42, longName: 'Alpha', onRoster: false },
      {
        meshtastic: new Map([
          [42, node({ node_id: 42, last_heard: now - 60_000, long_name: 'Alpha' })],
        ]),
      },
      new Map(),
      now,
    );
    expect(snap.status).toBe('online');
    expect(snap.peerNodeId).toBe(42);
    expect(snap.displayName).toBe('Alpha');
  });

  it('resolves meshcore by pubkey when nodeId is missing', () => {
    const now = Date.now();
    const pubkey = 'ab'.repeat(32);
    const snap = resolveLinkPresence(
      { protocol: 'meshcore', durableKey: pubkey, onRoster: false },
      {
        meshcore: new Map([
          [
            9,
            node({ node_id: 9, last_heard: now - 1000, public_key_hex: pubkey, long_name: 'MC' }),
          ],
        ]),
      },
      new Map(),
      now,
    );
    expect(snap.peerNodeId).toBe(9);
    expect(snap.status).toBe('online');
  });

});

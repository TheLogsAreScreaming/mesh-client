import { describe, expect, it } from 'vitest';

import { teamLinkFromLoraNode } from './durableKey';

describe('team roster durable keys', () => {
  it('builds a meshtastic link from node id', () => {
    expect(
      teamLinkFromLoraNode({
        protocol: 'meshtastic',
        nodeId: 42,
        longName: 'Base',
      }),
    ).toEqual({
      protocol: 'meshtastic',
      durableKey: '42',
      nodeId: 42,
      longName: 'Base',
      identityId: null,
    });
  });

  it('prefers meshcore pubkey and falls back to node id without a key', () => {
    expect(
      teamLinkFromLoraNode({
        protocol: 'meshcore',
        nodeId: 1,
        publicKeyHex: 'ab',
      }),
    ).toEqual({
      protocol: 'meshcore',
      durableKey: '1',
      nodeId: 1,
      longName: null,
      identityId: null,
    });
    expect(
      teamLinkFromLoraNode({
        protocol: 'meshcore',
        nodeId: 99,
      })?.durableKey,
    ).toBe('99');
    expect(
      teamLinkFromLoraNode({
        protocol: 'meshcore',
        nodeId: 1,
        publicKeyHex: 'AB'.repeat(32),
      })?.durableKey,
    ).toBe('ab'.repeat(32));
  });
});

import { describe, expect, it } from 'vitest';

import {
  filterGlobalMessageSearchHits,
  type GlobalMessageSearchHit,
  isGlobalMessageSearchShortcut,
  normalizeMeshcoreSearchRow,
  normalizeMeshtasticSearchRow,
} from './globalMessageSearch';

describe('normalize*SearchRow', () => {
  it('maps Meshtastic channel vs DM', () => {
    const ch = normalizeMeshtasticSearchRow({
      id: 1,
      sender_id: 10,
      sender_name: 'A',
      payload: 'hi',
      channel: 2,
      timestamp: 100,
      to_node: null,
    });
    expect(ch.channel).toBe(2);
    expect(ch.dmPeer).toBeNull();

    const dm = normalizeMeshtasticSearchRow({
      id: 2,
      sender_id: 10,
      payload: 'dm',
      channel: 0,
      timestamp: 101,
      to_node: 99,
    });
    expect(dm.channel).toBeNull();
    expect(dm.dmPeer).toBe(10);
  });

  it('uses to_node as Meshtastic DM peer only for own outbound rows', () => {
    const own = new Set([10]);
    const outbound = normalizeMeshtasticSearchRow(
      { id: 2, sender_id: 10, payload: 'dm', channel: 0, timestamp: 101, to_node: 99 },
      own,
    );
    expect(outbound.dmPeer).toBe(99);

    const inbound = normalizeMeshtasticSearchRow(
      { id: 3, sender_id: 55, payload: 'hi', channel: 0, timestamp: 102, to_node: 10 },
      own,
    );
    expect(inbound.dmPeer).toBe(55);
    expect(inbound.toNode).toBe(10);
    expect(
      filterGlobalMessageSearchHits([inbound], { protocol: 'all', conversation: 'dm:55' }),
    ).toEqual([inbound]);
  });

  it('maps MeshCore channel_idx -1 as DM', () => {
    const hit = normalizeMeshcoreSearchRow({
      id: 3,
      sender_id: 1,
      payload: 'x',
      channel_idx: -1,
      timestamp: 1,
      to_node: 42,
    });
    expect(hit.protocol).toBe('meshcore');
    expect(hit.channel).toBeNull();
    expect(hit.dmPeer).toBe(1);
  });

  it('uses to_node as MeshCore DM peer only for own outbound rows', () => {
    const own = new Set([1]);
    expect(
      normalizeMeshcoreSearchRow(
        { id: 3, sender_id: 1, payload: 'x', channel_idx: -1, timestamp: 1, to_node: 42 },
        own,
      ).dmPeer,
    ).toBe(42);
    expect(
      normalizeMeshcoreSearchRow(
        { id: 4, sender_id: 42, payload: 'y', channel_idx: -1, timestamp: 2, to_node: 1 },
        own,
      ).dmPeer,
    ).toBe(42);
  });
});

describe('search hit focus', () => {
  it('leaves a missing sender name empty', () => {
    expect(normalizeMeshtasticSearchRow({ id: 1, payload: 'hi', timestamp: 1 }).senderName).toBe(
      '',
    );
  });
});

describe('filterGlobalMessageSearchHits', () => {
  const hits: GlobalMessageSearchHit[] = [
    {
      protocol: 'meshtastic',
      dbId: 1,
      timestamp: 1000,
      senderId: 1,
      senderName: 'Alpha',
      payload: 'hello world',
      channel: 0,
      dmPeer: null,
      packetId: null,
    },
    {
      protocol: 'meshcore',
      dbId: 2,
      timestamp: 2000,
      senderId: 2,
      senderName: 'Beta',
      payload: 'other',
      channel: null,
      dmPeer: 9,
      packetId: null,
    },
  ];

  it('filters by protocol and sender', () => {
    expect(
      filterGlobalMessageSearchHits(hits, { protocol: 'meshtastic', senderQuery: 'alp' }),
    ).toHaveLength(1);
    expect(filterGlobalMessageSearchHits(hits, { protocol: 'all', conversation: 'dm:9' })).toEqual([
      hits[1],
    ]);
  });

  it('filters by date range and direction', () => {
    expect(filterGlobalMessageSearchHits(hits, { protocol: 'all', fromTs: 1500 })).toHaveLength(1);
    expect(
      filterGlobalMessageSearchHits(hits, {
        protocol: 'all',
        direction: 'outbound',
        ownNodeIdsByProtocol: { meshtastic: new Set([1]) },
      }),
    ).toEqual([hits[0]]);
  });

  it('does not let MeshCore own-ids classify Meshtastic direction', () => {
    expect(
      filterGlobalMessageSearchHits(hits, {
        protocol: 'meshtastic',
        direction: 'outbound',
        ownNodeIdsByProtocol: {
          meshtastic: new Set([99]),
          meshcore: new Set([1]),
        },
      }),
    ).toEqual([]);
  });
});

describe('isGlobalMessageSearchShortcut', () => {
  it('matches Ctrl/Cmd+Shift+F', () => {
    expect(
      isGlobalMessageSearchShortcut(
        { key: 'f', metaKey: true, ctrlKey: false, shiftKey: true, altKey: false } as KeyboardEvent,
        'darwin',
      ),
    ).toBe(true);
    expect(
      isGlobalMessageSearchShortcut(
        { key: 'f', metaKey: false, ctrlKey: true, shiftKey: true, altKey: false } as KeyboardEvent,
        'linux',
      ),
    ).toBe(true);
    expect(
      isGlobalMessageSearchShortcut(
        {
          key: 'f',
          metaKey: true,
          ctrlKey: false,
          shiftKey: false,
          altKey: false,
        } as KeyboardEvent,
        'darwin',
      ),
    ).toBe(false);
  });
});

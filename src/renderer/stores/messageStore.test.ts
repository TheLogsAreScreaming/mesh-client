import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { meshcoreNodeHash } from '@/shared/meshcoreNodeHash';

import { MAX_IN_MEMORY_CHAT_MESSAGES } from '../lib/chatInMemoryBuffer';
import {
  openHeardRepeatWindow,
  recordMeshcoreRfRx,
  resetHeardRepeatWindowsForTests,
} from '../lib/meshcore/heardRepeatTracker';
import * as meshtasticMessageLoadLimit from '../lib/meshtasticMessageLoadLimit';
import type { Protocol } from '../lib/protocols/Protocol';
import { useRelayCoverageStore } from '../lib/relayCoverage/relayCoverageStore';
import { mockConsoleWarn } from '../lib/vitestConsoleMock';
import { addIdentity, removeIdentity } from './identityStore';
import {
  addMessage,
  mergeMessageRecordsFromDbForIdentity,
  type MessageRecord,
  type MessageStoreEvent,
  pruneMessageRecordsForIdentityByChannel,
  renameMessageId,
  replaceMessageRecordsForIdentity,
  subscribeMessageStoreEvents,
  upsertMessage,
  upsertMessageRecordsForIdentity,
  useMessageStore,
  wasMessageBulkLoaded,
} from './messageStore';

const ID_A = 'identity-a';
const ID_B = 'identity-b';

function sampleRecord(id: string, from = 1): MessageRecord {
  return {
    id,
    from,
    to: 0,
    payload: 'hello',
    channelIndex: 0,
    timestamp: 1_700_000_000_000,
  };
}

describe('messageStore structural sharing', () => {
  beforeEach(() => {
    useMessageStore.setState({ messages: {} });
    useRelayCoverageStore.setState({ coverage: {} });
  });

  it('preserves other identity bucket references when adding to one identity', () => {
    addMessage(ID_B, sampleRecord('b1'));
    const bucketBefore = useMessageStore.getState().messages[ID_B];

    addMessage(ID_A, sampleRecord('a1'));

    expect(useMessageStore.getState().messages[ID_B]).toBe(bucketBefore);
    expect(useMessageStore.getState().messages[ID_A]?.a1).toBeDefined();
  });

  it('no-ops when inserting an identical record', () => {
    const record = sampleRecord('same');
    addMessage(ID_A, record);
    const stateBefore = useMessageStore.getState();

    addMessage(ID_A, { ...record });

    expect(useMessageStore.getState()).toBe(stateBefore);
  });
});

describe('messageStore replace and prune', () => {
  beforeEach(() => {
    useMessageStore.setState({ messages: {} });
  });

  it('replaceMessageRecordsForIdentity clears prior rows including empty reload', () => {
    addMessage(ID_A, sampleRecord('a1', 1));
    addMessage(ID_A, { ...sampleRecord('a2', 1), channelIndex: 1 });
    replaceMessageRecordsForIdentity(ID_A, []);
    expect(Object.keys(useMessageStore.getState().messages[ID_A] ?? {})).toHaveLength(0);
  });

  it('replaceMessageRecordsForIdentity replaces bucket with DB snapshot', () => {
    addMessage(ID_A, sampleRecord('old', 1));
    replaceMessageRecordsForIdentity(ID_A, [sampleRecord('new', 2)]);
    const bucket = useMessageStore.getState().messages[ID_A];
    expect(bucket?.old).toBeUndefined();
    expect(bucket?.new?.from).toBe(2);
  });

  it('mergeMessageRecordsFromDbForIdentity keeps live rows missing from DB', () => {
    addMessage(ID_A, sampleRecord('live', 1));
    mergeMessageRecordsFromDbForIdentity(ID_A, [sampleRecord('db', 2)]);
    const bucket = useMessageStore.getState().messages[ID_A];
    expect(bucket?.live?.from).toBe(1);
    expect(bucket?.db?.from).toBe(2);
  });

  it('mergeMessageRecordsFromDbForIdentity lets DB win on id collision', () => {
    addMessage(ID_A, { ...sampleRecord('same', 1), payload: 'live' });
    mergeMessageRecordsFromDbForIdentity(ID_A, [{ ...sampleRecord('same', 9), payload: 'db' }]);
    expect(useMessageStore.getState().messages[ID_A]?.same?.payload).toBe('db');
    expect(useMessageStore.getState().messages[ID_A]?.same?.from).toBe(9);
  });

  it('tracks bulk-load provenance per stored record, not per id', () => {
    upsertMessageRecordsForIdentity(ID_A, [sampleRecord('shared', 1)]);
    addMessage(ID_B, sampleRecord('shared', 2));
    const state = useMessageStore.getState().messages;
    expect(wasMessageBulkLoaded(state[ID_A].shared)).toBe(true);
    expect(wasMessageBulkLoaded(state[ID_B].shared)).toBe(false);

    addMessage(ID_A, { ...sampleRecord('shared', 1), payload: 'live edit' });
    expect(wasMessageBulkLoaded(useMessageStore.getState().messages[ID_A].shared)).toBe(false);
  });

  it('mergeMessageRecordsFromDbForIdentity marks DB rows but never demotes a live record', () => {
    addMessage(ID_A, { ...sampleRecord('same', 1), payload: 'live' });
    mergeMessageRecordsFromDbForIdentity(ID_A, [
      { ...sampleRecord('same', 9), payload: 'db' },
      sampleRecord('db-only', 2),
    ]);
    const bucket = useMessageStore.getState().messages[ID_A];
    expect(wasMessageBulkLoaded(bucket['db-only'])).toBe(true);
    expect(wasMessageBulkLoaded(bucket.same)).toBe(false);
  });

  it('pruneMessageRecordsForIdentityByChannel removes one channel slice', () => {
    addMessage(ID_A, sampleRecord('ch0', 1));
    addMessage(ID_A, { ...sampleRecord('ch1', 1), id: 'ch1', channelIndex: 1 });
    pruneMessageRecordsForIdentityByChannel(ID_A, 0);
    const bucket = useMessageStore.getState().messages[ID_A];
    expect(bucket?.ch0).toBeUndefined();
    expect(bucket?.ch1).toBeDefined();
  });
});

describe('messageStore events', () => {
  beforeEach(() => {
    useMessageStore.setState({ messages: {} });
  });

  it('emits added only for new records and renamed only for real renames', () => {
    const events: MessageStoreEvent[] = [];
    const unsubscribe = subscribeMessageStoreEvents((e) => events.push(e));
    try {
      addMessage(ID_A, sampleRecord('m1'));
      addMessage(ID_A, { ...sampleRecord('m1'), payload: 'edited' });
      upsertMessage(ID_A, sampleRecord('m2'));
      renameMessageId(ID_A, 'm1', 'm1');
      renameMessageId(ID_A, 'missing', 'x');
      renameMessageId(ID_A, 'm1', 'wire-1');
    } finally {
      unsubscribe();
    }
    expect(events.map((e) => (e.type === 'added' ? `added:${e.record.id}` : e.type))).toEqual([
      'added:m1',
      'added:m2',
      'renamed',
    ]);
    expect(events[2]).toEqual({ type: 'renamed', identityId: ID_A, fromId: 'm1', toId: 'wire-1' });
  });

  it('stops emitting after unsubscribe and isolates throwing listeners', () => {
    const { spy, restore } = mockConsoleWarn();
    try {
      const good = vi.fn();
      const unsubBad = subscribeMessageStoreEvents(() => {
        throw new Error('boom');
      });
      const unsubGood = subscribeMessageStoreEvents(good);
      addMessage(ID_A, sampleRecord('e1'));
      expect(good).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalled();
      unsubGood();
      unsubBad();
      addMessage(ID_A, sampleRecord('e2'));
      expect(good).toHaveBeenCalledTimes(1);
    } finally {
      restore();
    }
  });
});

describe('messageStore live trim', () => {
  const TRIM_ID = 'identity-trim-mt';

  beforeEach(() => {
    useMessageStore.setState({ messages: {} });
    useRelayCoverageStore.setState({ coverage: {} });
    resetHeardRepeatWindowsForTests();
    vi.spyOn(meshtasticMessageLoadLimit, 'getMeshtasticMessageLoadLimit').mockReturnValue(3);
    addIdentity({
      id: TRIM_ID,
      protocol: { type: 'meshtastic' } as unknown as Protocol,
      signature: '',
      transports: [],
      createdAt: 0,
      lastSeenAt: 0,
    });
  });

  afterEach(() => {
    removeIdentity(TRIM_ID);
    vi.restoreAllMocks();
  });

  it('addMessage drops oldest rows past the Meshtastic load limit', () => {
    addMessage(TRIM_ID, { ...sampleRecord('old'), timestamp: 1 });
    addMessage(TRIM_ID, { ...sampleRecord('mid'), timestamp: 2 });
    addMessage(TRIM_ID, { ...sampleRecord('new'), timestamp: 3 });
    addMessage(TRIM_ID, { ...sampleRecord('newest'), timestamp: 4 });

    const bucket = useMessageStore.getState().messages[TRIM_ID] ?? {};
    expect(Object.keys(bucket).sort()).toEqual(['mid', 'new', 'newest']);
    expect(bucket.old).toBeUndefined();
  });

  it('upsertMessage insert trims; update of an existing id does not', () => {
    upsertMessage(TRIM_ID, { ...sampleRecord('a'), timestamp: 1 });
    upsertMessage(TRIM_ID, { ...sampleRecord('b'), timestamp: 2 });
    upsertMessage(TRIM_ID, { ...sampleRecord('c'), timestamp: 3 });
    expect(Object.keys(useMessageStore.getState().messages[TRIM_ID] ?? {})).toHaveLength(3);

    upsertMessage(TRIM_ID, { ...sampleRecord('a'), timestamp: 1, payload: 'edited' });
    const afterUpdate = useMessageStore.getState().messages[TRIM_ID] ?? {};
    expect(Object.keys(afterUpdate).sort()).toEqual(['a', 'b', 'c']);
    expect(afterUpdate.a?.payload).toBe('edited');

    upsertMessage(TRIM_ID, { ...sampleRecord('d'), timestamp: 4 });
    const afterInsert = useMessageStore.getState().messages[TRIM_ID] ?? {};
    expect(Object.keys(afterInsert).sort()).toEqual(['b', 'c', 'd']);
  });

  it('bulk upsertMessageRecordsForIdentity does not trim past the live cap', () => {
    upsertMessageRecordsForIdentity(TRIM_ID, [
      { ...sampleRecord('b1'), timestamp: 1 },
      { ...sampleRecord('b2'), timestamp: 2 },
      { ...sampleRecord('b3'), timestamp: 3 },
      { ...sampleRecord('b4'), timestamp: 4 },
    ]);
    expect(Object.keys(useMessageStore.getState().messages[TRIM_ID] ?? {}).sort()).toEqual([
      'b1',
      'b2',
      'b3',
      'b4',
    ]);
  });

  it('removes relay coverage for an evicted message id', () => {
    addMessage(TRIM_ID, { ...sampleRecord('old'), timestamp: 1 });
    useRelayCoverageStore.getState().set(TRIM_ID, 'old', {
      protocol: 'meshtastic',
      mode: 'predicted',
      predictedRelayHops: 1,
    });
    addMessage(TRIM_ID, { ...sampleRecord('mid'), timestamp: 2 });
    addMessage(TRIM_ID, { ...sampleRecord('new'), timestamp: 3 });
    addMessage(TRIM_ID, { ...sampleRecord('newest'), timestamp: 4 });

    expect(useRelayCoverageStore.getState().coverageFor(TRIM_ID, 'old')).toBeUndefined();
    expect(useMessageStore.getState().messages[TRIM_ID]?.old).toBeUndefined();
  });

  it('drops multiple oldest rows when the live cap shrinks mid-session', () => {
    addMessage(TRIM_ID, { ...sampleRecord('a'), timestamp: 1 });
    addMessage(TRIM_ID, { ...sampleRecord('b'), timestamp: 2 });
    addMessage(TRIM_ID, { ...sampleRecord('c'), timestamp: 3 });
    expect(Object.keys(useMessageStore.getState().messages[TRIM_ID] ?? {})).toHaveLength(3);

    vi.mocked(meshtasticMessageLoadLimit.getMeshtasticMessageLoadLimit).mockReturnValue(1);
    addMessage(TRIM_ID, { ...sampleRecord('d'), timestamp: 4 });

    const bucket = useMessageStore.getState().messages[TRIM_ID] ?? {};
    expect(Object.keys(bucket)).toEqual(['d']);
  });
});

describe.each(['meshcore', 'reticulum'] as const)(
  'messageStore live trim hard cap (%s)',
  (type) => {
    const TRIM_ID = `identity-trim-${type}`;

    beforeEach(() => {
      useMessageStore.setState({ messages: {} });
      useRelayCoverageStore.setState({ coverage: {} });
      // Meshtastic load limit stays tiny so a mistaken branch would under-cap.
      vi.spyOn(meshtasticMessageLoadLimit, 'getMeshtasticMessageLoadLimit').mockReturnValue(3);
      addIdentity({
        id: TRIM_ID,
        protocol: { type } as unknown as Protocol,
        signature: '',
        transports: [],
        createdAt: 0,
        lastSeenAt: 0,
      });
    });

    afterEach(() => {
      removeIdentity(TRIM_ID);
      vi.restoreAllMocks();
    });

    it(`retains ${MAX_IN_MEMORY_CHAT_MESSAGES} after live overflow past the hard cap`, () => {
      const seeded: MessageRecord[] = [];
      for (let i = 0; i < MAX_IN_MEMORY_CHAT_MESSAGES; i++) {
        seeded.push({ ...sampleRecord(`m${i}`), timestamp: i + 1 });
      }
      // Bulk seed avoids O(n²) live inserts; one live add exercises the non-Meshtastic cap.
      replaceMessageRecordsForIdentity(TRIM_ID, seeded);
      addMessage(TRIM_ID, {
        ...sampleRecord('overflow'),
        timestamp: MAX_IN_MEMORY_CHAT_MESSAGES + 1,
      });

      const bucket = useMessageStore.getState().messages[TRIM_ID] ?? {};
      expect(Object.keys(bucket)).toHaveLength(MAX_IN_MEMORY_CHAT_MESSAGES);
      expect(bucket.m0).toBeUndefined();
      expect(bucket.overflow).toBeDefined();
      expect(meshtasticMessageLoadLimit.getMeshtasticMessageLoadLimit).not.toHaveBeenCalled();
    });
  },
);

describe('messageStore MeshCore fair channel floors', () => {
  const TRIM_ID = 'identity-trim-meshcore-floors';

  beforeEach(() => {
    useMessageStore.setState({ messages: {} });
    addIdentity({
      id: TRIM_ID,
      protocol: { type: 'meshcore' } as unknown as Protocol,
      signature: '',
      transports: [],
      createdAt: 0,
      lastSeenAt: 0,
    });
  });

  afterEach(() => {
    removeIdentity(TRIM_ID);
  });

  it('keeps a quiet channel when a live insert follows a >2000 fair hydration', () => {
    const seeded: MessageRecord[] = [];
    for (let channel = 0; channel < 21; channel++) {
      for (let i = 0; i < 100; i++) {
        seeded.push({
          ...sampleRecord(`${channel}-${i}`),
          channelIndex: channel,
          timestamp: channel * 1_000 + i,
        });
      }
    }
    replaceMessageRecordsForIdentity(TRIM_ID, seeded);
    addMessage(TRIM_ID, {
      ...sampleRecord('live'),
      channelIndex: 20,
      timestamp: 999_999,
    });

    const bucket = useMessageStore.getState().messages[TRIM_ID] ?? {};
    expect(bucket['0-0']).toBeDefined();
    expect(Object.values(bucket).filter((message) => message.channelIndex === 0)).toHaveLength(100);
    expect(bucket.live).toBeDefined();
  });
});

describe('messageStore live trim keeps sending rows', () => {
  const TRIM_ID = 'identity-trim-sending';

  beforeEach(() => {
    useMessageStore.setState({ messages: {} });
    vi.spyOn(meshtasticMessageLoadLimit, 'getMeshtasticMessageLoadLimit').mockReturnValue(2);
    addIdentity({
      id: TRIM_ID,
      protocol: { type: 'meshtastic' } as unknown as Protocol,
      signature: '',
      transports: [],
      createdAt: 0,
      lastSeenAt: 0,
    });
  });

  afterEach(() => {
    removeIdentity(TRIM_ID);
    vi.restoreAllMocks();
  });

  it('does not evict a sending row when a newer message arrives', () => {
    addMessage(TRIM_ID, { ...sampleRecord('old'), timestamp: 1, status: 'sending' });
    addMessage(TRIM_ID, { ...sampleRecord('mid'), timestamp: 2 });
    addMessage(TRIM_ID, { ...sampleRecord('new'), timestamp: 3 });
    const bucket = useMessageStore.getState().messages[TRIM_ID] ?? {};
    expect(bucket.old?.status).toBe('sending');
    expect(bucket.new).toBeDefined();
    expect(bucket.mid).toBeUndefined();
  });

  it('emits added only when the inserted id remains', () => {
    addMessage(TRIM_ID, { ...sampleRecord('a'), timestamp: 2 });
    addMessage(TRIM_ID, { ...sampleRecord('b'), timestamp: 3 });
    const events: MessageStoreEvent[] = [];
    const unsubscribe = subscribeMessageStoreEvents((event) => {
      events.push(event);
    });
    addMessage(TRIM_ID, { ...sampleRecord('ancient'), timestamp: 1 });
    unsubscribe();
    expect(useMessageStore.getState().messages[TRIM_ID]?.ancient).toBeUndefined();
    expect(events.filter((event) => event.type === 'added')).toEqual([]);
  });
});

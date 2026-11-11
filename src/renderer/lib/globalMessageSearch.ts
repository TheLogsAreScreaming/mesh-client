import type { MeshProtocol } from '@/shared/meshProtocol';

import type { ChatMessage } from './types';

/** Cap per protocol so a single query stays responsive. */
export const GLOBAL_MESSAGE_SEARCH_LIMIT = 50;

export type GlobalMessageSearchProtocolFilter = MeshProtocol | 'all';

export type GlobalMessageSearchDirection = 'all' | 'inbound' | 'outbound';

export interface GlobalMessageSearchFilters {
  protocol: GlobalMessageSearchProtocolFilter;
  /** Empty = all conversations. Channel index as string, or `dm:<peerId>`. */
  conversation?: string;
  senderQuery?: string;
  /** Inclusive start (ms). */
  fromTs?: number;
  /** Inclusive end (ms). */
  toTs?: number;
  direction?: GlobalMessageSearchDirection;
  /**
   * Own LoRa node ids keyed by protocol. Meshtastic and MeshCore must stay separate so an id
   * owned on one protocol cannot skew DM peer / direction classification on the other.
   */
  ownNodeIdsByProtocol?: Partial<Record<'meshtastic' | 'meshcore', ReadonlySet<number>>>;
}

export interface GlobalMessageSearchHit {
  protocol: MeshProtocol;
  /** Database row id when available. */
  dbId: number | null;
  timestamp: number;
  senderId: number | null;
  senderName: string;
  payload: string;
  /** Channel index for broadcast; null for DM. */
  channel: number | null;
  /** LoRa DM peer node id. */
  dmPeer: number | null;
  /** LoRa DM recipient (`to_node`). Kept so an inbound row still names our node. */
  toNode?: number | null;
  packetId: number | null;
}

interface MeshtasticSearchRow {
  id?: number;
  sender_id?: number;
  sender_name?: string | null;
  payload?: string;
  channel?: number;
  timestamp?: number;
  to_node?: number | null;
  to?: number | null;
  packetId?: number | null;
  packet_id?: number | null;
}

interface MeshcoreSearchRow {
  id?: number;
  sender_id?: number;
  sender_name?: string | null;
  payload?: string;
  channel_idx?: number;
  timestamp?: number;
  to_node?: number | null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  return '';
}

/** DM counterparty: `to` only when we sent the row; otherwise the sender is the peer. */
export function resolveLoRaDmPeer(
  senderId: number | null,
  toNode: number | null,
  ownNodeIds?: ReadonlySet<number>,
): number | null {
  if (senderId != null && ownNodeIds?.has(senderId >>> 0)) return toNode;
  return senderId;
}

export function normalizeMeshtasticSearchRow(
  row: MeshtasticSearchRow,
  ownNodeIds?: ReadonlySet<number>,
): GlobalMessageSearchHit {
  const to = asNumber(row.to_node ?? row.to);
  const senderId = asNumber(row.sender_id);
  const channel = asNumber(row.channel) ?? 0;
  const isDm = to != null && to !== 0xffffffff && to !== 0;
  return {
    protocol: 'meshtastic',
    dbId: asNumber(row.id),
    timestamp: asNumber(row.timestamp) ?? 0,
    senderId,
    senderName: asString(row.sender_name),
    payload: asString(row.payload),
    channel: isDm ? null : channel,
    dmPeer: isDm ? resolveLoRaDmPeer(senderId, to, ownNodeIds) : null,
    toNode: isDm ? to : null,
    packetId: asNumber(row.packetId ?? row.packet_id),
  };
}

export function normalizeMeshcoreSearchRow(
  row: MeshcoreSearchRow,
  ownNodeIds?: ReadonlySet<number>,
): GlobalMessageSearchHit {
  const channelIdx = asNumber(row.channel_idx) ?? 0;
  const to = asNumber(row.to_node);
  const senderId = asNumber(row.sender_id);
  const isDm = channelIdx === -1;
  return {
    protocol: 'meshcore',
    dbId: asNumber(row.id),
    timestamp: asNumber(row.timestamp) ?? 0,
    senderId,
    senderName: asString(row.sender_name),
    payload: asString(row.payload),
    channel: isDm ? null : channelIdx,
    dmPeer: isDm ? resolveLoRaDmPeer(senderId, to, ownNodeIds) : null,
    toNode: isDm ? to : null,
    packetId: null,
  };
}

function matchesSender(hit: GlobalMessageSearchHit, senderQuery: string | undefined): boolean {
  const q = senderQuery?.trim().toLowerCase();
  if (!q) return true;
  if (hit.senderName.toLowerCase().includes(q)) return true;
  if (hit.senderId != null && String(hit.senderId).includes(q)) return true;
  return false;
}

function matchesConversation(
  hit: GlobalMessageSearchHit,
  conversation: string | undefined,
): boolean {
  const c = conversation?.trim();
  if (!c) return true;
  if (c.startsWith('dm:')) {
    const peer = c.slice(3);
    if (hit.dmPeer != null && String(hit.dmPeer) === peer) return true;
    return false;
  }
  const channel = Number(c);
  return hit.channel != null && hit.channel === channel;
}

function matchesDirection(
  hit: GlobalMessageSearchHit,
  filters: GlobalMessageSearchFilters,
): boolean {
  const direction = filters.direction ?? 'all';
  if (direction === 'all') return true;
  // Use the hit protocol's own set only.
  const own = filters.ownNodeIdsByProtocol?.[hit.protocol];
  // Protocol-scoped own set only — missing/empty means we cannot classify this hit.
  if (!own || own.size === 0) return false;
  const fromOwn = hit.senderId != null && own.has(hit.senderId >>> 0);
  if (direction === 'outbound') return fromOwn;
  return !fromOwn;
}

export function filterGlobalMessageSearchHits(
  hits: readonly GlobalMessageSearchHit[],
  filters: GlobalMessageSearchFilters,
): GlobalMessageSearchHit[] {
  const fromTs = filters.fromTs;
  const toTs = filters.toTs;
  return hits.filter((hit) => {
    if (filters.protocol !== 'all' && hit.protocol !== filters.protocol) return false;
    if (fromTs != null && hit.timestamp < fromTs) return false;
    if (toTs != null && hit.timestamp > toTs) return false;
    if (!matchesSender(hit, filters.senderQuery)) return false;
    if (!matchesConversation(hit, filters.conversation)) return false;
    if (!matchesDirection(hit, filters)) return false;
    return true;
  });
}

export interface GlobalMessageSearchApi {
  searchMessages: (query: string, limit?: number) => Promise<unknown[]>;
  searchMeshcoreMessages: (query: string, limit?: number) => Promise<unknown[]>;
}

/**
 * Run FTS across enabled protocols and return filtered, timestamp-desc hits.
 */
export async function runGlobalMessageSearch(opts: {
  query: string;
  filters: GlobalMessageSearchFilters;
  api: GlobalMessageSearchApi;
  enabledProtocols: readonly MeshProtocol[];
  limitPerProtocol?: number;
}): Promise<GlobalMessageSearchHit[]> {
  const q = opts.query.trim();
  if (!q) return [];
  const limit = opts.limitPerProtocol ?? GLOBAL_MESSAGE_SEARCH_LIMIT;
  const want = (p: MeshProtocol) =>
    opts.enabledProtocols.includes(p) &&
    (opts.filters.protocol === 'all' || opts.filters.protocol === p);

  const tasks: Promise<GlobalMessageSearchHit[]>[] = [];
  if (want('meshtastic')) {
    const own = opts.filters.ownNodeIdsByProtocol?.meshtastic;
    tasks.push(
      opts.api
        .searchMessages(q, limit)
        .then((rows) =>
          (rows as MeshtasticSearchRow[]).map((row) => normalizeMeshtasticSearchRow(row, own)),
        ),
    );
  }
  if (want('meshcore')) {
    const own = opts.filters.ownNodeIdsByProtocol?.meshcore;
    tasks.push(
      opts.api
        .searchMeshcoreMessages(q, limit)
        .then((rows) =>
          (rows as MeshcoreSearchRow[]).map((row) => normalizeMeshcoreSearchRow(row, own)),
        ),
    );
  }


  const nested = await Promise.all(tasks);
  const merged = nested.flat();
  const filtered = filterGlobalMessageSearchHits(merged, opts.filters);
  filtered.sort((a, b) => b.timestamp - a.timestamp);
  return filtered.slice(0, limit * 3);
}

/** Pending ChatPanel focus after opening a search hit. */
export interface PendingMessageFocus {
  timestamp: number;
  packetId?: number | null;
  dbId?: number | null;
  /** Highlight query for in-bubble mark tags. The dialog query, never a payload prefix. */
  highlightQuery?: string;
  /** Row to insert when the open thread does not already contain the hit. */
  focusRow?: ChatMessage;
  /** Protocol the focus belongs to, so a panel can keep the row after focus is consumed. */
  protocol?: MeshProtocol;
}

/** Build a chat row from a search/inbox hit so the open thread can show it. */
export function chatMessageFromSearchHit(hit: GlobalMessageSearchHit): ChatMessage {
  const dm = hit.channel == null;
  const senderId = hit.senderId ?? hit.dmPeer ?? 0;
  const inbound = hit.dmPeer != null && hit.senderId != null && hit.senderId === hit.dmPeer;
  const to = !dm
    ? undefined
    : inbound
      ? hit.toNode != null && hit.toNode !== 0
        ? hit.toNode
        : undefined
      : (hit.dmPeer ?? undefined);
  return {
    id: hit.dbId ?? undefined,
    sender_id: senderId,
    sender_name: hit.senderName,
    payload: hit.payload,
    channel: dm ? (hit.protocol === 'meshcore' ? -1 : 0) : (hit.channel ?? 0),
    to,
    timestamp: hit.timestamp,
    packetId: hit.packetId ?? undefined,
    status: 'acked',
  };
}

/** Prepend nothing: append the focus row only when the thread does not already contain it. */
export function withFocusRowLoaded<
  T extends {
    id?: number;
    timestamp: number;
    packetId?: number;
  },
>(messages: readonly T[], focus: PendingMessageFocus | null | undefined): readonly T[] {
  if (!focus?.focusRow) return messages;
  if (findMessageIndexForFocus(messages, focus) >= 0) return messages;
  return [...messages, focus.focusRow as unknown as T];
}

export function findMessageIndexForFocus(
  messages: readonly {
    id?: number;
    timestamp: number;
    packetId?: number;
  }[],
  focus: PendingMessageFocus,
): number {
  if (focus.packetId != null) {
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].packetId === focus.packetId) return i;
    }
  }
  if (focus.dbId != null) {
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].id === focus.dbId) return i;
    }
  }
  const hasStableId = focus.packetId != null || focus.dbId != null;
  if (!hasStableId) {
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].timestamp === focus.timestamp) return i;
    }
  }
  return -1;
}

/** Ctrl/Cmd+Shift+F — global message search (not the launcher). */
export function isGlobalMessageSearchShortcut(e: KeyboardEvent, platform: string): boolean {
  const mod = platform === 'darwin' ? e.metaKey : e.ctrlKey;
  return mod && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'f';
}

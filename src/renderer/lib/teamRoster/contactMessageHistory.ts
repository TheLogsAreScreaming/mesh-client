import type { ChatMessage } from '@/renderer/lib/types';
import type { MeshProtocol } from '@/shared/meshProtocol';
import type { TeamMemberLink } from '@/shared/teamRosterTypes';

import type { LinkPresenceSnapshot } from './contactPresence';

export const CONTACT_MESSAGE_HISTORY_LIMIT = 200;

const LORA_BROADCAST = 0xffffffff;

export interface ContactTimelineItem {
  key: string;
  protocol: MeshProtocol;
  message: ChatMessage;
  isDirectMessage: boolean;
  /** Peer node id for Jump to Chat. */
  dmPeer: number | null;
  reticulumPeerHash: string | null;
  channel: number | null;
}

export type MessagesByProtocol = Readonly<Record<MeshProtocol, readonly ChatMessage[]>>;

/** Whether a chat row is a direct message for the given protocol. */
function isDirect(protocol: MeshProtocol, msg: ChatMessage): boolean {
  return msg.to != null && msg.to !== 0 && msg.to !== LORA_BROADCAST;
}

/** Stable timeline key for a protocol message row. */
function messageKey(protocol: MeshProtocol, msg: ChatMessage): string {
  const id = msg.id != null ? String(msg.id) : `${msg.timestamp}-${msg.packetId ?? 'x'}`;
  return `${protocol}:${id}`;
}

interface PeerFilter {
  protocol: MeshProtocol;
  nodeIds: Set<number>;
}

/** Build per-protocol peer match sets from presence snapshots. */
function buildPeerFilters(snaps: readonly LinkPresenceSnapshot[]): PeerFilter[] {
  const byProtocol = new Map<MeshProtocol, PeerFilter>();
  for (const snap of snaps) {
    let filter = byProtocol.get(snap.link.protocol);
    if (!filter) {
      filter = {
        protocol: snap.link.protocol,
        nodeIds: new Set(),
      };
      byProtocol.set(snap.link.protocol, filter);
    }
    if (snap.peerNodeId != null) filter.nodeIds.add(snap.peerNodeId >>> 0);
    // MeshCore pubkey-only link without resolved node: still match durable decimal if present.
    if (/^\d+$/.test(snap.link.durableKey)) {
      filter.nodeIds.add(Number.parseInt(snap.link.durableKey, 10) >>> 0);
    }
  }
  return [...byProtocol.values()];
}

/** True when a message involves any peer in the filter. */
function messageTouchesPeer(protocol: MeshProtocol, msg: ChatMessage, filter: PeerFilter): boolean {
  if (filter.nodeIds.has(msg.sender_id >>> 0)) return true;
  if (msg.to != null && filter.nodeIds.has(msg.to >>> 0)) return true;
  return false;
}

/**
 * Merge in-memory chat rows that involve any of the contact's linked peers.
 * Newest first; capped for UI.
 */
export function buildContactMessageTimeline(
  snaps: readonly LinkPresenceSnapshot[],
  messagesByProtocol: MessagesByProtocol,
  limit = CONTACT_MESSAGE_HISTORY_LIMIT,
): ContactTimelineItem[] {
  const filters = buildPeerFilters(snaps);
  if (filters.length === 0) return [];
  const items: ContactTimelineItem[] = [];

  for (const filter of filters) {
    const messages = messagesByProtocol[filter.protocol];
    for (const msg of messages) {
      if (!msg.payload) continue;
      if (msg.emoji && msg.replyId != null) continue;
      if (!messageTouchesPeer(filter.protocol, msg, filter)) continue;
      const direct = isDirect(filter.protocol, msg);
      let dmPeer: number | null = null;
      const reticulumPeerHash: string | null = null;
      let channel: number | null = null;
      if (direct) {
        dmPeer = filter.nodeIds.has(msg.sender_id >>> 0) ? msg.sender_id : (msg.to ?? null);
      } else {
        channel = msg.channel;
      }
      items.push({
        key: messageKey(filter.protocol, msg),
        protocol: filter.protocol,
        message: msg,
        isDirectMessage: direct,
        dmPeer,
        reticulumPeerHash,
        channel,
      });
    }
  }

  items.sort((a, b) => b.message.timestamp - a.message.timestamp);
  return items.slice(0, limit);
}

/** Resolve a DM peer node id for Jump / Message from a presence snapshot. */
/** Resolve a DM peer node id from a presence snapshot. */
export function dmPeerFromPresence(snap: LinkPresenceSnapshot): number | null {
  return snap.peerNodeId;
}

/** Hash-addressed peer for a link; no protocol in this build addresses peers by hash. */
export function reticulumHashFromLink(_link: TeamMemberLink): string | null {
  return null;
}

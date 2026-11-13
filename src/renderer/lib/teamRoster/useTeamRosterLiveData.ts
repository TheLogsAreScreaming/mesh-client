import { useMemo } from 'react';

import { getIdentityIdForProtocol } from '@/renderer/lib/identityByProtocol';
import { getOfflineIdentityIdForProtocol } from '@/renderer/lib/offlineProtocolIdentities';
import type { MeshNode } from '@/renderer/lib/types';
import { type NodeRecord, useNodeStore } from '@/renderer/stores/nodeStore';
import type { MeshProtocol } from '@/shared/meshProtocol';

import type { NodesByProtocol } from './contactPresence';

type NodeBuckets = Readonly<Record<string, Readonly<Record<string, NodeRecord>>>>;

/** Select the live node Map for a LoRa protocol identity. */
function nodesMapForProtocol(
  protocol: MeshProtocol,
  nodeBuckets: NodeBuckets,
): Map<number, MeshNode> {
  const identityId =
    getIdentityIdForProtocol(protocol) ?? getOfflineIdentityIdForProtocol(protocol);
  const byId = nodeBuckets[identityId] ?? {};
  const map = new Map<number, MeshNode>();
  for (const [idStr, rec] of Object.entries(byId)) {
    const nodeId = Number(idStr);
    if (!Number.isFinite(nodeId)) continue;
    map.set(nodeId >>> 0, {
      node_id: nodeId >>> 0,
      long_name: rec.longName ?? '',
      short_name: rec.shortName ?? '',
      hw_model: rec.hwModel ?? '',
      snr: rec.snr ?? 0,
      battery: rec.batteryLevel ?? 0,
      last_heard: rec.lastHeardAt ?? 0,
      latitude: rec.latitude ?? null,
      longitude: rec.longitude ?? null,
      public_key_hex: rec.publicKeyHex,
    });
  }
  return map;
}

/** Retained for the presence API; no protocol in this build reports peers by hash. */
const NO_HASH_PEERS: ReadonlyMap<string, { lastHeardMs: number; displayName?: string | null }> =
  new Map();

/** Subscribe to live node maps used by roster presence. */
export function useTeamRosterLiveData(): {
  nodesByProtocol: NodesByProtocol;
  reticulumByHash: ReadonlyMap<string, { lastHeardMs: number; displayName?: string | null }>;
} {
  const nodeBuckets = useNodeStore((s) => s.nodes);
  return useMemo(() => {
    const nodesByProtocol: NodesByProtocol = {
      meshtastic: nodesMapForProtocol('meshtastic', nodeBuckets),
      meshcore: nodesMapForProtocol('meshcore', nodeBuckets),
    };
    return { nodesByProtocol, reticulumByHash: NO_HASH_PEERS };
  }, [nodeBuckets]);
}

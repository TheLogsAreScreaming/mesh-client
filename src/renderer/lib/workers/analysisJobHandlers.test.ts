import { describe, expect, it } from 'vitest';

import { workerBudget } from './analysisWorkerPool';
import { runDiagnosticsAnalyzeBatchInline } from './runDiagnosticsAnalyzeBatch';
import { isAllowedWorkerMessageOrigin } from './workerOrigins';

describe('analysisJobHandlers', () => {
  it('analyzes a diagnostics batch and clears clean nodes', () => {
    const baseNode = {
      long_name: 'N',
      short_name: 'N',
      hw_model: 'TEST',
      snr: 0,
      battery: 100,
      last_heard: Date.now(),
      latitude: null as number | null,
      longitude: null as number | null,
    };
    const result = runDiagnosticsAnalyzeBatchInline({
      homeNode: { ...baseNode, node_id: 1, hops_away: 0 },
      distanceMultiplier: 1,
      distanceOffsetKm: 0,
      hopsThreshold: 2,
      capabilities: {
        protocol: 'meshtastic',
        hasHopCount: true,
        hasDistanceBasedHopAnomalies: true,
        hasPerHopSnr: false,
      } as const,
      nodes: [
        {
          nodeId: 2,
          node: {
            ...baseNode,
            node_id: 2,
            hops_away: 0,
            latitude: 40,
            longitude: -105,
          },
          hopHistory: [],
          ignoreMqtt: false,
        },
      ],
    });
    expect(result.clearedNodeIds.length + result.anomalies.size).toBe(1);
  });
});

describe('analysisWorkerPool', () => {
  it('sizes worker budget with UI/Catch-up headroom', () => {
    expect(workerBudget(1)).toBe(0);
    expect(workerBudget(2)).toBe(0);
    expect(workerBudget(8)).toBe(2);
    expect(workerBudget(4, 1)).toBe(1);
  });
});

describe('workerOrigins', () => {
  it('accepts allowlisted and empty Chromium dedicated-worker origins', () => {
    expect(isAllowedWorkerMessageOrigin('mesh-client://renderer', 'mesh-client://renderer')).toBe(
      true,
    );
    expect(isAllowedWorkerMessageOrigin('', 'mesh-client://renderer')).toBe(true);
    expect(isAllowedWorkerMessageOrigin('https://evil.example', 'mesh-client://renderer')).toBe(
      false,
    );
  });
});

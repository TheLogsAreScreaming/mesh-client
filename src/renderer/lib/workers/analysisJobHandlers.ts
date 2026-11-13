import { analyzeNode } from '../diagnostics/RoutingDiagnosticEngine';
import type { ProtocolCapabilities } from '../radio/BaseRadioProvider';
import type {
  AnalysisJobRequest,
  AnalysisJobResult,
  DiagnosticsAnalyzeBatchRequest,
} from './analysisJobTypes';

export function runDiagnosticsAnalyzeBatchJob(
  request: DiagnosticsAnalyzeBatchRequest,
): AnalysisJobResult {
  const anomalies: { nodeId: number; anomaly: NonNullable<ReturnType<typeof analyzeNode>> }[] = [];
  const clearedNodeIds: number[] = [];
  for (const row of request.nodes) {
    const anomaly = analyzeNode(
      row.node,
      row.stats,
      request.homeNode,
      row.hopHistory,
      row.ignoreMqtt,
      request.distanceMultiplier,
      request.distanceOffsetKm,
      request.hopsThreshold,
      request.capabilities as ProtocolCapabilities | undefined,
      row.noiseStats,
      row.tracePathSnrs,
      row.pathUpdatedTimestamps,
    );
    if (anomaly) anomalies.push({ nodeId: row.nodeId, anomaly });
    else clearedNodeIds.push(row.nodeId);
  }
  return {
    kind: 'diagnosticsAnalyzeBatch',
    sequence: request.sequence,
    anomalies,
    clearedNodeIds,
  };
}

export function runAnalysisJob(request: AnalysisJobRequest): AnalysisJobResult {
  return runDiagnosticsAnalyzeBatchJob(request);
}

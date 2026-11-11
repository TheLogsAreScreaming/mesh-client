import type { NoiseStats } from '../diagnostics/RoutingDiagnosticEngine';
import type { ProtocolCapabilities } from '../radio/BaseRadioProvider';
import type { HopHistoryPoint, MeshNode, NodeAnomaly } from '../types';

export type AnalysisJobKind = 'diagnosticsAnalyzeBatch';

export interface DiagnosticsAnalyzeNodeInput {
  nodeId: number;
  node: MeshNode;
  stats?: { total: number; duplicates: number };
  hopHistory: HopHistoryPoint[];
  ignoreMqtt: boolean;
  noiseStats?: NoiseStats | null;
  tracePathSnrs?: number[];
  pathUpdatedTimestamps?: number[];
}

export interface DiagnosticsAnalyzeBatchRequest {
  kind: 'diagnosticsAnalyzeBatch';
  sequence: number;
  homeNode: MeshNode | null;
  distanceMultiplier: number;
  distanceOffsetKm: number;
  hopsThreshold: number;
  /** Narrow capabilities fields used by analyzeNode (avoid non-cloneable provider fields). */
  capabilities?: Pick<
    ProtocolCapabilities,
    'hasHopCount' | 'hasDistanceBasedHopAnomalies' | 'hasPerHopSnr' | 'protocol'
  >;
  nodes: DiagnosticsAnalyzeNodeInput[];
}

export interface DiagnosticsAnalyzeBatchResult {
  kind: 'diagnosticsAnalyzeBatch';
  sequence: number;
  /** nodeId → anomaly JSON (null entries omitted). */
  anomalies: { nodeId: number; anomaly: NodeAnomaly }[];
  clearedNodeIds: number[];
}

export type AnalysisJobRequest = DiagnosticsAnalyzeBatchRequest;
export type AnalysisJobResult = DiagnosticsAnalyzeBatchResult;

export interface AnalysisJobError {
  kind: 'error';
  sequence: number;
  requestKind: AnalysisJobKind;
  error: string;
}

export type AnalysisWorkerInbound = AnalysisJobRequest;
export type AnalysisWorkerOutbound = AnalysisJobResult | AnalysisJobError;

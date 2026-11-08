export const DIAGNOSTICS_CATEGORY_STYLES: Record<string, string> = {
  Configuration: 'bg-info-500/20 text-info-400 border border-info-500/30',
  Physical: 'bg-warning-500/20 text-warning-400 border border-warning-500/30',
  Hardware: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  Software: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
};

export const DIAGNOSTICS_SEVERITY_HEADER: Record<string, string> = {
  error: 'bg-danger-950/40 text-danger-400',
  warning: 'bg-warning-950/20 text-warning-400',
  info: 'bg-info-950/20 text-info-400',
};

export const DIAGNOSTICS_SEVERITY_TEXT: Record<string, string> = {
  error: 'text-danger-400',
  warning: 'text-warning-400',
  info: 'text-info-400',
};

export function reticulumMeshHealthBand(
  errorCount: number,
  warningCount: number,
): {
  labelKey: string;
  bg: string;
  textColor: string;
} {
  if (errorCount > 0) {
    return {
      labelKey: 'diagnosticsPanel.meshHealthDegraded',
      bg: 'bg-danger-500/10 border-danger-500/30',
      textColor: 'text-danger-400',
    };
  }
  if (warningCount > 0) {
    return {
      labelKey: 'diagnosticsPanel.meshHealthAttention',
      bg: 'bg-warning-500/10 border-warning-500/30',
      textColor: 'text-warning-400',
    };
  }
  return {
    labelKey: 'diagnosticsPanel.meshHealthHealthy',
    bg: 'bg-success-500/10 border-success-500/30',
    textColor: 'text-success-400',
  };
}

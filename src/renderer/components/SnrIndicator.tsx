import { type ChartPalette, useChartPalette } from '@/renderer/lib/chartPalette';

const BAR_HEIGHTS = [3, 6, 9];

function snrLevel(
  snr: number,
  chart: ChartPalette,
): { level: number; color: string; textClass: string } {
  if (snr >= 5) return { level: 3, color: chart.green400, textClass: 'text-success-400' };
  if (snr >= 0) return { level: 2, color: chart.yellow400, textClass: 'text-yellow-400' };
  return { level: 1, color: chart.red400, textClass: 'text-danger-400' };
}

interface Props {
  snr: number;
  className?: string;
}

export default function SnrIndicator({ snr, className }: Props) {
  const chart = useChartPalette();
  const { level, color, textClass } = snrLevel(snr, chart);
  return (
    <span className={`inline-flex items-center gap-1 font-mono ${textClass} ${className ?? ''}`}>
      <svg viewBox="0 0 12 9" width="12" height="9">
        {BAR_HEIGHTS.map((h, i) => (
          <rect
            key={i}
            x={i * 4}
            y={9 - h}
            width="3"
            height={h}
            fill={i < level ? color : chart.grid}
            rx="0.5"
          />
        ))}
      </svg>
      {snr > 0 ? '+' : ''}
      {snr.toFixed(1)} dB
    </span>
  );
}

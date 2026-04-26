import { memo } from 'react';

interface SegmentPanelProps {
  segmentBests: number[];
  segmentLapTimes: number[];
  segmentComparisonBests: number[];
  currentSegmentIndex: number;
  segmentElapsed: number;
}

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  const frac = Math.floor((ms % 1000) / 10);
  return `${s}.${frac.toString().padStart(2, '0')}`;
}

function SegmentPanelInner({
  segmentBests,
  segmentLapTimes,
  segmentComparisonBests,
  currentSegmentIndex,
  segmentElapsed,
}: SegmentPanelProps) {
  const count = segmentBests.length;
  if (count === 0) return null;

  return (
    <div className="hud-segment-panel">
      <div className="segment-panel-header">SEGMENTS</div>
      {Array.from({ length: count }, (_, i) => {
        const isActive = i === currentSegmentIndex;
        const lapTime = segmentLapTimes[i];
        const prevBest = segmentComparisonBests[i];
        const isDone = lapTime > 0;

        let timeStr: string;
        let color: string;

        if (isActive) {
          timeStr = fmt(segmentElapsed);
          color = '#fff8ec';
        } else if (isDone) {
          // First time ever (prevBest === 0) → white; faster → green; slower → red
          if (prevBest === 0) {
            color = '#fff8ec';
          } else if (lapTime < prevBest) {
            color = '#5db345';
          } else {
            color = '#e84040';
          }
          timeStr = fmt(lapTime);
        } else {
          timeStr = '--:--';
          color = 'rgba(255, 248, 236, 0.3)';
        }

        return (
          <div key={i} className="segment-row">
            <span className="segment-label">S{i + 1}</span>
            <span className="segment-time" style={{ color }}>{timeStr}</span>
          </div>
        );
      })}
    </div>
  );
}

export const SegmentPanel = memo(SegmentPanelInner);

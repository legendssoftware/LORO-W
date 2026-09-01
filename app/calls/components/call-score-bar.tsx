'use client';

import { cn } from '@/lib/utils';
import { getScoreColorClasses } from '../lib/score-colors';

type CallScoreBarProps = {
  value: number;
  className?: string;
};

/** Single-segment progress bar with red/amber/green fill based on 0–100 score. */
export function CallScoreBar({ value, className }: CallScoreBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const fillClass = getScoreColorClasses(clamped).bg;
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full transition-all', fillClass)}
        style={{ width: `${clamped}%`, minWidth: clamped > 0 ? 4 : 0 }}
      />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2Icon } from '@/lib/icons';

export interface AttendanceStatusButtonProps {
  checkedIn: boolean;
  loading: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
  /** When true, user is on break; show End My Break only. */
  onBreak?: boolean;
  onStartBreak?: () => void;
  onEndBreak?: () => void;
  /** For timer: shift start (work) or break start. Server format e.g. yyyy-MM-dd HH:mm:ss. */
  startTime?: string | null;
  breakStartTime?: string | null;
}

function formatElapsed(ms: number): string {
  if (!ms || ms < 0 || !Number.isFinite(ms)) return '00:00:00';
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
  ].join(':');
}

/** Shared button size: ~20% larger on md/lg. */
const actionButtonClass =
  'min-h-12 min-w-0 rounded-xl border-0 px-6 py-4 text-base font-semibold outline-none ring-0 sm:min-h-14 sm:px-6 sm:py-4 sm:text-lg md:min-h-[4.5rem] md:px-8 md:py-4 md:text-xl lg:min-h-20 lg:px-10 lg:py-5 lg:text-2xl focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0';

/**
 * Prominent attendance status: Start Shift / End My Break / Take A Break + End My Shift.
 * No red/orange container; status label and break counter under buttons.
 */
export function AttendanceStatusButton({
  checkedIn,
  onBreak = false,
  loading,
  onCheckIn,
  onCheckOut,
  onStartBreak,
  onEndBreak,
  startTime = null,
  breakStartTime = null,
}: AttendanceStatusButtonProps) {
  const [currentTimer, setCurrentTimer] = useState('00:00:00');

  useEffect(() => {
    if (!checkedIn) {
      setCurrentTimer('00:00:00');
      return;
    }
    const parseDate = (s: string | null | undefined): Date | null => {
      if (s == null || s === '') return null;
      const normalized =
        typeof s === 'string' && s.includes(' ') && !s.includes('T')
          ? s.replace(' ', 'T')
          : s;
      const d = new Date(normalized);
      return Number.isNaN(d.getTime()) ? null : d;
    };
    const interval = setInterval(() => {
      const now = Date.now();
      if (onBreak && breakStartTime) {
        const start = parseDate(breakStartTime);
        if (start) setCurrentTimer(formatElapsed(now - start.getTime()));
      } else if (!onBreak && startTime) {
        const start = parseDate(startTime);
        if (start) setCurrentTimer(formatElapsed(now - start.getTime()));
      } else {
        setCurrentTimer('00:00:00');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [checkedIn, onBreak, startTime, breakStartTime]);

  const showShiftTimer = checkedIn && !onBreak && startTime;
  const showBreakCounter = checkedIn && onBreak && breakStartTime;

  return (
    <div className="flex w-full flex-col items-center justify-center gap-4 px-2">
      {/* Shift elapsed timer at top (working state only) */}
      {showShiftTimer && (
        <div className="flex w-full max-w-md flex-col items-center gap-1">
          <span className="text-4xl font-semibold tabular-nums text-foreground">
            {currentTimer}
          </span>
        </div>
      )}

      <div className="flex w-full max-w-md flex-col gap-4">
        {!checkedIn && (
          <div className="flex w-full items-center justify-between gap-4 rounded-xl bg-green-600 p-8 text-white sm:p-6 md:p-8">
            <span className="text-base font-medium uppercase sm:text-lg md:text-xl">
              Ready to start
            </span>
            {loading ? (
              <Loader2Icon
                className="size-12 animate-spin text-white sm:size-14 md:size-16"
                aria-hidden
              />
            ) : (
              <Button
                variant="secondary"
                size="lg"
                className={`${actionButtonClass} bg-white text-green-700 hover:bg-white/90`}
                onClick={onCheckIn}
              >
                Start Shift
              </Button>
            )}
          </div>
        )}

        {checkedIn && onBreak && (
          <div className="flex w-full flex-col items-center gap-3">
            {loading ? (
              <div className="flex min-h-[4.5rem] w-full items-center justify-center rounded-xl md:min-h-20">
                <Loader2Icon
                  className="size-12 animate-spin text-muted-foreground sm:size-14 md:size-16"
                  aria-hidden
                />
              </div>
            ) : (
              <Button
                variant="secondary"
                size="lg"
                className={`w-full ${actionButtonClass} bg-amber-500 text-white hover:bg-amber-600`}
                onClick={() => onEndBreak?.()}
              >
                End My Break
              </Button>
            )}
            {showBreakCounter && (
              <div className="flex w-full flex-col items-center gap-1">
                <span className="text-2xl font-semibold tabular-nums text-foreground md:text-3xl">
                  {currentTimer}
                </span>
                <span className="text-xs uppercase text-muted-foreground">
                  On A Break
                </span>
              </div>
            )}
          </div>
        )}

        {checkedIn && !onBreak && (
          <div className="flex w-full flex-col gap-3">
            {loading ? (
              <div className="flex min-h-[4.5rem] w-full items-center justify-center rounded-xl md:min-h-20">
                <Loader2Icon
                  className="size-12 animate-spin text-muted-foreground sm:size-14 md:size-16"
                  aria-hidden
                />
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  size="lg"
                  className={`w-full flex-1 ${actionButtonClass} min-w-0 basis-full bg-amber-500 text-white hover:bg-amber-600 sm:basis-0`}
                  onClick={() => onStartBreak?.()}
                >
                  Take A Break
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className={`w-full flex-1 ${actionButtonClass} min-w-0 basis-full bg-destructive text-white hover:bg-destructive/90 sm:basis-0`}
                  onClick={onCheckOut}
                >
                  End My Shift
                </Button>
              </div>
            )}
            <span className="text-center text-xs uppercase text-muted-foreground">
              Currently Working
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

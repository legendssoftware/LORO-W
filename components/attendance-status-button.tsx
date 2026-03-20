'use client';

import { useEffect, useState } from 'react';
import { Home, Laptop, MapPin, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2Icon } from '@/lib/icons';
import type { AttCheckInContext, ClockInOptionKey } from '@/api/types/attendance';
import { OPTION_KEY_TO_LABEL } from '@/lib/clock-in-options';

export interface AttendanceStatusButtonProps {
  checkedIn: boolean;
  loading: boolean;
  /** Legacy single Start Shift (used if onClockInWithNote is omitted). */
  onCheckIn?: () => void;
  /**
   * Clock-in with a note label (At office, Work from Home, etc.). When set, uses server-driven options when possible.
   */
  onClockInWithNote?: (note: string) => void | Promise<void>;
  /** From GET /att/status?lat=&lng= — which start options to show */
  clockInContext?: AttCheckInContext | null;
  /** While fetching location + status for clock-in context */
  clockInContextLoading?: boolean;
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

/** Solo at-office Start Shift — roughly 2x the primary action scale. */
const soloStartShiftButtonClass =
  'min-h-24 min-w-0 rounded-2xl border-0 px-10 py-8 text-xl font-semibold outline-none ring-0 sm:min-h-28 sm:px-12 sm:py-9 sm:text-2xl md:min-h-[9rem] md:px-16 md:py-10 md:text-3xl lg:min-h-[10rem] lg:px-20 lg:py-12 lg:text-4xl focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0';

const defaultBranchRadiusMetersFallback = 50;

function isAtOfficeOnlyMode(ctx: AttCheckInContext | null | undefined): boolean {
  if (!ctx?.availableClockInOptions?.length) return true;
  return ctx.availableClockInOptions.length === 1 && ctx.availableClockInOptions[0] === 'at_office';
}

function startOptionIcon(key: ClockInOptionKey) {
  const iconClass = 'size-5 shrink-0 text-white sm:size-6';
  switch (key) {
    case 'starting_from_home':
      return <Home className={iconClass} aria-hidden />;
    case 'work_from_home':
      return <Laptop className={iconClass} aria-hidden />;
    case 'offsite':
      return <MapPin className={iconClass} aria-hidden />;
    default:
      return <Play className={iconClass} aria-hidden />;
  }
}

/**
 * Prominent attendance status: Start Shift / End My Break / Take A Break + End My Shift.
 * No red/orange container; status label and break counter under buttons.
 */
export function AttendanceStatusButton({
  checkedIn,
  onBreak = false,
  loading,
  onCheckIn,
  onClockInWithNote,
  clockInContext = null,
  clockInContextLoading = false,
  onCheckOut,
  onStartBreak,
  onEndBreak,
  startTime = null,
  breakStartTime = null,
}: AttendanceStatusButtonProps) {
  const [currentTimer, setCurrentTimer] = useState('00:00:00');
  const [remoteModalOpen, setRemoteModalOpen] = useState(false);

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

  const atOfficeOnly = isAtOfficeOnlyMode(clockInContext);
  const remoteKeys =
    clockInContext?.availableClockInOptions?.filter((k) => k !== 'at_office') ?? [];

  const renderRemoteOptionButton = (key: ClockInOptionKey, fullWidth = true) => {
    const label = OPTION_KEY_TO_LABEL[key];
    return (
      <Button
        key={key}
        type="button"
        variant="secondary"
        size="lg"
        className={`${actionButtonClass} ${fullWidth ? 'w-full' : ''} flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700`}
        onClick={() => {
          void onClockInWithNote?.(label);
          setRemoteModalOpen(false);
        }}
      >
        {startOptionIcon(key)}
        {label}
      </Button>
    );
  };

  const remoteGrid = (
    <div className="flex w-full flex-col gap-2">
      {remoteKeys.map((key) => renderRemoteOptionButton(key))}
    </div>
  );

  return (
    <div className="flex w-full flex-col items-center justify-center gap-4 px-2">
      {showShiftTimer && (
        <div className="flex w-full max-w-md flex-col items-center gap-1">
          <span className="text-4xl font-semibold tabular-nums text-foreground">
            {currentTimer}
          </span>
        </div>
      )}

      <div className="flex w-full max-w-md flex-col gap-4">
        {!checkedIn && (
          <div className="flex w-full flex-col gap-3">
            <span className="text-center text-base font-medium uppercase text-foreground sm:text-lg md:text-xl">
              {onClockInWithNote ? 'Start your shift' : 'Ready to start'}
            </span>
            {loading || clockInContextLoading ? (
              <div className="flex justify-center py-6">
                <Loader2Icon
                  className="size-12 animate-spin text-muted-foreground sm:size-14 md:size-16"
                  aria-hidden
                />
              </div>
            ) : onClockInWithNote ? (
              atOfficeOnly ? (
                <div className="flex justify-center">
                  <Button
                    variant="secondary"
                    size="lg"
                    className={`${soloStartShiftButtonClass} flex w-full max-w-xl items-center justify-center gap-3 bg-green-600 text-white hover:bg-green-700`}
                    onClick={() => void onClockInWithNote('At office')}
                  >
                    <Play className="size-10 shrink-0 text-white sm:size-12 md:size-14 lg:size-16" aria-hidden />
                    Start Shift
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-center text-sm text-muted-foreground">
                    You are more than {clockInContext?.radiusMeters ?? defaultBranchRadiusMetersFallback}m away from the office
                  </p>
                  {/* md+: inline options */}
                  <div className="hidden md:block">{remoteGrid}</div>
                  {/* Mobile: open modal */}
                  <div className="md:hidden">
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      className={`w-full ${actionButtonClass} flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700`}
                      onClick={() => setRemoteModalOpen(true)}
                    >
                      <Play className="size-5 text-white sm:size-6" aria-hidden />
                      Choose how you&apos;re starting
                    </Button>
                    <Dialog open={remoteModalOpen} onOpenChange={setRemoteModalOpen}>
                      <DialogContent className="max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Start your shift</DialogTitle>
                          <DialogDescription>
                            You are more than {clockInContext?.radiusMeters ?? defaultBranchRadiusMetersFallback}m away from the
                            office. Pick the option that applies.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col gap-2 pt-2">
                          {remoteKeys.map((key) => renderRemoteOptionButton(key))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </>
              )
            ) : onCheckIn ? (
              <div className="flex justify-center">
                <Button
                  variant="secondary"
                  size="lg"
                  className={`${actionButtonClass} flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700`}
                  onClick={onCheckIn}
                >
                  <Play className="size-5 text-white sm:size-6" aria-hidden />
                  Start Shift
                </Button>
              </div>
            ) : null}
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
                <span className="text-xs uppercase text-muted-foreground">On A Break</span>
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

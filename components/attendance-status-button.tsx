'use client';

import { useEffect, useRef, useState } from 'react';
import { Car, Home, Laptop, MapPin, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2Icon } from '@/lib/icons';
import type { AttCheckInContext, ClockInOptionKey } from '@/api/types/attendance';
import {
  CLOCK_IN_ADDITIONAL_NOTE_MAX_LENGTH,
  isAtOfficeOnlyContext,
  isLocationContextUnavailable,
  LOCATION_CONTEXT_UNAVAILABLE_MESSAGE,
  OPTION_KEY_TO_LABEL,
  OUTSIDE_BRANCH_RADIUS_MESSAGE_FALLBACK,
  remoteOptionKeysFromContext,
  type ClockInOptionLabel,
} from '@/lib/clock-in-options';
import { cn } from '@/lib/utils';

export interface AttendanceStatusButtonProps {
  checkedIn: boolean;
  loading: boolean;
  /** Legacy single Start Shift (used if onClockInWithNote is omitted). */
  onCheckIn?: () => void;
  /**
   * Clock-in with a mode label (At office, Working From Home, etc.) and optional user note.
   * When set, uses server-driven options when possible.
   */
  onClockInWithNote?: (modeLabel: string, additionalNote?: string) => void | Promise<void>;
  /** From GET /att/status?lat=&lng= — which start options to show */
  clockInContext?: AttCheckInContext | null;
  /** While fetching location + status for clock-in context */
  clockInContextLoading?: boolean;
  /** Retry fetching GET /att/status?lat=&lng= when location context is unavailable. */
  onRetryClockInContext?: () => void;
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

/** Shared button size; type and spacing scaled ~0.8× prior Tailwind steps (~20% smaller). */
const actionButtonClass =
  'min-h-[2.4rem] min-w-0 rounded-xl border-0 px-[1.2rem] py-[0.8rem] text-[0.8rem] font-semibold outline-none ring-0 sm:min-h-[2.8rem] sm:px-[1.2rem] sm:py-[0.8rem] sm:text-[0.9rem] md:min-h-[3.6rem] md:px-[1.6rem] md:py-[0.8rem] md:text-[1rem] lg:min-h-16 lg:px-8 lg:py-4 lg:text-[1.2rem] focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0';

/** Desktop/tablet inline remote options — compact md/lg (not oversized). */
const remoteClockInOptionClass =
  'min-h-[2.35rem] min-w-0 rounded-xl border-0 px-3 py-2 text-sm font-semibold outline-none ring-0 sm:min-h-10 sm:px-3.5 md:min-h-[2.5rem] md:px-4 md:py-2 md:text-sm lg:min-h-11 lg:px-4 lg:py-2.5 lg:text-base';

/** Mobile dialog only: full-width pill buttons, uppercase labels. */
const remoteClockInModalStackedClass =
  'min-h-12 w-full rounded-full border-0 px-4 py-3.5 text-sm font-semibold uppercase tracking-wide outline-none ring-0';

/** Solo at-office Start Shift — large primary action, scaled ~0.8× prior steps. */
const soloStartShiftButtonClass =
  'min-h-[4.8rem] min-w-0 rounded-2xl border-0 px-8 py-[1.6rem] text-[1rem] font-semibold outline-none ring-0 sm:min-h-[5.6rem] sm:px-[2.4rem] sm:py-[1.8rem] sm:text-[1.2rem] md:min-h-[7.2rem] md:px-[3.2rem] md:py-8 md:text-[1.5rem] lg:min-h-[8rem] lg:px-16 lg:py-[2.4rem] lg:text-[1.8rem] focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0';

function clockInModalDescription(
  ctx: AttCheckInContext | null | undefined,
  loading: boolean,
): string {
  if (isLocationContextUnavailable(ctx, loading)) {
    return LOCATION_CONTEXT_UNAVAILABLE_MESSAGE;
  }
  const raw = ctx?.outsideBranchRadiusMessage?.trim() || OUTSIDE_BRANCH_RADIUS_MESSAGE_FALLBACK;
  const withPeriod = /[.!?]\s*$/.test(raw) ? raw : `${raw}.`;
  return `${withPeriod} Pick the option that applies.`;
}

const iconStroke = 1.25 as const;

function startOptionIcon(key: ClockInOptionKey, remoteLarge = false) {
  const iconClass = remoteLarge
    ? 'size-5 shrink-0 text-white sm:size-5 md:size-5 lg:size-5'
    : 'size-5 shrink-0 text-white sm:size-5';
  switch (key) {
    case 'starting_from_home':
      return <Home className={iconClass} strokeWidth={iconStroke} aria-hidden />;
    case 'work_from_home':
      return <Laptop className={iconClass} strokeWidth={iconStroke} aria-hidden />;
    case 'offsite':
      return <MapPin className={iconClass} strokeWidth={iconStroke} aria-hidden />;
    case 'driving':
      return <Car className={iconClass} strokeWidth={iconStroke} aria-hidden />;
    default:
      return <Play className={iconClass} strokeWidth={iconStroke} aria-hidden />;
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
  onRetryClockInContext,
  onCheckOut,
  onStartBreak,
  onEndBreak,
  startTime = null,
  breakStartTime = null,
}: AttendanceStatusButtonProps) {
  const [currentTimer, setCurrentTimer] = useState('00:00:00');
  const [remoteModalOpen, setRemoteModalOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [pendingModeLabel, setPendingModeLabel] = useState<ClockInOptionLabel | null>(null);
  const [additionalNote, setAdditionalNote] = useState('');
  const [reopenRemotePickerAfterNoteBack, setReopenRemotePickerAfterNoteBack] = useState(false);
  const noteConfirmingRef = useRef(false);

  function openNoteStep(modeLabel: ClockInOptionLabel, opts?: { fromRemoteMobilePicker?: boolean }) {
    setPendingModeLabel(modeLabel);
    setAdditionalNote('');
    setReopenRemotePickerAfterNoteBack(opts?.fromRemoteMobilePicker ?? false);
    setRemoteModalOpen(false);
    setNoteDialogOpen(true);
  }

  function confirmNoteStep() {
    if (!pendingModeLabel) return;
    noteConfirmingRef.current = true;
    void onClockInWithNote?.(
      pendingModeLabel,
      additionalNote.trim() ? additionalNote.trim() : undefined
    );
    setPendingModeLabel(null);
    setAdditionalNote('');
    setReopenRemotePickerAfterNoteBack(false);
    setNoteDialogOpen(false);
    queueMicrotask(() => {
      noteConfirmingRef.current = false;
    });
  }

  function cancelNoteStep() {
    if (reopenRemotePickerAfterNoteBack) setRemoteModalOpen(true);
    setReopenRemotePickerAfterNoteBack(false);
    setPendingModeLabel(null);
    setAdditionalNote('');
    setNoteDialogOpen(false);
  }

  function onNoteDialogOpenChange(open: boolean) {
    if (open) return;
    if (noteConfirmingRef.current) return;
    cancelNoteStep();
  }

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

  const atOfficeOnly = isAtOfficeOnlyContext(clockInContext);
  const locationUnavailable = isLocationContextUnavailable(clockInContext, clockInContextLoading);
  const remoteKeys = remoteOptionKeysFromContext(clockInContext);

  const renderRemoteOptionButton = (key: ClockInOptionKey, opts?: { stacked?: boolean }) => {
    const stacked = opts?.stacked ?? false;
    const label = OPTION_KEY_TO_LABEL[key];
    return (
      <Button
        key={key}
        type="button"
        variant="secondary"
        size="lg"
        className={cn(
          'flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0',
          stacked
            ? remoteClockInModalStackedClass
            : cn(remoteClockInOptionClass, 'w-full md:flex-1 md:min-w-0'),
        )}
        onClick={() => {
          openNoteStep(label, { fromRemoteMobilePicker: stacked });
        }}
      >
        {startOptionIcon(key, !stacked)}
        {label}
      </Button>
    );
  };

  const remoteGrid = (
    <div className="flex w-full flex-col gap-2 md:flex-row md:items-stretch md:gap-3">
      {remoteKeys.map((key) => renderRemoteOptionButton(key))}
    </div>
  );

  return (
    <div
      className="flex w-full flex-col items-center justify-center gap-4 px-2"
      data-tour="attendance-button"
    >
      {showShiftTimer && (
        <div className="flex w-full max-w-md flex-col items-center gap-1">
          <span className="text-4xl font-semibold tabular-nums text-foreground">
            {currentTimer}
          </span>
        </div>
      )}

      <div className="flex w-full max-w-md flex-col gap-4 md:max-w-5xl">
        {!checkedIn && (
          <div className="flex w-full flex-col gap-3">
            <span className="text-center text-[0.8rem] font-medium uppercase text-foreground sm:text-[0.9rem] md:text-[1rem]">
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
                    onClick={() => openNoteStep('At office')}
                  >
                    <Play
                      className="size-10 shrink-0 text-white sm:size-12 md:size-14 lg:size-16"
                      strokeWidth={iconStroke}
                      aria-hidden
                    />
                    Start Shift
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-center text-[0.7rem] text-muted-foreground">
                    {locationUnavailable
                      ? LOCATION_CONTEXT_UNAVAILABLE_MESSAGE
                      : clockInContext?.outsideBranchRadiusMessage?.trim() ||
                        OUTSIDE_BRANCH_RADIUS_MESSAGE_FALLBACK}
                  </p>
                  {locationUnavailable && onRetryClockInContext ? (
                    <button
                      type="button"
                      className="text-center text-xs text-primary underline"
                      onClick={onRetryClockInContext}
                    >
                      Retry location
                    </button>
                  ) : null}
                  {/* md+: inline options */}
                  <div className="hidden md:block">{remoteGrid}</div>
                  {/* Mobile: open modal */}
                  <div className="md:hidden">
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      className={cn(
                        'w-full',
                        actionButtonClass,
                        'flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 lg:min-h-12 lg:py-3 lg:text-base',
                      )}
                      onClick={() => setRemoteModalOpen(true)}
                    >
                      <Play className="size-5 text-white sm:size-6" strokeWidth={iconStroke} aria-hidden />
                      Choose how you&apos;re starting
                    </Button>
                    <Dialog open={remoteModalOpen} onOpenChange={setRemoteModalOpen}>
                      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-center text-base font-semibold">
                            Start your shift
                          </DialogTitle>
                          <DialogDescription className="text-center text-xs text-muted-foreground">
                            {clockInModalDescription(clockInContext, clockInContextLoading)}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col gap-2 pt-2">
                          {remoteKeys.map((key) => renderRemoteOptionButton(key, { stacked: true }))}
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
                  <Play className="size-5 text-white sm:size-6" strokeWidth={iconStroke} aria-hidden />
                  Start Shift
                </Button>
              </div>
            ) : null}
            {onClockInWithNote && (
              <Dialog open={noteDialogOpen} onOpenChange={onNoteDialogOpenChange}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-center text-base font-semibold">
                      Start your shift
                    </DialogTitle>
                    <DialogDescription className="text-center text-xs text-muted-foreground">
                      Optional note — e.g. time adjustment or on-site issue.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-3 pt-1">
                    <p className="text-center text-sm font-medium text-foreground">
                      {pendingModeLabel ?? ''}
                    </p>
                    <Textarea
                      value={additionalNote}
                      onChange={(e) =>
                        setAdditionalNote(
                          e.target.value.slice(0, CLOCK_IN_ADDITIONAL_NOTE_MAX_LENGTH)
                        )
                      }
                      placeholder="Additional note (optional) — e.g. time adjustment, issue on site…"
                      className="min-h-[100px] resize-y text-foreground placeholder:italic placeholder:text-muted-foreground"
                      aria-label="Optional shift start note"
                    />
                    <p className="text-right text-xs text-muted-foreground">
                      {additionalNote.length}/{CLOCK_IN_ADDITIONAL_NOTE_MAX_LENGTH}
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      className={cn(
                        'w-full',
                        actionButtonClass,
                        'flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 lg:min-h-12 lg:py-3 lg:text-base',
                      )}
                      onClick={confirmNoteStep}
                    >
                      Start shift
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}

        {checkedIn && onBreak && (
          <div className="flex w-full flex-col items-center gap-3">
            {loading ? (
              <div className="flex min-h-[3.6rem] w-full items-center justify-center rounded-xl md:min-h-16">
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
              <div className="flex min-h-[3.6rem] w-full items-center justify-center rounded-xl md:min-h-16">
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

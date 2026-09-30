'use client';

import toast from 'react-hot-toast';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { Clock } from 'lucide-react';
import {
  useTokenReady,
  useSessionSync,
  useAttStatus,
  useAttCheckInMutation,
  useAttCheckOutMutation,
  useBreakMutation,
  useApiClient,
} from '@/api/hooks';
import { getAttStatus } from '@/api/endpoints/attendance';
import type { AttCheckInContext } from '@/api/types/attendance';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast-helpers';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import { AttendanceStatusButton } from '@/components/attendance-status-button';
import { AttendanceStreakCalendar } from '@/components/attendance-streak-calendar';
import { UserAttendanceRecordsModal } from '@/app/staff/components/user-attendance-records-modal';
import type { ReportCardUser } from '@/lib/types/staff-report-types';
import { debugApi, isApiDebugEnabled } from '@/lib/api-debug';
import { locationContextFailureMessage } from '@/lib/clock-in-options';
import { getBrowserPosition, geolocationFailureMessage } from '@/lib/browser-geolocation';
import { isClientMode } from '@/lib/user-mode';
import { appPageMainClass, appPageScrollWrapClass } from '@/lib/page-shell';
import { ClientDashboardHome } from '@/app/client-portal/components/client-dashboard-home';
import { PulseDialog } from '@/components/pulse-dialog';
import { usePulseMe, useSubmitPulseMutation } from '@/api/hooks/use-pulse';
import type { PulsePeriod, PulseSubmitBody } from '@/api/types/pulse';
import { DashboardVariableRemCard } from '@/components/dashboard-variable-rem-card';

export function DashboardContent() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const { isTokenReady, sessionToken } = useTokenReady();
  const apiClient = useApiClient();
  const { backendUserData: profile } = useSessionSync();
  const [attendanceModalUser, setAttendanceModalUser] = useState<ReportCardUser | null>(null);
  const [clockInContext, setClockInContext] = useState<AttCheckInContext | null>(null);
  const [clockInContextLoading, setClockInContextLoading] = useState(false);
  const [clockInContextError, setClockInContextError] = useState<string | null>(null);
  const [pulseOpen, setPulseOpen] = useState(false);
  const [pulsePeriod, setPulsePeriod] = useState<PulsePeriod>('morning');
  const pendingCheckOutRef = useRef(false);
  const pendingClockInRef = useRef<{ modeLabel: string } | null>(null);
  /** True while a shift action is checking the server for today's pulse, so a double click cannot start it twice. */
  const pulseGateBusyRef = useRef(false);

  const currentUserForModal = useMemo((): ReportCardUser | null => {
    if (!profile?.uid) return null;
    return {
      userId: profile.uid,
      ref: String(profile.uid),
      name: clerkUser?.fullName ?? 'Me',
      email: clerkUser?.primaryEmailAddress?.emailAddress ?? '',
      hoursThisMonth: 0,
      progressPercent: 0,
      isPresent: false,
    };
  }, [profile?.uid, clerkUser?.fullName, clerkUser?.primaryEmailAddress?.emailAddress]);

  /** Numeric uid from sync, or Clerk id — server monthly endpoint resolves both. */
  const calendarUserRef = useMemo(
    () => profile?.uid ?? clerkUser?.id ?? null,
    [profile?.uid, clerkUser?.id]
  );

  const isClient = isClientMode(profile, sessionToken);
  /** Start attendance APIs as soon as the token is ready; do not wait for sync-clerk. */
  const staffAttendanceEnabled = isTokenReady && !isClient;

  const attQuery = useAttStatus({
    enabled: staffAttendanceEnabled,
  });

  useEffect(() => {
    if (!isApiDebugEnabled()) return;
    const attErr = attQuery.error;
    debugApi('dashboard React Query', {
      isSignedIn,
      isTokenReady,
      attFetchStatus: attQuery.fetchStatus,
      attIsFetching: attQuery.isFetching,
      attError:
        attErr instanceof Error ? attErr.message : attErr ? String(attErr) : undefined,
    });
  }, [
    isSignedIn,
    isTokenReady,
    attQuery.fetchStatus,
    attQuery.isFetching,
    attQuery.error,
  ]);

  const attCheckInMutation = useAttCheckInMutation();
  const attCheckOutMutation = useAttCheckOutMutation();
  const breakMutation = useBreakMutation();
  const pulseMe = usePulseMe(staffAttendanceEnabled);
  const submitPulseMutation = useSubmitPulseMutation();
  const attStatus = attQuery.data;
  const checkedIn = attStatus?.checkedIn ?? false;
  const onBreak =
    attStatus?.nextAction === 'End Break' || attStatus?.nextAction === 'Resume Work';
  const attLoading =
    attCheckInMutation.isPending || attCheckOutMutation.isPending || breakMutation.isPending;

  const refreshClockInContext = useCallback(async () => {
    setClockInContextLoading(true);
    setClockInContextError(null);
    const position = await getBrowserPosition();
    if (!position.ok) {
      setClockInContext(null);
      setClockInContextError(geolocationFailureMessage(position.reason));
      setClockInContextLoading(false);
      return;
    }
    try {
      const data = await getAttStatus(apiClient, {
        lat: position.lat,
        lng: position.lng,
      });
      const ctx = data.checkInContext;
      if (ctx?.availableClockInOptions?.length) {
        setClockInContext({
          withinBranchRadius: ctx.withinBranchRadius,
          availableClockInOptions: ctx.availableClockInOptions,
          radiusMeters: ctx.radiusMeters ?? 50,
          distanceFromBranchMeters: ctx.distanceFromBranchMeters ?? null,
          outsideBranchRadiusMessage: ctx.outsideBranchRadiusMessage ?? null,
        });
        setClockInContextError(null);
      } else {
        setClockInContext(null);
        setClockInContextError(locationContextFailureMessage('missing_context'));
      }
      setClockInContextLoading(false);
    } catch {
      setClockInContext(null);
      setClockInContextError(locationContextFailureMessage('api_error'));
      setClockInContextLoading(false);
    }
  }, [apiClient]);

  /** When not checked in, fetch status with device location for server-driven clock-in options. */
  useEffect(() => {
    if (!staffAttendanceEnabled || checkedIn) {
      setClockInContext(null);
      setClockInContextError(null);
      setClockInContextLoading(false);
      return;
    }
    void refreshClockInContext();
  }, [staffAttendanceEnabled, checkedIn, refreshClockInContext]);

  /**
   * Whether today's pulse for `period` is in. Always asks the server so a stale cache cannot
   * let a shift start or end without the form; a failed lookup counts as "not submitted".
   */
  const isPulseSubmitted = async (period: PulsePeriod): Promise<boolean> => {
    const result = await pulseMe.refetch();
    if (result.isError || !result.data) return false;
    return period === 'morning' ? result.data.morningSubmitted : result.data.eveningSubmitted;
  };

  /**
   * Runs a shift action behind the pulse gate. Ignored while another gated action is still
   * checking the server.
   */
  const runPulseGated = async (action: () => Promise<void>) => {
    if (pulseGateBusyRef.current) return;
    pulseGateBusyRef.current = true;
    try {
      await action();
    } finally {
      pulseGateBusyRef.current = false;
    }
  };

  /** Start of shift: the "Start My Day" pulse must be in before the clock-in is sent. */
  const handleClockInWithMode = (modeLabel: string) =>
    runPulseGated(async () => {
      if (!(await isPulseSubmitted('morning'))) {
        pendingClockInRef.current = { modeLabel };
        setPulsePeriod('morning');
        setPulseOpen(true);
        return;
      }
      await performClockIn(modeLabel);
    });

  const performClockIn = async (modeLabel: string) => {
    /** The mode label is all `checkInNotes` carries; the server reads it for the at-office geofence. */
    const combined = modeLabel;
    const position = await getBrowserPosition();
    const noLocationSuffix =
      !position.ok ? ' (browser location not granted)' : '';
    attCheckInMutation.mutate(
      {
        status: 'present',
        checkIn: new Date().toISOString(),
        checkInNotes:
          position.ok ? combined : `${combined}${noLocationSuffix}`,
        ...(position.ok && {
          checkInLatitude: position.lat,
          checkInLongitude: position.lng,
        }),
        ...(profile?.branch?.uid != null && { branch: { uid: profile.branch.uid } }),
      },
      {
        onSuccess: () => {
          showSuccessToast('Shift started', toast);
        },
      }
    );
  };

  /** End of shift: the "Finish My Day" pulse must be in before the clock-out is sent. */
  const handleCheckOut = () =>
    runPulseGated(async () => {
      if (!(await isPulseSubmitted('evening'))) {
        pendingCheckOutRef.current = true;
        setPulsePeriod('evening');
        setPulseOpen(true);
        return;
      }
      await performCheckOut();
    });

  const performCheckOut = async () => {
    const position = await getBrowserPosition();
    const noLocationNote = 'Clocked out without location (browser location not granted).';
    attCheckOutMutation.mutate(
      {
        checkOut: new Date().toISOString(),
        checkOutNotes: position.ok ? '' : noLocationNote,
        ...(position.ok && {
          checkOutLatitude: position.lat,
          checkOutLongitude: position.lng,
        }),
      },
      {
        onSuccess: () => {
          showSuccessToast('Shift ended', toast);
        },
      }
    );
  };

  const handleStartBreak = async () => {
    const position = await getBrowserPosition();
    breakMutation.mutate(
      {
        isStartingBreak: true,
        breakNotes: '',
        ...(position.ok && {
          breakLatitude: position.lat,
          breakLongitude: position.lng,
        }),
      },
      {
        onSuccess: () => {
          showSuccessToast('Break started', toast);
        },
      }
    );
  };

  const handleEndBreak = async () => {
    const position = await getBrowserPosition();
    breakMutation.mutate(
      {
        isStartingBreak: false,
        breakNotes: '',
        ...(position.ok && {
          breakLatitude: position.lat,
          breakLongitude: position.lng,
        }),
      },
      {
        onSuccess: () => {
          showSuccessToast('Break ended', toast);
        },
      }
    );
  };

  /**
   * Abandons the pending shift action (Escape): nothing is started or ended because the pulse was
   * not given. A morning prompt with no held clock-in (shift already running without today's
   * pulse) cannot be dismissed at all, matching the mobile app.
   */
  function handlePulseCancel() {
    if (pulsePeriod === 'morning' && !pendingClockInRef.current) return;
    pendingClockInRef.current = null;
    pendingCheckOutRef.current = false;
    setPulseOpen(false);
  }

  function handlePulseSubmit(body: PulseSubmitBody) {
    submitPulseMutation.mutate(body, {
      onError: (error) => {
        showErrorToast(getQueryErrorMessage(error, 'Could not save your pulse. Please try again.'), toast);
      },
      onSuccess: () => {
        setPulseOpen(false);
        if (body.period === 'morning' && pendingClockInRef.current) {
          const { modeLabel } = pendingClockInRef.current;
          pendingClockInRef.current = null;
          void performClockIn(modeLabel);
          return;
        }
        if (body.period === 'evening' && pendingCheckOutRef.current) {
          pendingCheckOutRef.current = false;
          void performCheckOut();
        }
      },
    });
  }

  /**
   * A shift that is already running without today's morning pulse (started on an older build or
   * another device) is asked for it now, so a pulse is never missing for a worked day.
   */
  useEffect(() => {
    if (!staffAttendanceEnabled || !checkedIn || pulseOpen) return;
    if (pulseMe.isFetching || pulseMe.isError || !pulseMe.data) return;
    if (pulseMe.data.morningSubmitted) return;
    pendingClockInRef.current = null;
    setPulsePeriod('morning');
    setPulseOpen(true);
  }, [staffAttendanceEnabled, checkedIn, pulseOpen, pulseMe.isFetching, pulseMe.isError, pulseMe.data]);

  // Render a single consistent tree until mounted to avoid hydration mismatch:
  // server and initial client render both show the same loading placeholder.
  if (!mounted) {
    return (
      <div className={appPageScrollWrapClass}>
        <main className={appPageMainClass}>
          <LoadingSpinner wrapperClassName="py-12" />
        </main>
      </div>
    );
  }

  // Show loading until Clerk token is ready (avoids firing requests before token is available).
  if (isSignedIn && !isTokenReady) {
    return (
      <div className={appPageScrollWrapClass}>
        <main className={appPageMainClass}>
          <LoadingSpinner wrapperClassName="py-12" />
        </main>
      </div>
    );
  }

  return (
    <div className={appPageScrollWrapClass}>
      <main className={appPageMainClass}>
        {!isSignedIn ? null : isClient ? (
          <ClientDashboardHome />
        ) : (
          <div className="space-y-4">
            <AttendanceStatusButton
              checkedIn={checkedIn}
              onBreak={onBreak}
              loading={attLoading || attQuery.isLoading}
              onClockInWithMode={handleClockInWithMode}
              clockInContext={clockInContext}
              clockInContextLoading={clockInContextLoading}
              clockInContextError={clockInContextError}
              onRetryClockInContext={() => void refreshClockInContext()}
              onCheckOut={handleCheckOut}
              onStartBreak={handleStartBreak}
              onEndBreak={handleEndBreak}
              startTime={attStatus?.startTime ?? null}
              breakStartTime={attStatus?.breakStartTime ?? null}
              orgTimezone={attStatus?.schedule?.timezone ?? null}
            />
            <PulseDialog
              open={pulseOpen}
              period={pulsePeriod}
              submitting={submitPulseMutation.isPending}
              onCancel={handlePulseCancel}
              onSubmit={handlePulseSubmit}
            />
            <AttendanceStreakCalendar
              userRef={calendarUserRef}
              headerTrailing={
                currentUserForModal ? (
                  <button
                    type="button"
                    onClick={() => setAttendanceModalUser(currentUserForModal)}
                    className="flex h-9 min-w-0 w-full items-center justify-center gap-2 rounded border border-border bg-background px-2 text-sm text-foreground hover:bg-accent md:w-auto md:px-3"
                    aria-label="View attendance logs"
                    data-tour="attendance-logs-button"
                  >
                    <Clock className="size-4 shrink-0" />
                    <span>Logs</span>
                  </button>
                ) : undefined
              }
            />
            <UserAttendanceRecordsModal
              user={attendanceModalUser}
              onClose={() => setAttendanceModalUser(null)}
            />
            <DashboardVariableRemCard
              userRef={calendarUserRef != null ? String(calendarUserRef) : null}
            />
          </div>
        )}
      </main>
    </div>
  );
}

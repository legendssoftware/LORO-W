'use client';

import toast from 'react-hot-toast';
import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { showSuccessToast } from '@/lib/utils/toast-helpers';
import { AttendanceStatusButton } from '@/components/attendance-status-button';
import { AttendanceStreakCalendar } from '@/components/attendance-streak-calendar';
import { UserAttendanceRecordsModal } from '@/app/staff/components/user-attendance-records-modal';
import type { ReportCardUser } from '@/lib/types/staff-report-types';
import { debugApi, isApiDebugEnabled } from '@/lib/api-debug';
import { buildClockInNotes, locationContextFailureMessage } from '@/lib/clock-in-options';
import { getBrowserPosition, geolocationFailureMessage } from '@/lib/browser-geolocation';
import { isClientMode } from '@/lib/user-mode';
import { appPageMainClass, appPageScrollWrapClass } from '@/lib/page-shell';
import { ClientDashboardHome } from '@/app/client-portal/components/client-dashboard-home';

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

  const handleClockInWithNote = async (modeLabel: string, additionalNote?: string) => {
    const combined = buildClockInNotes(modeLabel, additionalNote);
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

  const handleCheckOut = async () => {
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
              onClockInWithNote={handleClockInWithNote}
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
          </div>
        )}
      </main>
    </div>
  );
}

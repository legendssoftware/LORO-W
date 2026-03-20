'use client';

import toast from 'react-hot-toast';
import { useState, useEffect, useMemo } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { Clock } from 'lucide-react';
import {
  useTokenReady,
  useSessionSync,
  useAttStatus,
  useAttMetrics,
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
import { DashboardMetricsCard } from '@/components/dashboard-metrics-card';
import { AttendanceStreakCalendar } from '@/components/attendance-streak-calendar';
import { UserAttendanceRecordsModal } from '@/app/reports/components/user-attendance-records-modal';
import type { ReportCardUser } from '@/app/reports/types';

export function DashboardContent() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const { isTokenReady } = useTokenReady();
  const apiClient = useApiClient();
  const { backendUserData: profile, isSyncing } = useSessionSync();
  const [attendanceModalUser, setAttendanceModalUser] = useState<ReportCardUser | null>(null);
  const [clockInContext, setClockInContext] = useState<AttCheckInContext | null>(null);
  const [clockInContextLoading, setClockInContextLoading] = useState(false);

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

  const attQuery = useAttStatus({
    enabled: isTokenReady,
  });
  const metricsQuery = useAttMetrics({
    enabled: isTokenReady,
  });
  const attCheckInMutation = useAttCheckInMutation();
  const attCheckOutMutation = useAttCheckOutMutation();
  const breakMutation = useBreakMutation();
  const attStatus = attQuery.data;
  const checkedIn = attStatus?.checkedIn ?? false;
  const onBreak =
    attStatus?.nextAction === 'End Break' || attStatus?.nextAction === 'Resume Work';
  const attLoading =
    attCheckInMutation.isPending || attCheckOutMutation.isPending || breakMutation.isPending;

  const isClient = profile?.accessLevel === 'client';

  /** When not checked in, fetch status with device location for server-driven clock-in options. */
  useEffect(() => {
    if (!isTokenReady || checkedIn) {
      setClockInContext(null);
      setClockInContextLoading(false);
      return;
    }
    let cancelled = false;
    setClockInContextLoading(true);
    void (async () => {
      const position = await getPosition();
      if (!position) {
        if (!cancelled) {
          setClockInContext(null);
          setClockInContextLoading(false);
        }
        return;
      }
      try {
        const data = await getAttStatus(apiClient, {
          lat: position.lat,
          lng: position.lng,
        });
        const ctx = data.checkInContext;
        if (!cancelled) {
          if (ctx?.availableClockInOptions?.length) {
            setClockInContext({
              withinBranchRadius: ctx.withinBranchRadius,
              availableClockInOptions: ctx.availableClockInOptions,
              radiusMeters: ctx.radiusMeters ?? 50,
              distanceFromBranchMeters: ctx.distanceFromBranchMeters ?? null,
            });
          } else {
            setClockInContext(null);
          }
          setClockInContextLoading(false);
        }
      } catch {
        if (!cancelled) {
          setClockInContext(null);
          setClockInContextLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isTokenReady, checkedIn, apiClient]);

  const handleClockInWithNote = async (checkInNotes: string) => {
    const position = await getPosition();
    const noLocationSuffix =
      position === null ? ' (browser location not granted)' : '';
    attCheckInMutation.mutate(
      {
        status: 'present',
        checkIn: new Date().toISOString(),
        checkInNotes:
          position !== null ? checkInNotes : `${checkInNotes}${noLocationSuffix}`,
        ...(position !== null && {
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
    const position = await getPosition();
    const noLocationNote = 'Clocked out without location (browser location not granted).';
    attCheckOutMutation.mutate(
      {
        checkOut: new Date().toISOString(),
        checkOutNotes: position !== null ? '' : noLocationNote,
        ...(position !== null && {
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
    const position = await getPosition();
    breakMutation.mutate(
      {
        isStartingBreak: true,
        breakNotes: '',
        ...(position !== null && {
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
    const position = await getPosition();
    breakMutation.mutate(
      {
        isStartingBreak: false,
        breakNotes: '',
        ...(position !== null && {
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
      <div className="h-full overflow-auto">
        <main className="container mx-auto max-w-6xl lg:max-w-7xl px-4 py-8 sm:px-6">
          <LoadingSpinner wrapperClassName="py-12" />
        </main>
      </div>
    );
  }

  // Show loading until Clerk token is ready (avoids firing requests before token is available).
  if (isSignedIn && !isTokenReady) {
    return (
      <div className="h-full overflow-auto">
        <main className="container mx-auto max-w-6xl lg:max-w-7xl px-4 py-8 sm:px-6">
          <LoadingSpinner wrapperClassName="py-12" />
        </main>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <main className="container mx-auto max-w-6xl lg:max-w-7xl px-4 py-8 sm:px-6">
        {!isSignedIn ? null : profile && isClient ? (
          <p className="text-center text-muted-foreground">
            Attendance tracking is for employees only.
          </p>
        ) : (
          <div className="space-y-4">
            <AttendanceStatusButton
              checkedIn={checkedIn}
              onBreak={onBreak}
              loading={attLoading || attQuery.isLoading}
              onClockInWithNote={handleClockInWithNote}
              clockInContext={clockInContext}
              clockInContextLoading={clockInContextLoading}
              onCheckOut={handleCheckOut}
              onStartBreak={handleStartBreak}
              onEndBreak={handleEndBreak}
              startTime={attStatus?.startTime ?? null}
              breakStartTime={attStatus?.breakStartTime ?? null}
            />
            <DashboardMetricsCard
              metrics={metricsQuery.data}
              isLoading={metricsQuery.isLoading}
            />
            {isSyncing ? (
              <div className="rounded border border-gray-200 bg-card p-4">
                <div className="mb-4 flex flex-col gap-3">
                  <Skeleton className="h-6 w-28 rounded-md" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-[140px] rounded border border-gray-200" />
                  </div>
                </div>
                <div className="mx-auto max-w-full lg:max-w-[50%]">
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <Skeleton key={i} className="mx-auto h-3 w-8 rounded-md" />
                    ))}
                  </div>
                  <div className="mt-1 grid grid-cols-7 gap-1">
                    {Array.from({ length: 35 }).map((_, i) => (
                      <Skeleton key={i} className="aspect-square rounded-full" />
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-gray-200 pt-4">
                    {[1, 2, 3].map((i) => (
                      <span key={i} className="flex items-center gap-1.5">
                        <Skeleton className="size-4 shrink-0 rounded-full" />
                        <Skeleton className="h-3 w-14 rounded-md" />
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <AttendanceStreakCalendar
                userRef={profile?.uid}
                headerTrailing={
                  currentUserForModal ? (
                    <button
                      type="button"
                      onClick={() => setAttendanceModalUser(currentUserForModal)}
                      className="flex items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2 text-sm text-foreground hover:bg-gray-50"
                      aria-label="View payroll attendance records"
                    >
                      <Clock className="size-4 shrink-0" />
                      <span>Payroll Logs</span>
                    </button>
                  ) : undefined
                }
              />
            )}
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

function getPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null)
    );
  });
}

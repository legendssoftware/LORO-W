'use client';

import toast from 'react-hot-toast';
import { useMemo, useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import {
  useTokenReady,
  useSessionSync,
  useAttStatus,
  useAttMetrics,
  useLeaves,
  useCheckInMutation,
  useCheckOutMutation,
  useBreakMutation,
} from '@/api/hooks';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { showSuccessToast } from '@/lib/utils/toast-helpers';
import { AttendanceStatusButton } from '@/components/attendance-status-button';
import { DashboardMetricsCard } from '@/components/dashboard-metrics-card';
import { AttendanceStreakCalendar } from '@/components/attendance-streak-calendar';

export function DashboardContent() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const clerkUserId = clerkUser?.id ?? null;
  const { isTokenReady } = useTokenReady();
  const { backendUserData: profile, isSyncing } = useSessionSync();

  const attQuery = useAttStatus({
    enabled: isTokenReady,
  });
  const metricsQuery = useAttMetrics({
    enabled: isTokenReady,
  });
  const now = useMemo(() => new Date(), []);
  const leavesQuery = useLeaves(clerkUserId, {
    enabled: isTokenReady && !!clerkUserId,
  });
  const checkInMutation = useCheckInMutation();
  const checkOutMutation = useCheckOutMutation();
  const breakMutation = useBreakMutation();
  const attStatus = attQuery.data;
  const checkedIn = attStatus?.checkedIn ?? false;
  const onBreak =
    attStatus?.nextAction === 'End Break' || attStatus?.nextAction === 'Resume Work';
  const attLoading =
    checkInMutation.isPending || checkOutMutation.isPending || breakMutation.isPending;

  const isClient = profile?.accessLevel === 'client';

  const leaveDaysAccrued = useMemo(() => {
    const leaves = leavesQuery.data ?? [];
    if (leaves.length === 0) return 0;
    const currentYear = now.getFullYear();
    return leaves
      .filter(
        (l) =>
          l.status === 'APPROVED' &&
          new Date(l.startDate).getFullYear() === currentYear
      )
      .reduce((sum, l) => sum + (l.duration ?? 0), 0);
  }, [leavesQuery.data, now]);

  const handleCheckIn = async () => {
    const position = await getPosition();
    const noLocationNote = 'Clocked in without location (browser location not granted).';
    checkInMutation.mutate(
      {
        status: 'present',
        checkIn: new Date().toISOString(),
        ...(position !== null
          ? { checkInLatitude: position.lat, checkInLongitude: position.lng, checkInNotes: '' }
          : { checkInNotes: noLocationNote }),
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
    checkOutMutation.mutate(
      {
        checkOut: new Date().toISOString(),
        ...(position !== null
          ? {
              checkOutNotes: '',
              checkOutLatitude: position.lat,
              checkOutLongitude: position.lng,
            }
          : { checkOutNotes: noLocationNote }),
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
        <main className="container mx-auto max-w-4xl lg:max-w-7xl px-4 py-8 sm:px-6">
          <LoadingSpinner wrapperClassName="py-12" />
        </main>
      </div>
    );
  }

  // Show loading until Clerk token is ready (avoids firing requests before token is available).
  if (isSignedIn && !isTokenReady) {
    return (
      <div className="h-full overflow-auto">
        <main className="container mx-auto max-w-4xl lg:max-w-7xl px-4 py-8 sm:px-6">
          <LoadingSpinner wrapperClassName="py-12" />
        </main>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <main className="container mx-auto max-w-4xl lg:max-w-7xl px-4 py-8 sm:px-6">
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
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              onStartBreak={handleStartBreak}
              onEndBreak={handleEndBreak}
              startTime={attStatus?.startTime ?? null}
              breakStartTime={attStatus?.breakStartTime ?? null}
            />
            <DashboardMetricsCard
              metrics={metricsQuery.data}
              isLoading={metricsQuery.isLoading}
              leaveDaysAccrued={leaveDaysAccrued}
            />
            {isSyncing ? (
              <div className="rounded border border-gray-200 bg-card p-4">
                <div className="mb-4 flex items-center justify-between">
                  <Skeleton className="h-6 w-28 rounded-md" />
                  <Skeleton className="h-9 w-[140px] rounded border border-gray-200" />
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
              <AttendanceStreakCalendar userRef={profile?.uid} />
            )}
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

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
} from '@/api/hooks';
import { LoadingSpinner } from '@/components/loading-spinner';
import { showSuccessToast } from '@/lib/utils/toast-helpers';
import { AttendanceStatusButton } from '@/components/attendance-status-button';
import { DashboardNextAction } from '@/components/dashboard-next-action';
import { DashboardMetricsCard } from '@/components/dashboard-metrics-card';
import { AttendanceStreakCalendar } from '@/components/attendance-streak-calendar';

export function DashboardContent() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const clerkUserId = clerkUser?.id ?? null;
  const { isTokenReady } = useTokenReady();
  const { backendUserData: profile } = useSessionSync();

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
  const attStatus = attQuery.data;
  const checkedIn = attStatus?.checkedIn ?? false;
  const attLoading = checkInMutation.isPending || checkOutMutation.isPending;

  const isClient = profile?.accessLevel === 'client';
  const nextAction = attStatus?.nextAction ?? null;

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
              loading={attLoading}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
            />
            <div className="space-y-1">
              <DashboardNextAction nextAction={nextAction} />
            </div>
            <DashboardMetricsCard
              metrics={metricsQuery.data}
              isLoading={metricsQuery.isLoading}
              leaveDaysAccrued={leaveDaysAccrued}
            />
            <AttendanceStreakCalendar userRef={profile?.uid} />
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

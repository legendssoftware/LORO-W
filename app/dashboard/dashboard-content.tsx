'use client';

import { useMemo } from 'react';
import {
  useSyncClerk,
  useAttStatus,
  useAttMetrics,
  useLeaves,
  useCheckInMutation,
  useCheckOutMutation,
} from '@/api/hooks';
import type { SyncProfile } from '@/api/types';
import { Loader2Icon } from '@/lib/icons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AttendanceStatusButton } from '@/components/attendance-status-button';
import { DashboardNextAction } from '@/components/dashboard-next-action';
import { DashboardTimeWorking } from '@/components/dashboard-time-working';
import { DashboardMetricsCard } from '@/components/dashboard-metrics-card';
import { AttendanceStreakCalendar } from '@/components/attendance-streak-calendar';

export function DashboardContent() {
  const syncQuery = useSyncClerk();
  const profile: SyncProfile | undefined = syncQuery.data?.profileData;
  const attQuery = useAttStatus({
    enabled: !syncQuery.isLoading && !!syncQuery.data?.profileData,
  });
  const metricsQuery = useAttMetrics({
    enabled:
      !syncQuery.isLoading &&
      !!syncQuery.data?.profileData &&
      syncQuery.data.profileData.accessLevel !== 'client',
  });
  const now = useMemo(() => new Date(), []);
  const leavesQuery = useLeaves(profile?.clerkUserId, {
    enabled: !!profile?.clerkUserId && profile?.accessLevel !== 'client',
  });
  const checkInMutation = useCheckInMutation();
  const checkOutMutation = useCheckOutMutation();
  const syncing = syncQuery.isLoading;
  const attStatus = attQuery.data;
  const checkedIn = attStatus?.checkedIn ?? false;
  const attLoading = checkInMutation.isPending || checkOutMutation.isPending;
  const attError =
    checkInMutation.error?.message ?? checkOutMutation.error?.message ?? null;

  const isClient = profile?.accessLevel === 'client';
  const nextAction = attStatus?.nextAction ?? null;
  const checkInTime =
    attStatus?.attendance?.checkIn ?? attStatus?.startTime ?? null;

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
    checkInMutation.mutate(
      {
        status: 'present',
        checkIn: new Date().toISOString(),
        checkInLatitude: position.lat,
        checkInLongitude: position.lng,
        checkInNotes: '',
        ...(profile?.branch?.uid != null && { branch: { uid: profile.branch.uid } }),
      },
      {
        onError: () => {
          // Error is surfaced via checkInMutation.error
        },
      }
    );
  };

  const handleCheckOut = async () => {
    const position = await getPosition();
    checkOutMutation.mutate({
      checkOut: new Date().toISOString(),
      checkOutNotes: '',
      checkOutLatitude: position.lat,
      checkOutLongitude: position.lng,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {syncing ? (
          <div className="flex justify-center py-12">
            <Loader2Icon className="size-8 animate-spin text-primary" />
          </div>
        ) : isClient ? (
          <p className="text-center text-muted-foreground">
            Attendance tracking is for employees only.
          </p>
        ) : (
          <div className="space-y-4">
            {attError && (
              <Alert variant="destructive">
                <AlertDescription>{attError}</AlertDescription>
              </Alert>
            )}
            <AttendanceStatusButton
              checkedIn={checkedIn}
              loading={attLoading}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
            />
            <div className="space-y-1">
              <DashboardNextAction nextAction={nextAction} />
              <DashboardTimeWorking
                checkedIn={checkedIn}
                checkInTime={checkInTime}
              />
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

function getPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: 0, lng: 0 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve({ lat: 0, lng: 0 })
    );
  });
}

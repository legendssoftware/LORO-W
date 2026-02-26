// Session sync query key – use for any hook that syncs session/profile so sign-out can invalidate it
const SESSION_SYNC_QUERY_KEY = ['session', 'sync'] as const;

export function getSessionSyncQueryKey(): readonly ['session', 'sync'] {
  return SESSION_SYNC_QUERY_KEY;
}

export { useAttMetrics } from './use-att-metrics';
export { useApiClient } from './use-api-client';
export {
  useAttStatus,
  useCheckInMutation,
  useCheckOutMutation,
  useBreakMutation,
} from './use-att-status';
export { useAttendanceReport } from './use-attendance-report';
export { useMapReport } from './use-map-report';
export { useBranches } from './use-branches';
export { useClients } from './use-clients';
export { useUsers } from './use-users';
export { useUser, useUserTarget, useUserPreferences, usePatchUserTarget } from './use-user';
export { useTokenReady } from './use-token-ready';
export { useSessionSync } from './use-session-sync';
export { useSyncClerk } from './use-sync-clerk';
export { useMonthlyMetrics } from './use-monthly-metrics';
export { useMonthlyAttendance } from './use-monthly-attendance';
export { useDailyOverview } from './use-daily-overview';
export { useCheckIns, useCheckInsReport, useCheckInStatus } from './use-check-ins';
export { useLeaves } from './use-leaves';

// Session sync query key – use for any hook that syncs session/profile so sign-out can invalidate it
const SESSION_SYNC_QUERY_KEY = ['session', 'sync'] as const;

export function getSessionSyncQueryKey(): readonly ['session', 'sync'] {
  return SESSION_SYNC_QUERY_KEY;
}

export { useAttMetrics } from './use-att-metrics';
export { useAttMetricsByUser } from './use-att-metrics-by-user';
export { useAttMetricsBatch } from './use-att-metrics-batch';
export { useApiClient } from './use-api-client';
export {
  useAttStatus,
  useAttCheckInMutation,
  useAttCheckOutMutation,
  useBreakMutation,
  useCheckInMutation,
  useCheckOutMutation,
  useUpdateVisitDetailsMutation,
} from './use-att-status';
export { useAttendanceReport } from './use-attendance-report';
export { useMapReport, useReportsMapData } from './use-map-report';
export { useTargetsProgress } from './use-targets-progress';
export { useBranches, getBranchDisplayLabel } from './use-branches';
export { useBranchMapMarkers } from './use-branch-map-markers';
export {
  CLIENTS_QUERY_KEY_PREFIX,
  invalidateClientQueries,
  useClients,
  useClientsInfinite,
  useClient,
  useCreateClientMutation,
  useUpdateClientMutation,
  useDeleteClientMutation,
  useRestoreClientMutation,
} from './use-clients';
export { useUsers } from './use-users';
export {
  useUser,
  useUserTarget,
  useUserPreferences,
  usePatchUser,
  usePatchUserTarget,
  useDeleteUser,
  useRestoreUser,
  useDeleteUserPermanently,
} from './use-user';
export { useTokenReady } from './use-token-ready';
export { useSessionSync } from './use-session-sync';
export { useSyncClerk } from './use-sync-clerk';
export { useMonthlyMetrics } from './use-monthly-metrics';
export { useMonthlyAttendance } from './use-monthly-attendance';
export { useAttendanceByDateRange } from './use-attendance-range';
export { usePayrollHoursAll } from './use-payroll-hours-all';
export { useDailyOverview } from './use-daily-overview';
export { useCheckIns, useCheckInsReport, useCheckInStatus } from './use-check-ins';
export {
  LEADS_QUERY_KEY_PREFIX,
  LEADS_LIST_PAGE_SIZE,
  type LeadsListHookOptions,
  invalidateLeadQueries,
  useLeads,
  useLeadsInfinite,
  useUnassignedLeads,
  useUnassignedLeadsInfinite,
  useLeadsForUser,
  useLeadsReport,
  useLead,
  useCreateLeadMutation,
  useUpdateLeadMutation,
  useDeleteLeadMutation,
  useRestoreLeadMutation,
  useReactivateLeadMutation,
  useReassignLeadsMutation,
  useEngageDraftMutation,
  useSendLeadEngageMutation,
  useImportLeadsMutation,
  useDedupeLeadsMutation,
} from './use-leads';
export {
  useTasks,
  useTask,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useToggleJobStatusMutation,
  useCompleteSubtaskMutation,
  useUpdateSubtaskMutation,
  useDeleteSubtaskMutation,
} from './use-tasks';
export { useLeaves } from './use-leaves';
export { useClaims } from './use-claims';
export { useProfileSales } from './use-profile-sales';
export {
  useInteractionsByLead,
  useCreateInteractionMutation,
} from './use-interactions';

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
export {
  useMapGeocodeBackfillMutation,
  totalCappedPending,
  totalAlreadyExhausted,
  totalCompetitorBranchCappedPending,
  needsMapGeocodeBackfill,
  needsCompetitorBranchGeocodeBackfill,
} from './use-map-geocode-backfill';
export {
  siteOpportunitiesQueryKey,
  useSiteOpportunities,
} from './use-site-opportunities';
export { useTargetsProgress } from './use-targets-progress';
export { useBranches, getBranchDisplayLabel } from './use-branches';
export { useBranchMapMarkers } from './use-branch-map-markers';
export { useCompetitorMapMarkers } from './use-competitor-map-markers';
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
export {
  COMPETITORS_QUERY_KEY_PREFIX,
  invalidateCompetitorQueries,
  useCompetitorsInfinite,
  useCompetitor,
  useCreateCompetitorMutation,
  useUpdateCompetitorMutation,
  useDeleteCompetitorMutation,
  useImportCompetitorsMutation,
} from './use-competitors';
export { useUsers } from './use-users';
export {
  useUser,
  useUserTarget,
  USER_TARGET_QUERY_KEY_PREFIX,
  useDailyProductivity,
  useBonusStatus,
  useUserPreferences,
  usePatchUser,
  usePatchUserTarget,
  useAcknowledgePerformanceWarning,
  useSubThresholdDailyCalls,
  useDeleteUser,
  useRestoreUser,
  useDeleteUserPermanently,
} from './use-user';
export {
  useInviteUserMutation,
  useProvisionUserMutation,
  useReInviteUserMutation,
} from './use-invite-user';
export {
  useIntakeInvitations,
  useCreateIntakeInvitationMutation,
  useResendIntakeInvitationMutation,
  useDeleteIntakeInvitationMutation,
} from './use-employee-intake';
export { useTokenReady } from './use-token-ready';
export { useSessionSync } from './use-session-sync';
export { useSyncClerk } from './use-sync-clerk';
export { useMonthlyMetrics } from './use-monthly-metrics';
export { useMonthlyAttendance } from './use-monthly-attendance';
export { useAttendanceByDateRange } from './use-attendance-range';
export { usePayrollHoursAll } from './use-payroll-hours-all';
export { useDailyOverview, DAILY_OVERVIEW_QUERY_KEY_PREFIX } from './use-daily-overview';
export { useCheckIns, useCheckInsReport, useCheckInStatus } from './use-check-ins';
export {
  LEADS_QUERY_KEY_PREFIX,
  LEADS_LIST_PAGE_SIZE,
  type LeadsListHookOptions,
  type InvalidateLeadsScope,
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
  useTasksForUser,
  useTask,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useToggleJobStatusMutation,
  useCancelJobMutation,
  useCompleteSubtaskMutation,
  useUpdateSubtaskMutation,
  useDeleteSubtaskMutation,
  useOptimizedRoutes,
  useCalculateRoutesMutation,
  useTaskFlags,
  useCreateTaskFlagMutation,
  useUpdateTaskFlagMutation,
  useUpdateTaskFlagItemMutation,
} from './use-tasks';
export { useLeaves } from './use-leaves';
export {
  CLAIMS_QUERY_KEY_PREFIX,
  invalidateClaimsQueries,
  useClaims,
  useClaimsInfinite,
  useClaim,
  useClaimGroups,
  useCreateClaimMutation,
  useCreateClaimGroupMutation,
  useDeleteClaimMutation,
  useDeleteClaimGroupMutation,
  useSubmitClaimGroupMutation,
  useGenerateShareTokenMutation,
  useUpdateClaimMutation,
} from './use-claims';
export {
  STORE_PRODUCTS_QUERY_KEY_PREFIX,
  mapStoreProduct,
  useProductsInfinite,
} from './use-products';
export { usePerformanceDashboard } from './use-performance-dashboard';
export { useProfileSales } from './use-profile-sales';
export { useProfileQuotations, type ProfileQuotationsQueryData } from './use-profile-quotations';
export { useShopQuotations } from './use-shop-quotations';
export {
  useLinkedClientProfile,
  LINKED_CLIENT_FULL_PROFILE_QUERY_KEY,
} from './use-linked-client-profile';
export { useUpdateClientProfile } from './use-update-client-profile';
export {
  useInteractionsByLead,
  useCreateInteractionMutation,
} from './use-interactions';
export {
  IOT_DEVICES_QUERY_KEY_PREFIX,
  invalidateIotDeviceQueries,
  useCreateIotDeviceMutation,
  useDeleteIotDeviceMutation,
  useIotDevice,
  useIotDevices,
  useUpdateIotDeviceMutation,
  useUpdateIotDeviceStatusMutation,
} from './use-iot-devices';

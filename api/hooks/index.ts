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
export {
  latestRepLocationsQueryKey,
  useLatestRepLocations,
} from './use-latest-rep-locations';
export { useRepLocationStream } from './use-rep-location-stream';
export {
  repJourneyQueryKey,
  useRepJourney,
} from './use-rep-journey';
export { useBranches, getBranchDisplayLabel } from './use-branches';
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
  CLIENTS_MAP_DATA_QUERY_KEY,
  useClientsMapData,
} from './use-clients-map-data';
export {
  COMPETITORS_QUERY_KEY_PREFIX,
  invalidateCompetitorQueries,
  useCompetitorsInfinite,
  useCompetitor,
  useCreateCompetitorMutation,
  useUpdateCompetitorMutation,
  useDeleteCompetitorMutation,
  useImportCompetitorsMutation,
  useGeocodeMapBatchMutation,
} from './use-competitors';
export {
  COMPETITORS_MAP_DATA_QUERY_KEY,
  COMPETITORS_MISSING_GEOCODE_QUERY_KEY,
  useCompetitorsMapData,
  useCompetitorsMissingGeocode,
} from './use-competitors-map-data';
export { useStoresSales, STORES_SALES_QUERY_KEY } from './use-stores-sales';
export {
  useProductsSales,
  PRODUCTS_SALES_QUERY_KEY,
} from './use-products-sales';
export {
  useSalesTeamComposition,
  SALES_TEAM_COMPOSITION_QUERY_KEY,
} from './use-sales-team-composition';
export { useOrganisationProfile } from './use-organisation-profile';
export { useUsers } from './use-users';
export {
  useSearchableUsersList,
  type SearchableUserSnapshot,
  type UseSearchableUsersListOptions,
} from './use-searchable-users-list';
export {
  useUser,
  useUserTarget,
  USER_TARGET_QUERY_KEY_PREFIX,
  DAILY_PRODUCTIVITY_KEY_PREFIX,
  useDailyProductivity,
  useBonusStatus,
  useUserPreferences,
  usePatchUserPreferences,
  usePatchUser,
  usePatchUserTarget,
  useClearSelectedPerformanceWarnings,
  useAcknowledgePerformanceWarning,
  useSubThresholdDailyCalls,
  useEngagementRange,
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
export { useCheckIns, useCheckInsListReport, useCheckInStatus } from './use-check-ins';
export {
  useCheckInsReport,
  useCheckInsDispatchSummary,
  CHECK_INS_DOMAIN_REPORT_QUERY_KEY,
  CHECK_INS_DISPATCH_SUMMARY_QUERY_KEY,
} from './use-check-ins-report';
export { useTeamTargets, TEAM_TARGETS_QUERY_KEY } from './use-team-targets';
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
  USER_WARNINGS_QUERY_KEY_PREFIX,
  useUserWarnings,
  useCreateWarningMutation,
  useUpdateWarningMutation,
  useRevokeWarningsMutation,
} from './use-warnings';
export {
  PAYSLIPS_QUERY_KEY_PREFIX,
  type PayslipsListHookOptions,
  usePayslips,
  useUserPayslips,
  usePayslipDocument,
} from './use-payslips';
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
export { useProfileSales } from './use-profile-sales';
export { useExchangeRates } from './use-exchange-rates';
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

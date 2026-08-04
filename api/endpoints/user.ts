import type { AxiosInstance } from 'axios';

/** User as returned by GET /user/:ref (subset of entity). */
export interface UserResponse {
  uid: number;
  username?: string | null;
  name: string;
  surname: string;
  email: string;
  phone?: string | null;
  photoURL?: string | null;
  avatar?: string | null;
  role: string;
  status: string;
  accessLevel: string;
  workforceType?: string | null;
  organisationRef?: string | null;
  branchUid?: number | null;
  branch?: { uid: number; name?: string } | null;
  userref?: string | null;
  hrID?: number | null;
  managedBranches?: number[];
  managedStaff?: number[];
  userProfile?: Record<string, unknown> | null;
  userEmployeementProfile?: Record<string, unknown> | null;
  businesscardURL?: string | null;
  departmentId?: number | null;
  assignedClientIds?: number[];
  userTarget?: UserTargetListFields | Record<string, unknown> | null;
  isDeleted?: boolean;
  clerkUserId?: string | null;
  [key: string]: unknown;
}

export interface GetUserByRefResponse {
  message: string;
  user: UserResponse | null;
}

/**
 * Nested userTarget fields selected by GET /user (findAll).
 * Does not include targetWarnings or precomputed progress.
 */
export interface UserTargetListFields {
  uid?: number;
  targetSalesAmount?: number | null;
  currentSalesAmount?: number | null;
  targetQuotationsAmount?: number | null;
  currentQuotationsAmount?: number | null;
  currentOrdersAmount?: number | null;
  targetCurrency?: string | null;
  targetHoursWorked?: number | null;
  currentHoursWorked?: number | null;
  targetNewClients?: number | null;
  currentNewClients?: number | null;
  targetNewLeads?: number | null;
  currentNewLeads?: number | null;
  targetCheckIns?: number | null;
  currentCheckIns?: number | null;
  targetCalls?: number | null;
  currentCalls?: number | null;
  primaryVehicleAssetUid?: number | null;
  targetPeriod?: string | null;
  periodStartDate?: string | null;
  periodEndDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Minimal user for list/dropdown (from GET /user findAll). */
export interface UserListItem {
  uid: number;
  name: string;
  surname: string;
  email: string;
  clerkUserId?: string;
  photoURL?: string | null;
  avatar?: string | null;
  workforceType?: string | null;
  branchUid?: number | null;
  branch?: { uid: number; name?: string; alias?: string | null; country?: string | null } | null;
  userTarget?: UserTargetListFields | null;
  [key: string]: unknown;
}

export interface GetUsersResponse {
  data: UserListItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  message: string;
}

/** Partial update body for PATCH /user/:ref. Only send fields that are being updated. */
export interface PatchUserBody {
  name?: string;
  surname?: string;
  email?: string;
  phone?: string | null;
  photoURL?: string | null;
  avatar?: string | null;
  businesscardURL?: string | null;
  role?: string;
  status?: string;
  accessLevel?: string;
  workforceType?: string;
  departmentId?: number;
  organisationRef?: string | null;
  userref?: string | null;
  hrID?: number | null;
  branch?: { uid: number } | null;
  assignedClientIds?: number[];
  linkedClientUid?: number | null;
  managedBranches?: number[];
  managedStaff?: number[];
  managedDoors?: number[] | null;
  profile?: {
    height?: string;
    weight?: string;
    hairColor?: string;
    eyeColor?: string;
    gender?: string;
    dateOfBirth?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  employmentProfile?: {
    branchref?: string;
    position?: string;
    department?: string;
    startDate?: string;
    endDate?: string;
    isCurrentlyEmployed?: boolean;
    email?: string;
    contactNumber?: string;
  };
  /** Optional: create or update user targets in the same request. If user has no targets they are created; if they exist they are updated. */
  userTarget?: PatchUserTargetBody;
}

/** One issued performance warning tier in chronological order. */
export interface TargetWarningHistoryEntry {
  level: 1 | 2 | 3;
  issuedAt: string;
  acknowledgedAt?: string;
  source: 'auto_shift' | 'manual' | 'acknowledge';
}

/** Matches server TargetWarningsState on user_targets.targetWarnings */
export interface TargetWarningMissContext {
  orgLocalDateYmd: string;
  dailyCalls: number | null;
  dailyVisits: number | null;
  dailyLeads: number | null;
  actualCalls: number;
  actualVisits: number;
  actualLeads: number;
  missedVisits: boolean;
  missedCallsLeadsEngagement: boolean;
}

export interface TargetWarningsPayload {
  /** Active warning tier; omitted when cleared but history retained. */
  level?: 1 | 2 | 3;
  issuedAt?: string;
  acknowledgedLevel?: number;
  acknowledgedAt?: string;
  lastShiftEvalOrgYmd?: string;
  /** Quotas/actuals from the shift day that last escalated the active tier. */
  lastMiss?: TargetWarningMissContext;
  history?: TargetWarningHistoryEntry[];
}

/** POST /user/:ref/target/performance-warning/acknowledge */
export interface AcknowledgePerformanceWarningResponse {
  message: string;
  /** Present when API returns persisted JSON (omit on legacy proxies). */
  targetWarnings?: TargetWarningsPayload;
}

/** Partial update body for PATCH /user/:ref/target. Matches server UpdateUserTargetDto. */
export interface PatchUserTargetBody {
  targetSalesAmount?: number;
  targetQuotationsAmount?: number;
  currentSalesAmount?: number;
  currentQuotationsAmount?: number;
  currentOrdersAmount?: number;
  targetCurrency?: string;
  targetHoursWorked?: number;
  currentHoursWorked?: number;
  targetNewClients?: number;
  currentNewClients?: number;
  targetNewLeads?: number;
  currentNewLeads?: number;
  targetCheckIns?: number;
  currentCheckIns?: number;
  targetCalls?: number;
  currentCalls?: number;
  targetPeriod?: string;
  periodStartDate?: string;
  periodEndDate?: string;
  isRecurring?: boolean;
  recurringInterval?: 'daily' | 'weekly' | 'monthly';
  carryForwardUnfulfilled?: boolean;
  baseSalary?: number;
  carInstalment?: number;
  carInsurance?: number;
  fuel?: number;
  primaryVehicleAssetUid?: number | null;
  cellPhoneAllowance?: number;
  carMaintenance?: number;
  cgicCosts?: number;
  totalCost?: number;
  erpSalesRepCode?: string | null;
  targetWarnings?: TargetWarningsPayload | null;
}

export interface UserTargetMetricProgress {
  name?: string;
  target?: number | null;
  current?: number | null;
  remaining?: number | null;
  progress?: number | null;
  currency?: string | null;
  unit?: string | null;
}

export interface UserTargetPersonalTargets {
  uid?: number;
  sales?: UserTargetMetricProgress;
  quotations?: UserTargetMetricProgress;
  hours?: UserTargetMetricProgress;
  newClients?: UserTargetMetricProgress;
  newLeads?: UserTargetMetricProgress;
  checkIns?: UserTargetMetricProgress;
  calls?: UserTargetMetricProgress;
  targetPeriod?: string | null;
  periodStartDate?: string | Date | null;
  periodEndDate?: string | Date | null;
  targetCurrency?: string | null;
  targetWarnings?: TargetWarningsPayload | null;
  [key: string]: unknown;
}

export interface UserTargetDashboardShape {
  personalTargets?: UserTargetPersonalTargets;
  hasPersonalTargets?: boolean;
  [key: string]: unknown;
}

export interface SubThresholdDailyCallUserRow {
  uid: number;
  clerkUserId: string | null;
  fullName: string;
  email: string;
  callCount: number;
  /** Owned lead activity count for the org-local day (same window as callCount). */
  leadCount: number;
  targetWarnings: TargetWarningsPayload | null;
}

export interface GetSubThresholdDailyCallsResponse {
  message: string;
  date: string;
  minCalls: number;
  users: SubThresholdDailyCallUserRow[];
}

/** GET /user/performance/engagement-range */
export interface EngagementRangeUserRow {
  uid: number;
  clerkUserId: string | null;
  callCount: number;
  visitCount: number;
  leadCount: number;
}

export interface GetEngagementRangeResponse {
  message: string;
  from: string;
  to: string;
  users: EngagementRangeUserRow[];
}

export interface GetUserTargetResponse {
  userTarget: UserTargetDashboardShape | Record<string, unknown> | null;
  message: string;
}

/** GET /user/:ref/preferences - user preferences (theme, language, notifications, etc.). */
export interface ReportsDashboardPreferences {
  rememberSettings?: boolean;
  startDate?: string;
  endDate?: string;
  branchId?: string;
  userId?: string;
  country?: string;
}

/** Competitor Overview / map simulation prefs persisted on the user. */
export interface VisualiserUserPreferences {
  opportunityMode?: 'both' | 'catchment' | 'greenfield';
  opportunitySettings?: {
    radiusMeters?: number;
    topN?: number;
    minBranchSeparationKm?: number;
    captureLowPct?: number;
    captureHighPct?: number;
    repTargetMonthlyZAR?: number;
  };
  turnoverOverrides?: {
    brandTurnoverOverrides?: Record<string, number>;
    categoryTurnoverOverrides?: Record<string, number>;
  };
  selectedCountry?: string;
  selectedProvince?: string;
  showOpportunities?: boolean;
  showSalesRepLocations?: boolean;
  repLocationsMaxAgeHours?: number;
}

export interface GetUserPreferencesResponse {
  preferences: {
    theme?: string;
    language?: string;
    notifications?: boolean;
    shiftAutoEnd?: boolean;
    notificationFrequency?: string;
    dateFormat?: string;
    timeFormat?: string;
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    biometricAuth?: boolean;
    advancedFeatures?: boolean;
    timezone?: string;
    calendarSync?: {
      enabled?: boolean;
      preferredProvider?: 'google' | 'microsoft' | 'auto';
      defaultDurationMinutes?: number;
    };
    reportsDashboard?: ReportsDashboardPreferences;
    visualiser?: VisualiserUserPreferences;
  };
  message: string;
}

/**
 * GET /user - list org-scoped users (paginated).
 */
export async function getUsers(
  client: AxiosInstance,
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    branchId?: number;
    status?: string;
  }
): Promise<GetUsersResponse> {
  const search = new URLSearchParams();
  if (params?.page != null) search.set('page', String(params.page));
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.search) search.set('search', params.search);
  if (params?.branchId != null) search.set('branchId', String(params.branchId));
  if (params?.status) search.set('status', params.status);
  const qs = search.toString();
  const { data } = await client.get<GetUsersResponse>(`/user${qs ? `?${qs}` : ''}`);
  return data;
}

/**
 * GET /user/:ref - get user by uid or Clerk user ID.
 * @param includeDeleted - if true, includes soft-deleted users (for settings restore/permanent-delete flow)
 * @param includeAssignedClients - if false, omits assignedClients from response (default true)
 */
export async function getUserByRef(
  client: AxiosInstance,
  ref: string,
  options?: { includeDeleted?: boolean; includeAssignedClients?: boolean }
): Promise<GetUserByRefResponse> {
  const params = new URLSearchParams();
  if (options?.includeDeleted) params.set('includeDeleted', 'true');
  if (options?.includeAssignedClients === false) params.set('includeAssignedClients', 'false');
  const qs = params.toString();
  const { data } = await client.get<GetUserByRefResponse>(`/user/${ref}${qs ? `?${qs}` : ''}`);
  return data;
}

/**
 * PATCH /user/:ref - update user. Send only fields to update.
 */
export async function patchUser(
  client: AxiosInstance,
  ref: string,
  body: PatchUserBody
): Promise<{ message: string; user: UserResponse }> {
  const { data } = await client.patch<{ message: string; user: UserResponse }>(
    `/user/${ref}`,
    body
  );
  return data;
}

/** POST /user/invite — create Clerk user, sync DB, send welcome email. */
export interface InviteUserBody {
  name: string;
  surname: string;
  email: string;
  phone?: string;
  role?: string;
  accessLevel?: string;
  workforceType?: string;
  branchId?: number;
}

export interface InviteUserResponse {
  message: string;
  user: {
    uid: number;
    email: string;
    clerkUserId: string;
    userref: string | null;
  };
  warnings?: string[];
}

export async function inviteUser(
  client: AxiosInstance,
  body: InviteUserBody
): Promise<InviteUserResponse> {
  const { data } = await client.post<InviteUserResponse>('/user/invite', body);
  return data;
}

/** POST /user/admin/:userId/provision — link existing DB user to Clerk. */
export async function provisionUser(
  client: AxiosInstance,
  userId: number | string
): Promise<InviteUserResponse> {
  const { data } = await client.post<InviteUserResponse>(
    `/user/admin/${userId}/provision`
  );
  return data;
}

/** POST /user/admin/:userId/re-invite — resend invitation email. */
export interface ReInviteUserResponse {
  success: boolean;
  message: string;
  data: {
    userId: string;
    email: string;
    sentBy?: string;
  };
}

export async function reInviteUser(
  client: AxiosInstance,
  userId: number | string
): Promise<ReInviteUserResponse> {
  const { data } = await client.post<ReInviteUserResponse>(
    `/user/admin/${userId}/re-invite`
  );
  return data;
}

/** Response shape for delete/restore endpoints. */
export interface UserMessageResponse {
  message: string;
}

/**
 * DELETE /user/:ref - soft delete (remove from system). User can be restored later.
 */
export async function deleteUser(
  client: AxiosInstance,
  ref: string
): Promise<UserMessageResponse> {
  const { data } = await client.delete<UserMessageResponse>(`/user/${ref}`);
  return data;
}

/**
 * PATCH /user/restore/:ref - restore a soft-deleted user.
 */
export async function restoreUser(
  client: AxiosInstance,
  ref: string
): Promise<UserMessageResponse> {
  const { data } = await client.patch<UserMessageResponse>(`/user/restore/${ref}`);
  return data;
}

/**
 * DELETE /user/:ref/permanent - permanently delete user (must be soft-deleted first). Irreversible.
 */
export async function deleteUserPermanently(
  client: AxiosInstance,
  ref: string
): Promise<UserMessageResponse> {
  const { data } = await client.delete<UserMessageResponse>(`/user/${ref}/permanent`);
  return data;
}

/**
 * GET /user/:ref/target - get user targets (full payload).
 */
export async function getUserTarget(
  client: AxiosInstance,
  ref: string
): Promise<GetUserTargetResponse> {
  const { data } = await client.get<GetUserTargetResponse>(`/user/${ref}/target`);
  return data;
}

/**
 * POST /user/:ref/target/performance-warning/acknowledge — self only.
 */
export async function postAcknowledgePerformanceWarning(
  client: AxiosInstance,
  ref: string
): Promise<AcknowledgePerformanceWarningResponse> {
  const { data } = await client.post<AcknowledgePerformanceWarningResponse>(
    `/user/${ref}/target/performance-warning/acknowledge`,
    {}
  );
  return data;
}

export interface ClearSelectedPerformanceWarningsBody {
  clearActive?: boolean;
  removeHistoryIndexes?: number[];
}

export interface ClearSelectedPerformanceWarningsResponse {
  message: string;
  targetWarnings: TargetWarningsPayload | null;
}

/**
 * POST /user/:ref/target/performance-warning/clear — admin/manager/owner.
 * Clears active tier and/or selected history indexes; unselected history stays.
 */
export async function clearSelectedPerformanceWarnings(
  client: AxiosInstance,
  ref: string,
  body: ClearSelectedPerformanceWarningsBody
): Promise<ClearSelectedPerformanceWarningsResponse> {
  const { data } = await client.post<ClearSelectedPerformanceWarningsResponse>(
    `/user/${ref}/target/performance-warning/clear`,
    body
  );
  return data;
}

/**
 * GET /user/performance/sub-threshold-daily-calls — managers; org from token.
 */
export async function getSubThresholdDailyCalls(
  client: AxiosInstance,
  params: { date: string; branchId?: number; minCalls?: number }
): Promise<GetSubThresholdDailyCallsResponse> {
  const { data } = await client.get<GetSubThresholdDailyCallsResponse>(
    '/user/performance/sub-threshold-daily-calls',
    {
      params: {
        date: params.date,
        ...(params.branchId != null ? { branchId: params.branchId } : {}),
        ...(params.minCalls != null ? { minCalls: params.minCalls } : {}),
      },
      timeout: 120_000,
    }
  );
  return data;
}

/**
 * GET /user/performance/engagement-range — org calls/visits/leads for [from, to].
 */
export async function getEngagementRange(
  client: AxiosInstance,
  params: { from: string; to: string; branchId?: number }
): Promise<GetEngagementRangeResponse> {
  const { data } = await client.get<GetEngagementRangeResponse>(
    '/user/performance/engagement-range',
    {
      params: {
        from: params.from,
        to: params.to,
        ...(params.branchId != null ? { branchId: params.branchId } : {}),
      },
      timeout: 120_000,
    }
  );
  return data;
}

/** GET /user/:ref/daily-productivity — matches server DailyProductivityDayRow */
export interface DailyProductivityDay {
  date: string;
  score: number | null;
  components?: {
    salesPct?: number;
    visitsPct?: number;
    callsPct?: number;
    leadsPct?: number;
    invoicesPct?: number;
  };
}

export interface GetDailyProductivityResponse {
  message: string;
  days: DailyProductivityDay[];
}

/**
 * GET /user/:ref/daily-productivity — daily score vs targets (ERP + visits/calls/leads).
 */
export async function getDailyProductivity(
  client: AxiosInstance,
  ref: string,
  params: { startDate: string; endDate: string }
): Promise<GetDailyProductivityResponse> {
  const { data } = await client.get<GetDailyProductivityResponse>(
    `/user/${ref}/daily-productivity`,
    { params: { startDate: params.startDate, endDate: params.endDate } }
  );
  return data;
}

/** GET /user/:ref/bonus-status — year-end bonus eligibility */
export type BonusEligibilityStatus =
  | 'eligible'
  | 'at_risk'
  | 'disqualified'
  | 'not_applicable';

export interface BonusStatusResponse {
  message: string;
  status: BonusEligibilityStatus;
  disqualificationReasons: string[];
  bonusYear: { start: string; end: string; label: string };
  position: {
    key: string;
    label: string;
    callsPerDay: number;
    visitsPerDay: number | null;
  } | null;
  ytdPerformancePct: number | null;
  consecutiveMonthsBelowMin: number;
  consecutiveMonthsLowAttendance: number;
  consecutiveMonthsExcessLates: number;
  months: Array<{
    yyyyMm: string;
    performancePct: number | null;
    metMinimum: boolean;
    attendancePct: number | null;
    lateCount: number;
    requiredCalls: number;
    achievedCalls: number;
    requiredVisits: number | null;
    achievedVisits: number;
    workingDays: number;
    isPartialMonth: boolean;
  }>;
  today: {
    date: string;
    requiredCalls: number;
    achievedCalls: number;
    requiredVisits: number | null;
    achievedVisits: number;
    dayPct: number | null;
  } | null;
  sources: { crmOnly: true };
}

/**
 * GET /user/:ref/bonus-status — year-end performance bonus progress and eligibility.
 */
export async function getBonusStatus(
  client: AxiosInstance,
  ref: string,
  params?: { asOf?: string }
): Promise<BonusStatusResponse> {
  const { data } = await client.get<BonusStatusResponse>(`/user/${ref}/bonus-status`, {
    params: params?.asOf ? { asOf: params.asOf } : undefined,
  });
  return data;
}

/**
 * PATCH /user/:ref/target - update user targets. Ref can be numeric uid string (e.g. "45").
 */
export async function patchUserTarget(
  client: AxiosInstance,
  ref: string,
  body: PatchUserTargetBody
): Promise<{ message: string }> {
  const { data } = await client.patch<{ message: string }>(`/user/${ref}/target`, body);
  return data;
}

/**
 * GET /user/:ref/preferences - get user preferences (theme, language, notifications, etc.).
 */
export async function getUserPreferences(
  client: AxiosInstance,
  ref: string
): Promise<GetUserPreferencesResponse> {
  const { data } = await client.get<GetUserPreferencesResponse>(`/user/${ref}/preferences`);
  return data;
}

/** PATCH /user/:ref/preferences - partial update of user preferences. */
export async function patchUserPreferences(
  client: AxiosInstance,
  ref: string,
  body: Record<string, unknown>
): Promise<{ message: string }> {
  const { data } = await client.patch<{ message: string }>(`/user/${ref}/preferences`, body);
  return data;
}

/** POST /user/:ref/plan-client-visits — batch weekly visit tasks for selected clients. */
export interface PlanClientVisitsBody {
  startDate: string;
  visitDaysOfWeek: number[];
  batchSize?: number;
  clientIds?: number[];
  repetitionType?: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  repetitionDeadline?: string;
}

export interface PlanClientVisitsBatchResult {
  batchIndex: number;
  visitDate: string;
  clientIds: number[];
  tasksCreated: number;
}

export interface PlanClientVisitsRecurrenceSummary {
  repetitionType: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  repetitionDeadline: string;
  estimatedInstancesPerClient: number;
}

export interface PlanClientVisitsResponse {
  message: string;
  batches: PlanClientVisitsBatchResult[];
  newlyAssignedClientIds?: number[];
  warnings?: string[];
  recurrenceSummary?: PlanClientVisitsRecurrenceSummary;
}

export async function planClientVisits(
  client: AxiosInstance,
  ref: string | number,
  body: PlanClientVisitsBody
): Promise<PlanClientVisitsResponse> {
  const { data } = await client.post<PlanClientVisitsResponse>(
    `/user/${ref}/plan-client-visits`,
    body
  );
  return data;
}

/** GET /user/:ref/visit-plan-schedules — active visit-plan tasks grouped by date. */
export interface VisitPlanScheduleTask {
  uid: number;
  title: string;
  status: string;
  clientUid?: number;
  clientName?: string;
  repetitionType?: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  repetitionDeadline?: string;
  repetitionSeriesId?: string;
}

export interface VisitPlanScheduleSlot {
  visitDate: string;
  tasks: VisitPlanScheduleTask[];
}

export interface VisitPlanSchedulesResponse {
  message: string;
  slots: VisitPlanScheduleSlot[];
  totalActiveTasks: number;
}

export async function getUserVisitPlanSchedules(
  client: AxiosInstance,
  ref: string | number
): Promise<VisitPlanSchedulesResponse> {
  const { data } = await client.get<VisitPlanSchedulesResponse>(
    `/user/${ref}/visit-plan-schedules`
  );
  return data;
}

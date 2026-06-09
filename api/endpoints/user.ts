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
  userTarget?: Record<string, unknown> | null;
  isDeleted?: boolean;
  clerkUserId?: string | null;
  [key: string]: unknown;
}

export interface GetUserByRefResponse {
  message: string;
  user: UserResponse | null;
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
  branch?: { uid: number };
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

/** Matches server TargetWarningsState on user_targets.targetWarnings */
export interface TargetWarningsPayload {
  level: 1 | 2 | 3;
  issuedAt?: string;
  acknowledgedLevel?: number;
  acknowledgedAt?: string;
  lastShiftEvalOrgYmd?: string;
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
  cellPhoneAllowance?: number;
  carMaintenance?: number;
  cgicCosts?: number;
  totalCost?: number;
  erpSalesRepCode?: string;
  targetWarnings?: TargetWarningsPayload | null;
}

export interface UserTargetPersonalTargets {
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
  targetWarnings: TargetWarningsPayload | null;
}

export interface GetSubThresholdDailyCallsResponse {
  message: string;
  date: string;
  minCalls: number;
  users: SubThresholdDailyCallUserRow[];
}

export interface GetUserTargetResponse {
  userTarget: UserTargetDashboardShape | Record<string, unknown> | null;
  message: string;
}

/** GET /user/:ref/preferences - user preferences (theme, language, notifications, etc.). */
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
  };
  message: string;
}

/**
 * GET /user - list org-scoped users (paginated).
 */
export async function getUsers(
  client: AxiosInstance,
  params?: { page?: number; limit?: number; search?: string; branchId?: number }
): Promise<GetUsersResponse> {
  const search = new URLSearchParams();
  if (params?.page != null) search.set('page', String(params.page));
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.search) search.set('search', params.search);
  if (params?.branchId != null) search.set('branchId', String(params.branchId));
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

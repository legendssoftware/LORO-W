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
  organisationRef?: string | null;
  branchUid?: number | null;
  branch?: { uid: number; name?: string } | null;
  userref?: string | null;
  hrID?: number | null;
  managedBranches?: number[];
  managedStaff?: number[];
  userProfile?: Record<string, unknown> | null;
  userEmployeementProfile?: Record<string, unknown> | null;
  isDeleted?: boolean;
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
  role?: string;
  status?: string;
  accessLevel?: string;
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
}

/**
 * GET /user - list org-scoped users (paginated).
 */
export async function getUsers(
  client: AxiosInstance,
  params?: { page?: number; limit?: number; search?: string }
): Promise<GetUsersResponse> {
  const search = new URLSearchParams();
  if (params?.page != null) search.set('page', String(params.page));
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.search) search.set('search', params.search);
  const qs = search.toString();
  const { data } = await client.get<GetUsersResponse>(`/user${qs ? `?${qs}` : ''}`);
  return data;
}

/**
 * GET /user/:ref - get user by uid or Clerk user ID.
 * @param includeDeleted - if true, includes soft-deleted users (for settings restore/permanent-delete flow)
 */
export async function getUserByRef(
  client: AxiosInstance,
  ref: string,
  options?: { includeDeleted?: boolean }
): Promise<GetUserByRefResponse> {
  const params = new URLSearchParams();
  if (options?.includeDeleted) params.set('includeDeleted', 'true');
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

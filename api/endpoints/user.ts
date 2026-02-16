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
 */
export async function getUserByRef(
  client: AxiosInstance,
  ref: string
): Promise<GetUserByRefResponse> {
  const { data } = await client.get<GetUserByRefResponse>(`/user/${ref}`);
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

import type { AxiosInstance } from 'axios';
import type { GetBranchesResponse } from '@/api/types/branch';

/**
 * GET /branch - org-scoped list of branches (for user modal branch dropdown).
 */
export async function getBranches(
  client: AxiosInstance
): Promise<GetBranchesResponse> {
  const { data } = await client.get<GetBranchesResponse>('/branch');
  return data;
}

export interface PatchBranchBody {
  name?: string;
  alias?: string;
  email?: string;
  phone?: string;
  contactPerson?: string;
  website?: string;
  status?: string;
  country?: string;
  address?: {
    street?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
}

/**
 * PATCH /branch/:ref — update branch (elevated org roles).
 */
export async function patchBranch(
  client: AxiosInstance,
  branchRef: string,
  body: PatchBranchBody
): Promise<{ message: string }> {
  const { data } = await client.patch<{ message: string }>(
    `/branch/${encodeURIComponent(branchRef)}`,
    body
  );
  return data;
}


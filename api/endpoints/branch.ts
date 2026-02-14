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

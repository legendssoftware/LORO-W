import type { AxiosInstance } from 'axios';

export type TeamCompositionSlice = {
  name: string;
  value: number;
};

export interface SalesTeamCompositionResponse {
  message: string;
  total: number;
  byGender: TeamCompositionSlice[];
  byWorkforce: TeamCompositionSlice[];
}

/**
 * GET /user/team-composition — sales workforce gender + internal/external counts.
 */
export async function getSalesTeamComposition(
  client: AxiosInstance,
  params?: { branchId?: number }
): Promise<SalesTeamCompositionResponse> {
  const search = new URLSearchParams();
  if (params?.branchId != null) search.set('branchId', String(params.branchId));
  const qs = search.toString();
  const { data } = await client.get<SalesTeamCompositionResponse>(
    `/user/team-composition${qs ? `?${qs}` : ''}`
  );
  return data;
}

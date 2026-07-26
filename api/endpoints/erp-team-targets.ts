import type { AxiosInstance } from 'axios';

export interface TeamTargetSales {
  target?: number;
  current?: number;
  remaining?: number;
  progress?: number;
}

export interface TeamTargetMember {
  userId?: number;
  fullName?: string;
  email?: string;
  branchName?: string | null;
  hasTargets?: boolean;
  targets?: {
    sales?: TeamTargetSales;
  };
  sales?: {
    totalRevenue?: number;
    transactionCount?: number;
    uniqueCustomers?: number;
  };
}

export interface TeamTargetsSummary {
  totalTarget?: number;
  totalAchieved?: number;
  teamSize?: number;
}

export interface TeamTargetsData {
  teamMembers: TeamTargetMember[];
  summary?: TeamTargetsSummary;
  periodStartDate?: string;
  periodEndDate?: string;
  usingDefaultDates?: boolean;
}

export interface TeamTargetsResponse {
  success?: boolean;
  data?: TeamTargetsData;
}

/**
 * GET /erp/team/targets — bulk team sales targets vs achieved.
 */
export async function getTeamTargets(
  client: AxiosInstance
): Promise<TeamTargetsResponse> {
  const { data } = await client.get<TeamTargetsResponse>('/erp/team/targets');
  return data;
}

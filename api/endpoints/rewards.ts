import type { AxiosInstance } from 'axios';

export interface RewardRanking {
  reference?: string;
  name?: string;
  xp?: number;
  rank?: number;
}

export async function getRewardsLeaderboard(client: AxiosInstance): Promise<RewardRanking[]> {
  const { data } = await client.get<{ data?: RewardRanking[] } | RewardRanking[]>('/rewards/leaderboard');
  return Array.isArray(data) ? data : data.data ?? [];
}

export async function getRewardsRankings(client: AxiosInstance): Promise<RewardRanking[]> {
  const { data } = await client.get<{ data?: RewardRanking[] } | RewardRanking[]>('/rewards/rankings', {
    params: { by: 'xp' },
  });
  return Array.isArray(data) ? data : data.data ?? [];
}

export async function getRewardUserStats(client: AxiosInstance, reference: string): Promise<Record<string, unknown>> {
  const { data } = await client.get(`/rewards/user-stats/${reference}`);
  return data ?? {};
}

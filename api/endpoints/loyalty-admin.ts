import type { AxiosInstance } from 'axios';

export interface LoyaltyProfile { uid?: number; name?: string; points?: number; tier?: string }
export interface LoyaltyReward { uid?: number; name: string; pointsRequired?: number; rewardType?: string }

export async function listLoyaltyProfiles(client: AxiosInstance): Promise<LoyaltyProfile[]> {
  const { data } = await client.get<{ data?: LoyaltyProfile[] } | LoyaltyProfile[]>('/loyalty/profiles');
  return Array.isArray(data) ? data : data.data ?? [];
}

export async function listLoyaltyRewards(client: AxiosInstance): Promise<LoyaltyReward[]> {
  const { data } = await client.get<{ data?: LoyaltyReward[] } | LoyaltyReward[]>('/loyalty/rewards');
  return Array.isArray(data) ? data : data.data ?? [];
}

export async function createLoyaltyReward(
  client: AxiosInstance,
  payload: { name: string; rewardType: string; pointsRequired: number }
): Promise<{ message?: string }> {
  const { data } = await client.post('/loyalty/rewards', payload);
  return data;
}

export async function getLoyaltyAnalytics(client: AxiosInstance): Promise<Record<string, unknown>> {
  const { data } = await client.get('/loyalty/analytics');
  return data ?? {};
}

export async function listLoyaltyTransactions(client: AxiosInstance): Promise<Array<{ uid?: number; type?: string }>> {
  const { data } = await client.get('/loyalty/transactions');
  if (Array.isArray(data)) return data;
  return data?.data ?? [];
}

export async function listLoyaltyBroadcasts(client: AxiosInstance): Promise<Array<{ uid?: number; subject?: string }>> {
  const { data } = await client.get('/loyalty/broadcast/history');
  if (Array.isArray(data)) return data;
  return data?.data ?? [];
}

export async function claimLoyaltyReward(client: AxiosInstance, rewardId: number): Promise<{ message?: string }> {
  const { data } = await client.post(`/loyalty/rewards/${rewardId}/claim`, { rewardId });
  return data;
}

import type { AxiosInstance } from 'axios';

export interface RewardRanking {
  reference?: string;
  name?: string;
  xp?: number;
  rank?: number;
}

function asRankings(payload: unknown): RewardRanking[] {
  if (Array.isArray(payload)) return payload.map(normalizeRanking);
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as { data?: unknown; leaderboard?: unknown; rankings?: unknown };
  const nested = record.leaderboard ?? record.rankings ?? record.data;
  if (Array.isArray(nested)) return nested.map(normalizeRanking);
  if (nested && typeof nested === 'object') {
    const inner = nested as { leaderboard?: unknown; rankings?: unknown };
    const list = inner.leaderboard ?? inner.rankings;
    if (Array.isArray(list)) return list.map(normalizeRanking);
  }
  return [];
}

function personDisplayName(
  person: { name?: string; surname?: string; username?: string } | undefined,
): string {
  if (!person) return '';
  const full = [person.name, person.surname].filter(Boolean).join(' ').trim();
  if (full) return full;
  return person.username?.trim() ?? '';
}

function normalizeRanking(row: unknown): RewardRanking {
  if (!row || typeof row !== 'object') return {};
  const item = row as {
    reference?: string;
    name?: string;
    xp?: number | { totalXP?: number };
    points?: number;
    rank?: number;
    position?: number;
    owner?: { name?: string; surname?: string; username?: string };
    user?: { name?: string; surname?: string; username?: string; uid?: number };
  };
  const xpValue = typeof item.xp === 'number' ? item.xp : item.xp?.totalXP ?? item.points ?? 0;
  const displayName =
    item.name?.trim() ||
    personDisplayName(item.user) ||
    personDisplayName(item.owner) ||
    undefined;
  return {
    reference: item.reference ?? (item.user?.uid != null ? String(item.user.uid) : undefined),
    name: displayName,
    xp: xpValue,
    rank: item.rank ?? item.position,
  };
}

export async function getRewardsLeaderboard(client: AxiosInstance): Promise<RewardRanking[]> {
  const { data } = await client.get('/rewards/leaderboard');
  return asRankings(data);
}

export async function getRewardsRankings(client: AxiosInstance): Promise<RewardRanking[]> {
  const { data } = await client.get('/rewards/rankings', { params: { by: 'xp', full: true } });
  return asRankings(data);
}

export async function getRewardUserStats(client: AxiosInstance, reference: string): Promise<Record<string, unknown>> {
  const { data } = await client.get(`/rewards/user-stats/${reference}`);
  return data ?? {};
}

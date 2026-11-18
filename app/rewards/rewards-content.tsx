'use client';

import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useApiClient, useSessionSync, useTokenReady } from '@/api/hooks';
import { getRewardsLeaderboard, getRewardsRankings } from '@/api/endpoints/rewards';
import { FeatureDenied, FeatureShell } from '@/components/feature-page';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { canAccessRewards } from '@/lib/access';

const chartConfig = { xp: { label: 'XP', color: 'var(--chart-4)' } } satisfies ChartConfig;

export function RewardsContent() {
  const { isTokenReady } = useTokenReady();
  const { isSyncing: isLoading, backendUserData } = useSessionSync();
  const ready = isTokenReady && !isLoading;
  const client = useApiClient();
  const board = useQuery({ queryKey: ['rewards', 'leaderboard'], queryFn: () => getRewardsLeaderboard(client), enabled: ready });
  const rankings = useQuery({ queryKey: ['rewards', 'rankings'], queryFn: () => getRewardsRankings(client), enabled: ready });
  const rows = board.data?.length ? board.data : rankings.data ?? [];
  if (ready && !canAccessRewards(backendUserData?.accessLevel)) return <FeatureDenied title="Rewards" />;
  return (
    <FeatureShell tourId="rewards" title="Rewards" description="Leaderboard and a person's XP." isLoading={!ready || board.isLoading} isError={board.isError && rankings.isError} error={board.error} onRetry={() => void board.refetch()} isEmpty={rows.length === 0} emptyMessage="No rankings yet.">
      <ChartContainer config={chartConfig} className="h-48 w-full">
        <BarChart data={rows.slice(0, 8).map((row) => ({ name: row.name ?? row.reference ?? 'Person', xp: row.xp ?? 0 }))}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} />
          <YAxis width={32} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="xp" fill="var(--color-xp)" radius={4} />
        </BarChart>
      </ChartContainer>
    </FeatureShell>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useApiClient, useSessionSync, useTokenReady } from '@/api/hooks';
import { getRewardsLeaderboard, getRewardsRankings } from '@/api/endpoints/rewards';
import { FeatureDenied, FeatureShell } from '@/components/feature-page';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { canAccessRewards } from '@/lib/access';
import { useTranslation } from 'react-i18next';

const chartConfig = { xp: { label: 'XP', color: 'var(--chart-4)' } } satisfies ChartConfig;

export function RewardsContent() {
  const { t } = useTranslation('screens');
  const { isTokenReady } = useTokenReady();
  const { isSyncing: isLoading, backendUserData } = useSessionSync();
  const ready = isTokenReady && !isLoading;
  const client = useApiClient();
  const board = useQuery({ queryKey: ['rewards', 'leaderboard'], queryFn: () => getRewardsLeaderboard(client), enabled: ready });
  const rankings = useQuery({ queryKey: ['rewards', 'rankings'], queryFn: () => getRewardsRankings(client), enabled: ready });
  const boardRows = Array.isArray(board.data) ? board.data : [];
  const rankingRows = Array.isArray(rankings.data) ? rankings.data : [];
  const rows = boardRows.length > 0 ? boardRows : rankingRows;
  const chartRows = rows.slice(0, 8).map((row, index) => ({
    name: row.name?.trim() || row.reference || `#${row.rank ?? index + 1}`,
    xp: row.xp ?? 0,
  }));
  if (ready && !canAccessRewards(backendUserData?.accessLevel)) return <FeatureDenied title={t('pages.rewards.title')} />;
  return (
    <FeatureShell tourId="rewards" title={t('pages.rewards.title')} description={t('pages.rewards.description')} isLoading={!ready || board.isLoading} isError={board.isError && rankings.isError} error={board.error} onRetry={() => void board.refetch()} isEmpty={rows.length === 0} emptyMessage="No rankings yet.">
      <ChartContainer config={chartConfig} className="h-56 w-full">
        <BarChart data={chartRows} margin={{ bottom: 28 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={56}
            tick={{ fontSize: 11 }}
          />
          <YAxis width={36} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="xp" fill="var(--color-xp)" radius={4} />
        </BarChart>
      </ChartContainer>
    </FeatureShell>
  );
}

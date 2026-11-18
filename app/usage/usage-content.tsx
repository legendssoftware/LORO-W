'use client';

import { useSessionSync, useTokenReady } from '@/api/hooks';
import { getLicenseUsage, getUsageAnalytics, getUsageSummaries } from '@/api/endpoints/usage-tracking';
import { useApiClient } from '@/api/hooks/use-api-client';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { FeatureDenied, FeatureShell } from '@/components/feature-page';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { canAccessUsage } from '@/lib/access';

const chartConfig = { value: { label: 'Requests', color: 'var(--chart-3)' } } satisfies ChartConfig;

export function UsageContent() {
  const { isTokenReady } = useTokenReady();
  const { isSyncing: isLoading, backendUserData } = useSessionSync();
  const ready = isTokenReady && !isLoading;
  const client = useApiClient();
  const end = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const orgRef = backendUserData?.organisationRef ?? backendUserData?.organisation?.ref ?? '';
  const analytics = useQuery({
    queryKey: ['usage', 'analytics', start, end],
    queryFn: () => getUsageAnalytics(client, start, end),
    enabled: ready,
  });
  const summaries = useQuery({
    queryKey: ['usage', 'summaries', start, end],
    queryFn: () => getUsageSummaries(client, start, end),
    enabled: ready,
  });
  const license = useQuery({
    queryKey: ['usage', 'license', orgRef, start, end],
    queryFn: () => getLicenseUsage(client, orgRef, start, end),
    enabled: ready && Boolean(orgRef),
  });
  const trends = analytics.data?.data?.trends ?? [];
  const series = trends.map((point) => ({
    name: point.date.slice(0, 10),
    value: Number(point.requests) || 0,
  }));
  const summaryRows = (summaries.data?.data ?? []).map((row) => ({
    endpoint: row.endpoint ?? 'Endpoint',
    count: row.totalRequests ?? 0,
  }));
  const endpointRows = summaryRows.length > 0
    ? summaryRows
    : (analytics.data?.data?.topEndpoints ?? []).map((row) => ({
        endpoint: row.endpoint || 'Endpoint',
        count: Number(row.requests) || 0,
      }));
  const licenseSummary = license.data?.data;
  const hasUsage = series.some((point) => point.value > 0) || endpointRows.some((row) => row.count > 0) || (licenseSummary?.totalRequests ?? 0) > 0;
  const failed = analytics.isError || summaries.isError || license.isError;

  if (ready && !canAccessUsage(backendUserData?.accessLevel)) return <FeatureDenied title="Usage" />;

  return (
    <FeatureShell
      tourId="usage"
      title="Usage"
      description="Analytics, summaries, and license usage. The server records events itself."
      isLoading={!ready || analytics.isLoading || summaries.isLoading || license.isLoading}
      isError={failed}
      error={analytics.error ?? summaries.error ?? license.error}
      onRetry={() => {
        void analytics.refetch();
        void summaries.refetch();
        void license.refetch();
      }}
      isEmpty={!hasUsage}
      emptyMessage="No usage in the last 30 days."
    >
      {series.length > 0 ? (
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <BarChart data={series}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} width={32} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" fill="var(--color-value)" radius={4} />
          </BarChart>
        </ChartContainer>
      ) : null}
      {licenseSummary ? (
        <p className="text-sm text-muted-foreground">
          {licenseSummary.totalRequests} requests · {licenseSummary.errorRate}% errors · {licenseSummary.licenseUsage?.totalQuotaConsumed ?? 0} license quota
        </p>
      ) : null}
      <ul className="space-y-1 text-sm">
        {endpointRows.map((row, index) => (
          <li key={`${row.endpoint}-${index}`}>{row.endpoint} · {row.count}</li>
        ))}
      </ul>
    </FeatureShell>
  );
}

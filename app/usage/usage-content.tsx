'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useSessionSync, useTokenReady } from '@/api/hooks';
import { getLicenseUsage, getUsageAnalytics, getUsageSummaries } from '@/api/endpoints/usage-tracking';
import { useApiClient } from '@/api/hooks/use-api-client';
import { useQuery } from '@tanstack/react-query';
import { FeatureDenied, FeatureShell } from '@/components/feature-page';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { canAccessUsage } from '@/lib/access';
import { useTranslation } from 'react-i18next';

const chartConfig = { count: { label: 'Requests', color: 'var(--chart-3)' } } satisfies ChartConfig;

export function UsageContent() {
  const { t } = useTranslation('screens');
  const { isTokenReady } = useTokenReady();
  const { isSyncing: isLoading, backendUserData } = useSessionSync();
  const ready = isTokenReady && !isLoading;
  const allowed = canAccessUsage(backendUserData?.accessLevel);
  const client = useApiClient();
  const end = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const orgRef = backendUserData?.organisationRef ?? backendUserData?.organisation?.ref ?? '';
  const analytics = useQuery({
    queryKey: ['usage', 'analytics', start, end],
    queryFn: () => getUsageAnalytics(client, start, end),
    enabled: ready && allowed,
  });
  const summaries = useQuery({
    queryKey: ['usage', 'summaries', start, end],
    queryFn: () => getUsageSummaries(client, start, end),
    enabled: ready && allowed,
  });
  const license = useQuery({
    queryKey: ['usage', 'license', orgRef, start, end],
    queryFn: () => getLicenseUsage(client, orgRef, start, end),
    enabled: ready && Boolean(orgRef) && allowed,
  });
  const summaryRows = (summaries.data?.data ?? []).map((row) => ({
    endpoint: row.endpoint ?? 'Endpoint',
    count: row.totalRequests ?? 0,
  }));
  const endpointRows = (summaryRows.length > 0
    ? summaryRows
    : (analytics.data?.data?.topEndpoints ?? []).map((row) => ({
        endpoint: row.endpoint || 'Endpoint',
        count: Number(row.requests) || 0,
      }))
  ).filter((row) => row.count > 0);
  const licenseSummary = license.data?.data;
  const hasUsage = endpointRows.length > 0 || (licenseSummary?.totalRequests ?? 0) > 0;
  const failed = analytics.isError || summaries.isError || license.isError;

  if (ready && !allowed) return <FeatureDenied title={t('pages.usage.title')} />;

  return (
    <FeatureShell
      tourId="usage"
      title={t('pages.usage.title')}
      description={t('pages.usage.description')}
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
      {endpointRows.length > 0 ? (
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <BarChart data={endpointRows.slice(0, 20)} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="endpoint" width={220} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={4} />
          </BarChart>
        </ChartContainer>
      ) : null}
      {licenseSummary ? (
        <p className="text-sm text-muted-foreground">
          {licenseSummary.totalRequests} requests · {licenseSummary.errorRate}% errors · {licenseSummary.licenseUsage?.totalQuotaConsumed ?? 0} license quota
        </p>
      ) : null}
    </FeatureShell>
  );
}

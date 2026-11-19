'use client';

import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { CircleDot, MessageSquare } from 'lucide-react';
import { useSessionSync, useTokenReady } from '@/api/hooks';
import { useFeedbackInbox, useFeedbackStats, useUpdateFeedbackMutation } from '@/api/hooks/use-feedback';
import { FeatureDenied, FeatureShell } from '@/components/feature-page';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { canAccessFeedback } from '@/lib/access';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const chartConfig = { value: { label: 'Items', color: 'var(--chart-2)' } } satisfies ChartConfig;

export function FeedbackContent() {
  const { t } = useTranslation('screens');
  const { isTokenReady } = useTokenReady();
  const { isSyncing: isLoading, backendUserData } = useSessionSync();
  const ready = isTokenReady && !isLoading;
  const [status, setStatus] = useState('all');
  const list = useFeedbackInbox(status === 'all' ? undefined : status, { enabled: ready });
  const stats = useFeedbackStats(backendUserData?.organisation?.ref ?? backendUserData?.uid, { enabled: ready });
  const update = useUpdateFeedbackMutation();
  const rows = list.data ?? [];
  const byStatus = stats.data?.byStatus;
  const chart = Array.isArray(byStatus)
    ? byStatus.map((item) => ({ name: item.name, value: item.value }))
    : Object.entries(byStatus ?? {}).map(([name, value]) => ({ name, value: Number(value) || 0 }));

  if (ready && !canAccessFeedback(backendUserData?.accessLevel)) return <FeatureDenied title={t('pages.feedback.title')} />;

  return (
    <FeatureShell
      tourId="feedback"
      title={t('pages.feedback.title')}
      description={t('pages.feedback.description')}
      filters={
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <CircleDot className="size-4 text-muted-foreground" aria-hidden />
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {['all', 'NEW', 'IN_REVIEW', 'RESOLVED', 'CLOSED'].map((item) => (
              <SelectItem key={item} value={item}>
                <CircleDot className="size-4" aria-hidden />
                {item === 'all' ? 'All statuses' : item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
      isLoading={!ready || list.isLoading}
      isError={list.isError}
      error={list.error}
      onRetry={() => void list.refetch()}
      isEmpty={rows.length === 0}
      emptyMessage="No feedback matches this filter."
    >
      {chart.length > 0 ? (
        <ChartContainer config={chartConfig} className="h-40 w-full">
          <BarChart data={chart}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} width={32} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" fill="var(--color-value)" radius={4} />
          </BarChart>
        </ChartContainer>
      ) : null}
      <Table>
        <TableHeader><TableRow><TableHead>{t('tables.title')}</TableHead><TableHead>{t('tables.status')}</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>
          {rows.map((row) => {
            const id = row.uid ?? row.id ?? 0;
            return (
              <TableRow key={id}>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <MessageSquare className="size-4 text-muted-foreground" aria-hidden />
                    {row.title ?? row.comments ?? 'Feedback'}
                  </span>
                </TableCell>
                <TableCell>{row.status ?? '—'}</TableCell>
                <TableCell>
                  <Button type="button" size="sm" variant="outline" onClick={() => {
                    void update.mutateAsync({ id, status: 'RESOLVED' }).then(
                      () => toast.success('Marked resolved'),
                      (error: unknown) => toast.error(getQueryErrorMessage(error, 'Could not update'))
                    );
                  }}>Resolve</Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </FeatureShell>
  );
}

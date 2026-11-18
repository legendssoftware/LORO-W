'use client';

import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
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

const chartConfig = { value: { label: 'Items', color: 'var(--chart-2)' } } satisfies ChartConfig;

export function FeedbackContent() {
  const { isTokenReady } = useTokenReady();
  const { isSyncing: isLoading, backendUserData } = useSessionSync();
  const ready = isTokenReady && !isLoading;
  const [status, setStatus] = useState('all');
  const list = useFeedbackInbox(status === 'all' ? undefined : status, { enabled: ready });
  const stats = useFeedbackStats(backendUserData?.organisation?.ref ?? backendUserData?.uid, { enabled: ready });
  const update = useUpdateFeedbackMutation();
  const rows = list.data ?? [];
  const chart = (stats.data?.byStatus ?? []).map((item) => ({ name: item.name, value: item.value }));

  if (ready && !canAccessFeedback(backendUserData?.accessLevel)) return <FeatureDenied title="Feedback" />;

  return (
    <FeatureShell
      tourId="feedback"
      title="Feedback"
      description="Inbox, counts, and status updates. Token expiry stays on Settings."
      filters={
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['all', 'NEW', 'IN_REVIEW', 'RESOLVED', 'CLOSED'].map((item) => (
              <SelectItem key={item} value={item}>{item === 'all' ? 'All statuses' : item}</SelectItem>
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
        <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>
          {rows.map((row) => {
            const id = row.uid ?? row.id ?? 0;
            return (
              <TableRow key={id}>
                <TableCell>{row.title ?? row.comments ?? 'Feedback'}</TableCell>
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

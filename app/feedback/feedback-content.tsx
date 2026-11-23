'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { CircleDot, MessageSquare, Search } from 'lucide-react';
import { useSessionSync, useTokenReady } from '@/api/hooks';
import { useFeedbackInbox, useFeedbackStats, useUpdateFeedbackMutation } from '@/api/hooks/use-feedback';
import { FeatureDenied, FeatureShell } from '@/components/feature-page';
import {
  ListViewToggle,
  StandardEntityCard,
  StandardEntityGrid,
  StandardListPagination,
  useStandardListPagination,
  type StandardListViewMode,
} from '@/components/standard-list';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Input, filterToolbarSearchInputClassName } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { canAccessFeedback } from '@/lib/access';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const chartConfig = { value: { label: 'Items', color: 'var(--chart-2)' } } satisfies ChartConfig;
const PAGE_SIZE_KEY = 'loro:feedback-page-size';

export function FeedbackContent() {
  const { t } = useTranslation('screens');
  const { isTokenReady } = useTokenReady();
  const { isSyncing: isLoading, backendUserData } = useSessionSync();
  const ready = isTokenReady && !isLoading;
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<StandardListViewMode>('list');
  const list = useFeedbackInbox(status === 'all' ? undefined : status, { enabled: ready });
  const stats = useFeedbackStats(backendUserData?.organisation?.ref ?? backendUserData?.uid, { enabled: ready });
  const update = useUpdateFeedbackMutation();

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (list.data ?? []).filter((row) => {
      if (!query) return true;
      const title = `${row.title ?? ''} ${row.comments ?? ''} ${row.status ?? ''}`.toLowerCase();
      return title.includes(query);
    });
  }, [list.data, search]);

  const { page, pageSize, total, totalPages, pageItems, setPage, handlePageSizeChange } =
    useStandardListPagination({
      items: filteredRows,
      storageKey: PAGE_SIZE_KEY,
      resetKey: `${status}|${search}`,
    });

  const byStatus = stats.data?.byStatus;
  const chart = Array.isArray(byStatus)
    ? byStatus.map((item) => ({ name: item.name, value: item.value }))
    : Object.entries(byStatus ?? {}).map(([name, value]) => ({ name, value: Number(value) || 0 }));

  if (ready && !canAccessFeedback(backendUserData?.accessLevel)) {
    return <FeatureDenied title={t('pages.feedback.title')} />;
  }

  function resolveRow(id: number) {
    void update.mutateAsync({ id, status: 'RESOLVED' }).then(
      () => toast.success(t('chrome.feedback.markedResolved')),
      (error: unknown) => toast.error(getQueryErrorMessage(error, t('chrome.feedback.couldNotUpdate'))),
    );
  }

  return (
    <FeatureShell
      tourId="feedback"
      title={t('pages.feedback.title')}
      description={t('pages.feedback.description')}
      filters={
        <>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px]">
              <CircleDot className="size-4 text-muted-foreground" aria-hidden />
              <SelectValue placeholder={t('actions.allStatuses')} />
            </SelectTrigger>
            <SelectContent>
              {(['all', 'NEW', 'IN_REVIEW', 'RESOLVED', 'CLOSED'] as const).map((item) => (
                <SelectItem key={item} value={item}>
                  <CircleDot className="size-4" aria-hidden />
                  {item === 'all' ? t('actions.allStatuses') : t(`chrome.feedback.status.${item}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ListViewToggle value={viewMode} onChange={setViewMode} />
        </>
      }
      search={
        <div className="relative w-56">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('chrome.feedback.fallbackTitle')}
            aria-label={t('chrome.feedback.fallbackTitle')}
            className={`${filterToolbarSearchInputClassName} pl-8`}
          />
        </div>
      }
      isLoading={!ready || list.isLoading}
      isError={list.isError}
      error={list.error}
      onRetry={() => void list.refetch()}
      isEmpty={filteredRows.length === 0}
      emptyMessage={t('chrome.feedback.noMatch')}
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
      {viewMode === 'list' ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('tables.title')}</TableHead>
              <TableHead>{t('tables.status')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((row) => {
              const id = row.uid ?? row.id ?? 0;
              return (
                <TableRow key={id}>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <MessageSquare className="size-4 text-muted-foreground" aria-hidden />
                      {row.title ?? row.comments ?? t('chrome.feedback.fallbackTitle')}
                    </span>
                  </TableCell>
                  <TableCell>
                    {row.status ? t(`chrome.feedback.status.${row.status}`, { defaultValue: row.status }) : '—'}
                  </TableCell>
                  <TableCell>
                    <Button type="button" size="sm" variant="outline" onClick={() => resolveRow(id)}>
                      {t('chrome.feedback.resolve')}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <StandardEntityGrid dataTour="feedback-grid">
          {pageItems.map((row) => {
            const id = row.uid ?? row.id ?? 0;
            return (
              <StandardEntityCard key={id}>
                <div className="flex items-start gap-3">
                  <MessageSquare className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">
                      {row.title ?? row.comments ?? t('chrome.feedback.fallbackTitle')}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {row.status ? t(`chrome.feedback.status.${row.status}`, { defaultValue: row.status }) : '—'}
                    </p>
                  </div>
                </div>
                <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => resolveRow(id)}>
                  {t('chrome.feedback.resolve')}
                </Button>
              </StandardEntityCard>
            );
          })}
        </StandardEntityGrid>
      )}
      <StandardListPagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        isFetching={list.isFetching && !list.isLoading}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        dataTour="feedback-pagination"
        className="rounded-lg border border-border"
      />
    </FeatureShell>
  );
}

'use client';

import { useMemo } from 'react';
import { useSessionSync, useUserTarget, useLeadsReport, useCheckIns } from '@/api/hooks';
import type { VisitListItem } from '@/api/types/visits';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/components/loading-spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PipelineCharts } from './pipeline-charts';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function toYmd(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v.split('T')[0];
  if (v instanceof Date) return v.toISOString().split('T')[0];
  return undefined;
}

function defaultCalendarMonthRange(): { from: string; to: string } {
  const n = new Date();
  const y = n.getFullYear();
  const mo = n.getMonth();
  const pad = (x: number) => String(x).padStart(2, '0');
  const from = `${y}-${pad(mo + 1)}-01`;
  const lastDay = new Date(y, mo + 1, 0).getDate();
  const to = `${y}-${pad(mo + 1)}-${pad(lastDay)}`;
  return { from, to };
}

function normalizeRange(from: string, to: string): { from: string; to: string } {
  return from <= to ? { from, to } : { from: to, to: from };
}

function resolvePeriod(
  envelope: Record<string, unknown> | null
): { from: string; to: string; fromTargets: boolean } {
  if (!envelope) {
    const d = defaultCalendarMonthRange();
    return { ...d, fromTargets: false };
  }
  const pt = envelope.personalTargets;
  if (!isRecord(pt)) {
    const d = defaultCalendarMonthRange();
    return { ...d, fromTargets: false };
  }
  const start = toYmd(pt.periodStartDate);
  const end = toYmd(pt.periodEndDate);
  if (!start || !end) {
    const d = defaultCalendarMonthRange();
    return { ...d, fromTargets: false };
  }
  return { ...normalizeRange(start, end), fromTargets: true };
}

function formatCurrency(value: number, currency: string): string {
  return `${currency} ${value.toLocaleString('en-ZA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatCurrencyMapLine(map: Map<string, number>): string {
  if (map.size === 0) return '—';
  if (map.size === 1) {
    const [cur, amt] = [...map.entries()][0]!;
    return formatCurrency(amt, cur);
  }
  return [...map.entries()].map(([cur, amt]) => formatCurrency(amt, cur)).join(' · ');
}

function formatNumber(value: number, unit?: string): string {
  const s = value.toLocaleString('en-ZA', { maximumFractionDigits: unit === 'hours' ? 1 : 0 });
  return unit ? `${s} ${unit}` : s;
}

function pct(current: number, target: number): number {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

type MetricKey =
  | 'sales'
  | 'quotations'
  | 'newLeads'
  | 'checkIns'
  | 'calls'
  | 'hours'
  | 'newClients';

/** Fixed pipeline row: four cards (matches dashboard expectations). */
const TARGET_ROW_KEYS = ['sales', 'newLeads', 'checkIns', 'calls'] as const satisfies readonly MetricKey[];

const TARGET_ROW_LABELS: Record<(typeof TARGET_ROW_KEYS)[number], string> = {
  sales: 'Sales',
  newLeads: 'New Leads',
  checkIns: 'Check Ins',
  calls: 'Calls',
};

function parseMetric(pt: Record<string, unknown>, key: MetricKey) {
  const block = pt[key];
  if (!isRecord(block)) return null;
  const targetRaw = block.target;
  const currentRaw = block.current;
  const target = typeof targetRaw === 'number' ? targetRaw : Number(targetRaw);
  const current = typeof currentRaw === 'number' ? currentRaw : Number(currentRaw);
  if (!Number.isFinite(target) || target <= 0) return null;
  const name = typeof block.name === 'string' ? block.name : key;
  const unit = typeof block.unit === 'string' ? block.unit : undefined;
  const currency = typeof block.currency === 'string' ? block.currency : 'ZAR';
  const progressPct =
    typeof block.progress === 'number' && Number.isFinite(block.progress)
      ? Math.min(100, Math.round(block.progress))
      : pct(Number.isFinite(current) ? current : 0, target);
  return {
    name,
    target,
    current: Number.isFinite(current) ? current : 0,
    progressPct,
    unit,
    currency,
    isMoney: key === 'sales' || key === 'quotations',
  };
}

function visitQuotationNumber(v: VisitListItem): string | null {
  const raw = (v as Record<string, unknown>).quotationNumber;
  if (raw == null) return null;
  const s = String(raw).trim();
  return s.length ? s : null;
}

function visitLeadUid(v: VisitListItem): number | null {
  const raw = (v as Record<string, unknown>).leadUid;
  if (raw == null) return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

function visitSalesNumber(v: VisitListItem): number | null {
  const raw = v.salesValue;
  if (raw == null) return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

function visitSalesCurrency(v: VisitListItem): string {
  const raw = (v as Record<string, unknown>).salesCurrency;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : 'ZAR';
}

function aggregateSalesByCurrency(visits: VisitListItem[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const v of visits) {
    const n = visitSalesNumber(v);
    if (n == null || n <= 0) continue;
    const c = visitSalesCurrency(v);
    map.set(c, (map.get(c) ?? 0) + n);
  }
  return map;
}

function aggregateQuotationValueByCurrency(visits: VisitListItem[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const v of visits) {
    const q = v.quotation;
    if (!q || q.totalAmount == null) continue;
    const amt = typeof q.totalAmount === 'number' ? q.totalAmount : Number(q.totalAmount);
    if (!Number.isFinite(amt) || amt <= 0) continue;
    const cur =
      typeof q.currency === 'string' && q.currency.trim() ? q.currency.trim() : 'ZAR';
    map.set(cur, (map.get(cur) ?? 0) + amt);
  }
  return map;
}

export function PipelineContent() {
  const { backendUserData: profile, isSyncing } = useSessionSync();
  const userRef = profile?.uid != null ? String(profile.uid) : null;

  const targetQuery = useUserTarget(userRef, {
    enabled: !isSyncing && !!userRef,
  });

  const envelope = useMemo(() => {
    const raw = targetQuery.data?.userTarget;
    return raw && isRecord(raw) ? raw : null;
  }, [targetQuery.data?.userTarget]);

  const period = useMemo(() => resolvePeriod(envelope), [envelope]);

  const reportQuery = useLeadsReport(
    {
      from: period.from,
      to: period.to,
      dateBasis: 'activity',
    },
    { enabled: !!userRef && !!period.from && !!period.to }
  );

  const checkInsQuery = useCheckIns(
    {
      startDate: period.from,
      endDate: period.to,
      userUid: userRef ?? undefined,
    },
    { enabled: !!userRef && !!period.from && !!period.to }
  );

  const personalTargets = useMemo(() => {
    if (!envelope?.personalTargets || !isRecord(envelope.personalTargets)) return null;
    return envelope.personalTargets;
  }, [envelope]);

  const visitStats = useMemo(() => {
    const list = checkInsQuery.data?.checkIns ?? [];
    let withSale = 0;
    let withQuote = 0;
    let withLead = 0;
    for (const v of list) {
      const n = visitSalesNumber(v);
      if (n != null && n > 0) withSale++;
      if (visitQuotationNumber(v)) withQuote++;
      if (visitLeadUid(v) != null) withLead++;
    }
    const salesByCur = aggregateSalesByCurrency(list);
    const quotationByCur = aggregateQuotationValueByCurrency(list);
    return {
      total: list.length,
      withSale,
      withQuote,
      withLead,
      salesByCur,
      quotationByCur,
    };
  }, [checkInsQuery.data?.checkIns]);

  const statusRows = useMemo(() => {
    const byStatus = reportQuery.data?.byStatus ?? [];
    const valueByStatus = reportQuery.data?.valueByStatus ?? [];
    const valueMap = new Map(valueByStatus.map((x) => [x.name, x.value]));
    const rows = byStatus.map((row) => ({
      name: row.name,
      count: row.value,
      value: valueMap.get(row.name) ?? 0,
    }));
    return rows.sort((a, b) => {
      if (a.name === 'CONVERTED') return -1;
      if (b.name === 'CONVERTED') return 1;
      return b.count - a.count;
    });
  }, [reportQuery.data?.byStatus, reportQuery.data?.valueByStatus]);

  const convertedRow = useMemo(
    () => statusRows.find((r) => r.name === 'CONVERTED'),
    [statusRows]
  );

  const targetCurrency = useMemo(() => {
    if (
      personalTargets &&
      typeof personalTargets.targetCurrency === 'string' &&
      personalTargets.targetCurrency.trim()
    ) {
      return personalTargets.targetCurrency.trim();
    }
    const sales = personalTargets?.sales;
    if (isRecord(sales) && typeof sales.currency === 'string' && sales.currency.trim()) {
      return sales.currency.trim();
    }
    return 'ZAR';
  }, [personalTargets]);

  if (!userRef) {
    return (
      <p className="text-sm text-muted-foreground">Sign in and sync your profile to view pipeline.</p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {personalTargets && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Targets &amp; progress</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {TARGET_ROW_KEYS.map((key) => {
              const m = parseMetric(personalTargets, key);
              const title = m?.name ?? TARGET_ROW_LABELS[key];
              return (
                <Card key={key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {m ? (
                      <>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>
                            {m.isMoney
                              ? formatCurrency(m.current, m.currency)
                              : formatNumber(m.current, m.unit)}
                          </span>
                          <span>
                            of{' '}
                            {m.isMoney
                              ? formatCurrency(m.target, m.currency)
                              : formatNumber(m.target, m.unit)}
                          </span>
                        </div>
                        <Progress value={m.progressPct} className="h-2" />
                        <p className="text-xs text-muted-foreground">{m.progressPct}% of target</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground py-1">No target set</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Lead pipeline</h2>
            {reportQuery.isError ? (
              <p className="text-sm text-destructive">
                Could not load lead analytics. You may not have access to leads for this org, or the
                service is unavailable.
              </p>
            ) : reportQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Summary</CardTitle>
                  <CardDescription>Activity in range · lead values are estimates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-6 text-sm">
                    <div>
                      <p className="text-muted-foreground">Leads</p>
                      <p className="text-2xl font-semibold tabular-nums">
                        {reportQuery.data?.total ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pipeline value</p>
                      <p className="text-2xl font-semibold tabular-nums">
                        {formatCurrency(reportQuery.data?.totalEstimatedValue ?? 0, targetCurrency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Visits</p>
                      <p className="text-2xl font-semibold tabular-nums">{visitStats.total}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Visits value (quotes)</p>
                      <p className="text-2xl font-semibold tabular-nums">
                        {formatCurrencyMapLine(visitStats.quotationByCur)}
                      </p>
                    </div>
                    {convertedRow && (
                      <div>
                        <p className="text-muted-foreground">Converted</p>
                        <p className="text-2xl font-semibold tabular-nums">{convertedRow.count}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(convertedRow.value, targetCurrency)}
                        </p>
                      </div>
                    )}
                  </div>

                  <PipelineCharts
                    statusRows={statusRows}
                    totalLeads={reportQuery.data?.total ?? 0}
                    totalEstimatedValue={reportQuery.data?.totalEstimatedValue ?? 0}
                    personalTargets={personalTargets}
                    visitStats={visitStats}
                    targetCurrency={targetCurrency}
                  />

                  {statusRows.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right">Est. value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statusRows.map((row) => (
                          <TableRow
                            key={row.name}
                            className={row.name === 'CONVERTED' ? 'bg-emerald-500/5' : undefined}
                          >
                            <TableCell className="font-medium">
                              {row.name}
                              {row.name === 'CONVERTED' && (
                                <span className="ml-2 text-xs font-normal text-muted-foreground">
                                  (CRM won)
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(row.value, targetCurrency)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
      </section>

      <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Visits</h2>
            {checkInsQuery.isError ? (
              <p className="text-sm text-destructive">Could not load visits for this period.</p>
            ) : checkInsQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Outcomes</CardTitle>
                  <CardDescription>Check-outs in range</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <ul className="grid gap-2 sm:grid-cols-2">
                    <li>
                      <span className="text-muted-foreground">Total </span>
                      <span className="font-semibold tabular-nums">{visitStats.total}</span>
                    </li>
                    <li>
                      <span className="text-muted-foreground">Sale on checkout </span>
                      <span className="font-semibold tabular-nums">{visitStats.withSale}</span>
                    </li>
                    <li>
                      <span className="text-muted-foreground">With quote </span>
                      <span className="font-semibold tabular-nums">{visitStats.withQuote}</span>
                    </li>
                    <li>
                      <span className="text-muted-foreground">Linked lead </span>
                      <span className="font-semibold tabular-nums">{visitStats.withLead}</span>
                    </li>
                  </ul>
                  {visitStats.quotationByCur.size > 0 && (
                    <div>
                      <p className="text-muted-foreground mb-1">Quote value (linked)</p>
                      <ul className="space-y-1">
                        {[...visitStats.quotationByCur.entries()].map(([cur, amt]) => (
                          <li key={cur} className="tabular-nums font-medium">
                            {formatCurrency(amt, cur)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {visitStats.salesByCur.size > 0 && (
                    <div>
                      <p className="text-muted-foreground mb-1">Checkout sales</p>
                      <ul className="space-y-1">
                        {[...visitStats.salesByCur.entries()].map(([cur, amt]) => (
                          <li key={cur} className="tabular-nums font-medium">
                            {formatCurrency(amt, cur)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
      </section>
    </div>
  );
}

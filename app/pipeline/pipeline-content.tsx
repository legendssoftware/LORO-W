'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  useSessionSync,
  useUserTarget,
  useLeadsReport,
  useCheckIns,
  useProfileQuotations,
  useShopQuotations,
  useUsers,
} from '@/api/hooks';
import type { VisitListItem } from '@/api/types/visits';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input, filterToolbarSearchInputClassName } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { CalendarIcon, XIcon, UsersIcon, BriefcaseIcon } from '@/lib/icons';
import { ChevronRight, Filter } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  isPipelineLeadsOrgWide,
  isPipelineVisitsOrgWide,
} from '@/lib/pipeline-scope';
import { PipelineCharts } from './pipeline-charts';
import {
  formatUtcYmd,
  utcMonthStartThroughToday,
} from '@/app/reports/utils/overview-daily-summary';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function toYmd(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v.split('T')[0];
  if (v instanceof Date) return v.toISOString().split('T')[0];
  return undefined;
}

/** Fallback when targets/envelope omit period: Reports-style UTC MTD (1st UTC → today UTC). */
function defaultUtcMonthToDateStrings(): { from: string; to: string } {
  const { start, end } = utcMonthStartThroughToday();
  return { from: formatUtcYmd(start), to: formatUtcYmd(end) };
}

function normalizeRange(from: string, to: string): { from: string; to: string } {
  return from <= to ? { from, to } : { from: to, to: from };
}

function resolvePeriod(
  envelope: Record<string, unknown> | null
): { from: string; to: string; fromTargets: boolean } {
  if (!envelope) {
    const d = defaultUtcMonthToDateStrings();
    return { ...d, fromTargets: false };
  }
  const pt = envelope.personalTargets;
  if (!isRecord(pt)) {
    const d = defaultUtcMonthToDateStrings();
    return { ...d, fromTargets: false };
  }
  const start = toYmd(pt.periodStartDate);
  const end = toYmd(pt.periodEndDate);
  if (!start || !end) {
    const d = defaultUtcMonthToDateStrings();
    return { ...d, fromTargets: false };
  }
  return { ...normalizeRange(start, end), fromTargets: true };
}

/** Inclusive UTC calendar-day range: compare ISO date prefix against `yyyy-MM-dd` bounds. */
function isCreatedAtInPeriod(createdAt: string | undefined, fromYmd: string, toYmdUpper: string): boolean {
  const createdYmd = toYmd(createdAt);
  if (!createdYmd || !/^\d{4}-\d{2}-\d{2}$/.test(fromYmd) || !/^\d{4}-\d{2}-\d{2}$/.test(toYmdUpper)) return false;
  return createdYmd >= fromYmd && createdYmd <= toYmdUpper;
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

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function ymdToDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function isYmdInRange(value: string | undefined, fromYmd: string, toYmd: string): boolean {
  if (!value) return false;
  return value >= fromYmd && value <= toYmd;
}

function userDisplayName(user: Record<string, unknown>): string {
  const name = normalizeString(user.name);
  const surname = normalizeString(user.surname);
  const full = [name, surname].filter(Boolean).join(' ').trim();
  if (full) return full;
  const username = normalizeString(user.username);
  if (username) return username;
  const email = normalizeString(user.email);
  if (email) return email;
  const uid = user.uid;
  return uid != null ? `User ${String(uid)}` : 'Unknown user';
}

function extractErpSalesCodes(user: Record<string, unknown>): string[] {
  const codes = new Set<string>();
  const direct = normalizeString(user.erpSalesRepCode);
  if (direct) codes.add(direct.toUpperCase());
  const target = isRecord(user.userTarget) ? user.userTarget : null;
  if (target) {
    const nested = normalizeString(target.erpSalesRepCode);
    if (nested) codes.add(nested.toUpperCase());
    const pt = isRecord(target.personalTargets) ? target.personalTargets : null;
    const ptCode = pt ? normalizeString(pt.erpSalesRepCode) : '';
    if (ptCode) codes.add(ptCode.toUpperCase());
  }
  return [...codes];
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

interface ErpQuotationRowView {
  key: string;
  docNumber: string;
  saleDate: string;
  saleDateYmd: string;
  store: string;
  repName: string;
  totalIncl: number;
}

interface ErpQuotationGroupView {
  key: string;
  repName: string;
  rows: ErpQuotationRowView[];
  totalIncl: number;
}

export function PipelineContent() {
  const { backendUserData: profile, isSyncing } = useSessionSync();
  const userRef = profile?.uid != null ? String(profile.uid) : null;
  const accessLevel =
    profile?.accessLevel != null ? String(profile.accessLevel) : undefined;

  const leadsOrgWide = isPipelineLeadsOrgWide(accessLevel);
  const visitsOrgWide = isPipelineVisitsOrgWide(accessLevel);

  const targetQuery = useUserTarget(userRef, {
    enabled: !isSyncing && !!userRef,
  });

  const envelope = useMemo(() => {
    const raw = targetQuery.data?.userTarget;
    return raw && isRecord(raw) ? raw : null;
  }, [targetQuery.data?.userTarget]);

  const period = useMemo(() => resolvePeriod(envelope), [envelope]);
  const [allowErpQueries, setAllowErpQueries] = useState(false);

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
      ...(visitsOrgWide ? {} : { userUid: userRef ?? undefined }),
    },
    { enabled: !!userRef && !!period.from && !!period.to }
  );

  const quotationsLoadEnabled = !!userRef && !!period.from && !!period.to && allowErpQueries;

  const profileQuotationsQuery = useProfileQuotations({
    enabled: quotationsLoadEnabled,
    month: period.fromTargets ? undefined : period.from.slice(0, 7),
  });

  const shopQuotationsQuery = useShopQuotations({
    enabled: quotationsLoadEnabled,
  });
  const usersQuery = useUsers({
    enabled: quotationsLoadEnabled,
    limit: 200,
  });

  const loroInPeriod = useMemo(() => {
    const list = shopQuotationsQuery.data ?? [];
    return list.filter((q) => isCreatedAtInPeriod(q.createdAt, period.from, period.to));
  }, [shopQuotationsQuery.data, period.from, period.to]);

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

  const [erpDateRangePopoverOpen, setErpDateRangePopoverOpen] = useState(false);
  const [erpDateStart, setErpDateStart] = useState(period.from);
  const [erpDateEnd, setErpDateEnd] = useState(period.to);
  const [erpSelectedUser, setErpSelectedUser] = useState('all');
  const [erpSelectedStore, setErpSelectedStore] = useState('all');
  const [erpSearch, setErpSearch] = useState('');
  const [expandedRepKey, setExpandedRepKey] = useState<string | null>(null);
  const [erpVisibleByGroup, setErpVisibleByGroup] = useState<Record<string, number>>({});
  const [erpFiltersDialogOpen, setErpFiltersDialogOpen] = useState(false);

  useEffect(() => {
    setErpDateStart(period.from);
    setErpDateEnd(period.to);
  }, [period.from, period.to]);

  useEffect(() => {
    function onResize() {
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        setErpFiltersDialogOpen(false);
      }
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setAllowErpQueries(false);
  }, [period.from, period.to, userRef]);

  useEffect(() => {
    if (!reportQuery.isLoading) {
      setAllowErpQueries(true);
    }
  }, [reportQuery.isLoading]);

  const erpSalesCodeToName = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of usersQuery.data ?? []) {
      if (!isRecord(item)) continue;
      const displayName = userDisplayName(item);
      for (const code of extractErpSalesCodes(item)) {
        if (!map.has(code)) map.set(code, displayName);
      }
    }
    return map;
  }, [usersQuery.data]);

  const erpDateRange = useMemo(() => {
    return normalizeRange(erpDateStart, erpDateEnd);
  }, [erpDateStart, erpDateEnd]);

  const erpRows = useMemo<ErpQuotationRowView[]>(() => {
    const source = profileQuotationsQuery.data?.quotations ?? [];
    const profileName = normalizeString(profileQuotationsQuery.data?.salesName);
    return source.map((row, idx) => {
      const repCode = normalizeString(row.salesCode).toUpperCase();
      const repFromUsers = repCode ? erpSalesCodeToName.get(repCode) : undefined;
      const repName = repFromUsers || profileName || 'Unknown sales rep';
      return {
        key: row.key || `${row.docNumber ?? 'doc'}-${idx}`,
        docNumber: normalizeString(row.docNumber) || row.key || '—',
        saleDate: normalizeString(row.saleDate) || '—',
        saleDateYmd: normalizeString(row.saleDate).slice(0, 10),
        store: normalizeString(row.store) || '—',
        repName,
        totalIncl: Number.isFinite(row.totalIncl) ? row.totalIncl : 0,
      };
    });
  }, [profileQuotationsQuery.data?.quotations, profileQuotationsQuery.data?.salesName, erpSalesCodeToName]);

  const erpUserOptions = useMemo(() => {
    return [...new Set(erpRows.map((r) => r.repName).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [erpRows]);

  const erpStoreOptions = useMemo(() => {
    return [...new Set(erpRows.map((r) => r.store).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [erpRows]);

  const filteredErpRows = useMemo(() => {
    const term = erpSearch.trim().toLowerCase();
    return erpRows.filter((row) => {
      if (!isYmdInRange(row.saleDateYmd, erpDateRange.from, erpDateRange.to)) return false;
      if (erpSelectedUser !== 'all' && row.repName !== erpSelectedUser) return false;
      if (erpSelectedStore !== 'all' && row.store !== erpSelectedStore) return false;
      if (!term) return true;
      const haystack = `${row.repName} ${row.docNumber} ${row.store}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [erpRows, erpDateRange.from, erpDateRange.to, erpSelectedUser, erpSelectedStore, erpSearch]);

  const groupedErpRows = useMemo<ErpQuotationGroupView[]>(() => {
    const map = new Map<string, ErpQuotationRowView[]>();
    for (const row of filteredErpRows) {
      const key = row.repName || 'Unknown sales rep';
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    const groups: ErpQuotationGroupView[] = [];
    for (const [key, rows] of map.entries()) {
      const sortedRows = [...rows].sort((a, b) => {
        if (a.saleDateYmd !== b.saleDateYmd) return b.saleDateYmd.localeCompare(a.saleDateYmd);
        return b.totalIncl - a.totalIncl;
      });
      groups.push({
        key,
        repName: key,
        rows: sortedRows,
        totalIncl: sortedRows.reduce((sum, row) => sum + row.totalIncl, 0),
      });
    }
    return groups.sort((a, b) => b.rows.length - a.rows.length);
  }, [filteredErpRows]);

  useEffect(() => {
    setExpandedRepKey(null);
    setErpVisibleByGroup({});
  }, [erpDateStart, erpDateEnd, erpSelectedUser, erpSelectedStore, erpSearch]);

  if (!userRef) {
    return (
      <p className="text-sm text-muted-foreground">Sign in and sync your profile to view pipeline.</p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {personalTargets && (
        <section className="space-y-3" data-tour="pipeline-targets-section">
          <h2 className="text-base font-semibold text-foreground sm:text-lg">Targets &amp; progress</h2>
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

      <section className="space-y-3" data-tour="pipeline-quotations-section">
        <h2 className="text-base font-semibold text-foreground sm:text-lg">Quotations (ERP &amp; LORO)</h2>
        <p className="text-xs text-muted-foreground -mt-1">
          ERP: quotation documents for your profile period. LORO: app quotations with{' '}
          <span className="font-medium tabular-nums">
            {period.from} → {period.to}
          </span>
          .
        </p>
        {profileQuotationsQuery.isError || shopQuotationsQuery.isError ? (
          <p className="text-sm text-destructive">
            Could not load quotations for this period. Check ERP targets or try again.
          </p>
        ) : profileQuotationsQuery.isLoading || shopQuotationsQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-1">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">ERP quotations</CardTitle>
                <CardDescription>
                  {profileQuotationsQuery.data?.infoMessage
                    ? profileQuotationsQuery.data.infoMessage
                    : profileQuotationsQuery.data?.salesName
                      ? profileQuotationsQuery.data.salesName
                      : 'No ERP quotation data for this range'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {erpRows.length === 0 ? (
                  !profileQuotationsQuery.data?.infoMessage ? (
                    <p className="text-sm text-muted-foreground py-1">No ERP quotations in this period.</p>
                  ) : null
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 md:hidden">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 w-full justify-center gap-2 border-gray-200 bg-white text-foreground"
                        onClick={() => setErpFiltersDialogOpen(true)}
                      >
                        <Filter className="size-4 shrink-0" aria-hidden />
                        Filter
                      </Button>
                      <div className="relative w-full min-w-0">
                        <Input
                          placeholder="Search quotations..."
                          value={erpSearch}
                          onChange={(e) => setErpSearch(e.target.value)}
                          className={cn(filterToolbarSearchInputClassName, erpSearch && 'pr-8')}
                        />
                        {erpSearch ? (
                          <button
                            type="button"
                            onClick={() => setErpSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-red-50 text-red-600"
                            aria-label="Clear search"
                          >
                            <XIcon className="size-4 text-red-600" />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <Dialog open={erpFiltersDialogOpen} onOpenChange={setErpFiltersDialogOpen}>
                      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>ERP quotation filters</DialogTitle>
                          <DialogDescription>
                            Narrow ERP quotations by sale date range, store, and sales rep.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                            <div>
                              <p className="text-sm font-medium">Start date</p>
                              <Calendar
                                mode="single"
                                selected={ymdToDate(erpDateStart)}
                                onSelect={(d) => {
                                  if (!d) return;
                                  setErpDateStart(format(d, 'yyyy-MM-dd'));
                                }}
                              />
                            </div>
                            <div>
                              <p className="text-sm font-medium">End date</p>
                              <Calendar
                                mode="single"
                                selected={ymdToDate(erpDateEnd)}
                                onSelect={(d) => {
                                  if (!d) return;
                                  setErpDateEnd(format(d, 'yyyy-MM-dd'));
                                }}
                              />
                            </div>
                          </div>
                          {(erpDateStart !== period.from || erpDateEnd !== period.to) ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full sm:w-auto"
                              onClick={() => {
                                setErpDateStart(period.from);
                                setErpDateEnd(period.to);
                              }}
                            >
                              Reset to profile period
                            </Button>
                          ) : null}
                          <Select value={erpSelectedStore} onValueChange={setErpSelectedStore}>
                            <SelectTrigger className="h-9 w-full min-w-0 bg-white border-gray-200 text-foreground gap-2">
                              <BriefcaseIcon className="size-4 shrink-0" />
                              <SelectValue placeholder="All stores" />
                            </SelectTrigger>
                            <SelectContent className="z-[10001]">
                              <SelectItem value="all">All stores</SelectItem>
                              {erpStoreOptions.map((store) => (
                                <SelectItem key={store} value={store}>
                                  {store}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={erpSelectedUser} onValueChange={setErpSelectedUser}>
                            <SelectTrigger className="h-9 w-full min-w-0 bg-white border-gray-200 text-foreground gap-2">
                              <UsersIcon className="size-4 shrink-0" />
                              <SelectValue placeholder="All users" />
                            </SelectTrigger>
                            <SelectContent className="z-[10001]">
                              <SelectItem value="all">All users</SelectItem>
                              {erpUserOptions.map((user) => (
                                <SelectItem key={user} value={user}>
                                  {user}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <div className="hidden md:flex w-full min-w-0 items-center justify-between gap-3">
                      <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        <div className="flex w-max max-w-full flex-nowrap items-center gap-2">
                          <div className="flex items-center gap-0 shrink-0">
                            <Popover
                              open={erpDateRangePopoverOpen}
                              onOpenChange={setErpDateRangePopoverOpen}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-9 min-w-[180px] shrink-0 border-gray-200 bg-white text-foreground justify-center gap-2"
                                >
                                  <CalendarIcon className="size-4" />
                                  {erpDateStart === erpDateEnd
                                    ? format(ymdToDate(erpDateStart) ?? new Date(), 'MMM d, yyyy')
                                    : `${format(ymdToDate(erpDateStart) ?? new Date(), 'MMM d, yyyy')} – ${format(ymdToDate(erpDateEnd) ?? new Date(), 'MMM d, yyyy')}`}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="z-[10001] w-[80vw] max-w-[34rem] p-0"
                                align="center"
                              >
                                <div className="flex flex-col gap-3 p-2">
                                  <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                                    <div>
                                      <p className="text-sm font-medium">Start date</p>
                                      <Calendar
                                        mode="single"
                                        selected={ymdToDate(erpDateStart)}
                                        onSelect={(d) => {
                                          if (!d) return;
                                          setErpDateStart(format(d, 'yyyy-MM-dd'));
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">End date</p>
                                      <Calendar
                                        mode="single"
                                        selected={ymdToDate(erpDateEnd)}
                                        onSelect={(d) => {
                                          if (!d) return;
                                          setErpDateEnd(format(d, 'yyyy-MM-dd'));
                                          setErpDateRangePopoverOpen(false);
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                            {(erpDateStart !== period.from || erpDateEnd !== period.to) ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setErpDateStart(period.from);
                                  setErpDateEnd(period.to);
                                }}
                                className="ml-0.5 shrink-0 rounded p-0.5 hover:bg-red-50 text-red-600"
                                aria-label="Reset ERP date range"
                              >
                                <XIcon className="size-4 text-red-600" />
                              </button>
                            ) : null}
                          </div>

                          <Select value={erpSelectedStore} onValueChange={setErpSelectedStore}>
                            <SelectTrigger className="h-9 min-w-[150px] w-[200px] shrink-0 border-gray-200 bg-white text-foreground gap-2">
                              <BriefcaseIcon className="size-4 shrink-0" />
                              <SelectValue placeholder="All stores" />
                            </SelectTrigger>
                            <SelectContent className="z-[10001]">
                              <SelectItem value="all">All stores</SelectItem>
                              {erpStoreOptions.map((store) => (
                                <SelectItem key={store} value={store}>
                                  {store}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select value={erpSelectedUser} onValueChange={setErpSelectedUser}>
                            <SelectTrigger className="h-9 min-w-[150px] w-[220px] shrink-0 border-gray-200 bg-white text-foreground gap-2">
                              <UsersIcon className="size-4 shrink-0" />
                              <SelectValue placeholder="All users" />
                            </SelectTrigger>
                            <SelectContent className="z-[10001]">
                              <SelectItem value="all">All users</SelectItem>
                              {erpUserOptions.map((user) => (
                                <SelectItem key={user} value={user}>
                                  {user}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="relative w-56 min-w-0 shrink-0 md:max-w-[16rem]">
                        <Input
                          placeholder="Search quotations..."
                          value={erpSearch}
                          onChange={(e) => setErpSearch(e.target.value)}
                          className={cn(filterToolbarSearchInputClassName, erpSearch && 'pr-8')}
                        />
                        {erpSearch ? (
                          <button
                            type="button"
                            onClick={() => setErpSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-red-50 text-red-600"
                            aria-label="Clear search"
                          >
                            <XIcon className="size-4 text-red-600" />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {groupedErpRows.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-1">
                        No ERP quotations match the selected filters.
                      </p>
                    ) : (
                      <div className="rounded border overflow-x-auto bg-white">
                        <div className="divide-y divide-border">
                          {groupedErpRows.map((group, index) => {
                            const isExpanded = expandedRepKey === group.key;
                            const contentId = `erp-quotations-${group.key.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
                            const visibleCount = erpVisibleByGroup[group.key] ?? 20;
                            const visibleRows = group.rows.slice(0, visibleCount);
                            const canLoadMore = visibleCount < group.rows.length;
                            return (
                              <div
                                key={group.key}
                                className={cn('rounded-sm', isExpanded && 'ring-1 ring-green-200')}
                              >
                                <Collapsible
                                  open={isExpanded}
                                  onOpenChange={(open) => {
                                    setExpandedRepKey(open ? group.key : null);
                                    if (open) {
                                      setErpVisibleByGroup((prev) => ({
                                        ...prev,
                                        [group.key]: prev[group.key] ?? 20,
                                      }));
                                    }
                                  }}
                                >
                                  <CollapsibleTrigger
                                    asChild
                                    className="w-full"
                                    aria-expanded={isExpanded}
                                    aria-controls={contentId}
                                  >
                                    <div
                                      className={cn(
                                        'flex items-center gap-4 px-4 py-3 text-left cursor-pointer hover:bg-muted/50 transition-colors border-0 rounded-none',
                                        index % 2 === 1 ? 'bg-gray-50/80' : 'bg-white',
                                        isExpanded && 'bg-muted/30'
                                      )}
                                    >
                                      <span className="flex items-start gap-2 whitespace-normal min-w-0 flex-1">
                                        <span className="font-medium">{group.repName}</span>
                                      </span>
                                      <span className="text-sm text-muted-foreground shrink-0">
                                        {group.rows.length} quotation{group.rows.length === 1 ? '' : 's'} ·{' '}
                                        {formatCurrency(group.totalIncl, targetCurrency)}
                                      </span>
                                      <ChevronRight
                                        className={cn(
                                          'size-5 shrink-0 text-muted-foreground transition-transform',
                                          isExpanded && 'rotate-90'
                                        )}
                                        aria-hidden
                                      />
                                    </div>
                                  </CollapsibleTrigger>

                                  <CollapsibleContent id={contentId} className="overflow-hidden">
                                    <div className="bg-muted/20 border-t border-border overflow-x-auto">
                                      <Table className="min-w-max">
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Document</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Store</TableHead>
                                            <TableHead className="text-right">Total (incl.)</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody className="[&>tr:nth-child(odd)]:bg-gray-50/80">
                                          {visibleRows.map((row) => (
                                            <TableRow key={row.key}>
                                              <TableCell className="font-medium tabular-nums">
                                                {row.docNumber}
                                              </TableCell>
                                              <TableCell className="tabular-nums text-muted-foreground">
                                                {row.saleDate || '—'}
                                              </TableCell>
                                              <TableCell>{row.store || '—'}</TableCell>
                                              <TableCell className="text-right tabular-nums">
                                                {formatCurrency(row.totalIncl, targetCurrency)}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>

                                      {canLoadMore ? (
                                        <div className="flex items-center justify-center border-t border-border py-2">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 text-muted-foreground hover:text-foreground"
                                            onClick={() =>
                                              setErpVisibleByGroup((prev) => ({
                                                ...prev,
                                                [group.key]: (prev[group.key] ?? 20) + 20,
                                              }))
                                            }
                                          >
                                            Load more
                                          </Button>
                                        </div>
                                      ) : null}
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">LORO quotations</CardTitle>
                <CardDescription>
                  {loroInPeriod.length} in range · created in the app
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loroInPeriod.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-1">No LORO quotations in this period.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Number</TableHead>
                        <TableHead>Client / title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loroInPeriod.map((q) => {
                        const amtRaw = q.totalAmount;
                        const amt =
                          typeof amtRaw === 'number' ? amtRaw : Number(amtRaw ?? 0);
                        const label = q.isBlankQuotation
                          ? q.title || 'Blank quotation'
                          : q.client?.name || '—';
                        return (
                          <TableRow key={q.uid}>
                            <TableCell className="font-medium tabular-nums">
                              {q.quotationNumber || q.orderNumber || q.uid}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">{label}</TableCell>
                            <TableCell>{q.status ?? '—'}</TableCell>
                            <TableCell className="tabular-nums text-muted-foreground">
                              {q.createdAt ? toYmd(q.createdAt) : '—'}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(Number.isFinite(amt) ? amt : 0, targetCurrency)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      <section className="space-y-3" data-tour="pipeline-lead-pipeline-section">
            <h2 className="text-lg font-semibold text-foreground">Lead pipeline</h2>
            {leadsOrgWide ? (
              <p className="text-xs text-muted-foreground -mt-1">
                Organisation rollup for this date range. Totals follow server rules (e.g. owners with
                performance targets).
              </p>
            ) : null}
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

      <section className="space-y-3" data-tour="pipeline-visits-section">
            <h2 className="text-lg font-semibold text-foreground">Visits</h2>
            {visitsOrgWide ? (
              <p className="text-xs text-muted-foreground -mt-1">
                All organisation check-outs in this date range.
              </p>
            ) : null}
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

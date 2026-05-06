'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarIcon, CalendarRange, Globe } from 'lucide-react';
import type { TargetsProgressUserSummary } from '@/api/types/targets-progress';
import type { BranchListItem } from '@/api/types/branch';
import { getBranchDisplayLabel } from '@/api/types/branch';
import { useTargetsProgress } from '@/api/hooks';
import { exportToCsv } from '@/lib/utils/report-export';
import { getCountryFlag } from '@/lib/utils/country-flags';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/loading-spinner';
import { cn } from '@/lib/utils';

const selectTriggerClass =
  'h-9 w-full bg-white border-gray-200 text-foreground sm:w-auto';

function formatUtcYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function utcToday(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

function getUtcWeekRange(ref: Date): { from: string; to: string } {
  const x = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()));
  const dow = x.getUTCDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  x.setUTCDate(x.getUTCDate() + mondayOffset);
  const monday = x;
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  return { from: formatUtcYmd(monday), to: formatUtcYmd(sunday) };
}

function getUtcMonthRange(ref: Date): { from: string; to: string } {
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1));
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const end = new Date(Date.UTC(y, m, lastDay));
  return { from: formatUtcYmd(start), to: formatUtcYmd(end) };
}

function getUtcTodayRange(ref: Date): { from: string; to: string } {
  const d = formatUtcYmd(
    new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()))
  );
  return { from: d, to: d };
}

type ShortfallScope = 'day' | 'week' | 'month';

function minIsoDate(a: string, b: string): string {
  return a <= b ? a : b;
}

function utcWorkingDaysInclusive(fromYmd: string, toYmd: string): number {
  const [y1, m1, d1] = fromYmd.split('-').map(Number);
  const [y2, m2, d2] = toYmd.split('-').map(Number);
  const start = new Date(Date.UTC(y1, m1 - 1, d1));
  const end = new Date(Date.UTC(y2, m2 - 1, d2));
  if (end < start) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getUTCDay();
    if (dow >= 1 && dow <= 5) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

function simplePeriodTarget(periodTarget: number, scope: 'week' | 'month'): number {
  if (scope === 'week') return Math.round(periodTarget / 4);
  return periodTarget;
}

function trimShortfallDisplayTarget(
  baseT: number,
  rangeFrom: string,
  rangeTo: string,
  now: Date
): number {
  if (baseT <= 0) return 0;
  const todayYmd = formatUtcYmd(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  );
  const totalWd = utcWorkingDaysInclusive(rangeFrom, rangeTo);
  if (totalWd <= 0) return baseT;
  const endYmd = minIsoDate(rangeTo, todayYmd);
  if (endYmd < rangeFrom) return 0;
  const elapsedWd = utcWorkingDaysInclusive(rangeFrom, endYmd);
  return Math.round((baseT * elapsedWd) / totalWd);
}

function shortfallTrimmedTarget(
  scope: 'week' | 'month',
  periodTarget: number,
  rangeFrom: string,
  rangeTo: string,
  now: Date
): number {
  if ((periodTarget ?? 0) <= 0) return 0;
  const baseT = simplePeriodTarget(periodTarget, scope);
  return trimShortfallDisplayTarget(baseT, rangeFrom, rangeTo, now);
}

function shortfallMetricBehindTrimmed(
  scope: 'week' | 'month',
  achieved: number,
  periodTarget: number,
  rangeFrom: string,
  rangeTo: string,
  now: Date
): boolean {
  if ((periodTarget ?? 0) <= 0) return false;
  const tgt = shortfallTrimmedTarget(scope, periodTarget, rangeFrom, rangeTo, now);
  return achieved < tgt;
}

function shortfallMetricShortfallTrimmed(
  scope: 'week' | 'month',
  achieved: number,
  periodTarget: number,
  rangeFrom: string,
  rangeTo: string,
  now: Date
): number | null {
  if ((periodTarget ?? 0) <= 0) return null;
  const tgt = shortfallTrimmedTarget(scope, periodTarget, rangeFrom, rangeTo, now);
  return Math.max(0, tgt - achieved);
}

function achievedActivityTotal(u: TargetsProgressUserSummary): number {
  return u.achievedCallsInRange + u.achievedVisitsInRange;
}

function userBehindToday(u: TargetsProgressUserSummary): boolean {
  const combined = achievedActivityTotal(u);
  const behindActivity =
    u.periodTargetVisits > 0 && combined < u.cumulativeTargetVisitsEnd;
  const behindLeads = u.periodTargetLeads > 0 && u.belowCumulativeLeads;
  return behindActivity || behindLeads;
}

function userBehindOnAny(
  u: TargetsProgressUserSummary,
  scope: ShortfallScope,
  shortfallRange: { from: string; to: string },
  now: Date
): boolean {
  if (scope === 'day') return userBehindToday(u);
  return (
    shortfallMetricBehindTrimmed(
      scope,
      achievedActivityTotal(u),
      u.periodTargetVisits,
      shortfallRange.from,
      shortfallRange.to,
      now
    ) ||
    shortfallMetricBehindTrimmed(
      scope,
      u.achievedLeadsInRange,
      u.periodTargetLeads,
      shortfallRange.from,
      shortfallRange.to,
      now
    )
  );
}

const COUNTRY_GROUP_ORDER = ['SA', 'BOT', 'ZAM', 'MOZ', 'ZW'] as const;
const UNASSIGNED_GROUP_KEY = '__unassigned__';

function countrySortKey(
  u: TargetsProgressUserSummary,
  branchByUid: Map<number, BranchListItem>
): string {
  if (u.branchUid == null) return UNASSIGNED_GROUP_KEY;
  const b = branchByUid.get(u.branchUid);
  const raw = b?.country?.trim();
  if (!raw) return 'SA';
  return raw.toUpperCase();
}

function orderGroupKeys(keys: Set<string>): string[] {
  const list = [...keys];
  const standard = COUNTRY_GROUP_ORDER.filter((c) => list.includes(c));
  const other = list
    .filter((k) => k !== UNASSIGNED_GROUP_KEY && !(COUNTRY_GROUP_ORDER as readonly string[]).includes(k))
    .sort((a, b) => a.localeCompare(b));
  const tail = list.includes(UNASSIGNED_GROUP_KEY) ? [UNASSIGNED_GROUP_KEY] : [];
  return [...standard, ...other, ...tail];
}

function branchLabelForUser(
  u: TargetsProgressUserSummary,
  branchByUid: Map<number, BranchListItem>
): string {
  if (u.branchUid == null) return 'Unassigned';
  const b = branchByUid.get(u.branchUid);
  if (!b) return `Branch #${u.branchUid}`;
  return getBranchDisplayLabel(b);
}

function countryDisplayNameForUser(
  u: TargetsProgressUserSummary,
  branchByUid: Map<number, BranchListItem>
): string {
  if (u.branchUid == null) return 'Unassigned';
  const code = countrySortKey(u, branchByUid);
  if (code === UNASSIGNED_GROUP_KEY) return 'Unassigned';
  return getCountryFlag(code).name;
}

function flagForUserRow(
  u: TargetsProgressUserSummary,
  branchByUid: Map<number, BranchListItem>
): string {
  if (u.branchUid == null) return getCountryFlag('UNLISTED').flag;
  return getCountryFlag(countrySortKey(u, branchByUid)).flag;
}

function computeProgressRowMetrics(
  u: TargetsProgressUserSummary,
  scope: ShortfallScope,
  range: { from: string; to: string },
  now: Date
) {
  let ta: number;
  let tl: number;
  let sa: number | null;
  let sl: number | null;
  const achievedAct = achievedActivityTotal(u);
  if (scope === 'day') {
    ta = u.cumulativeTargetVisitsEnd;
    tl = u.cumulativeTargetLeadsEnd;
    sa =
      u.periodTargetVisits > 0
        ? Math.max(0, u.cumulativeTargetVisitsEnd - achievedAct)
        : null;
    sl = u.periodTargetLeads > 0 ? u.shortfallLeads : null;
  } else {
    ta = shortfallTrimmedTarget(scope, u.periodTargetVisits, range.from, range.to, now);
    tl = shortfallTrimmedTarget(scope, u.periodTargetLeads, range.from, range.to, now);
    sa = shortfallMetricShortfallTrimmed(
      scope,
      achievedAct,
      u.periodTargetVisits,
      range.from,
      range.to,
      now
    );
    sl = shortfallMetricShortfallTrimmed(
      scope,
      u.achievedLeadsInRange,
      u.periodTargetLeads,
      range.from,
      range.to,
      now
    );
  }
  const behind = userBehindOnAny(u, scope, range, now);
  const hasAnyMetricTarget = u.periodTargetVisits > 0 || u.periodTargetLeads > 0;
  return { ta, tl, sa, sl, achievedAct, behind, hasAnyMetricTarget };
}

type ProgressTableItem =
  | { kind: 'header'; countryKey: string }
  | { kind: 'user'; user: TargetsProgressUserSummary };

export interface ReportsCurrentProgressSectionProps {
  elevated: boolean;
  filterSuffix: { branchId?: number; userUid?: number };
  branches?: BranchListItem[];
}

export function ReportsCurrentProgressSection({
  elevated,
  filterSuffix,
  branches = [],
}: ReportsCurrentProgressSectionProps) {
  const [shortfallScope, setShortfallScope] = useState<ShortfallScope>('day');
  const [onlyBehind, setOnlyBehind] = useState(false);
  const [groupByCountry, setGroupByCountry] = useState(true);
  const [selectedProgressDay, setSelectedProgressDay] = useState<Date>(() =>
    utcToday()
  );
  const [dayPopoverOpen, setDayPopoverOpen] = useState(false);

  const shortfallRange = useMemo(() => {
    const now = new Date();
    if (shortfallScope === 'day') return getUtcTodayRange(selectedProgressDay);
    if (shortfallScope === 'week') return getUtcWeekRange(now);
    return getUtcMonthRange(now);
  }, [shortfallScope, selectedProgressDay]);

  const shortfallProgressParams = useMemo(
    () => ({
      from: shortfallRange.from,
      to: shortfallRange.to,
      bucket:
        shortfallScope === 'day'
          ? ('day' as const)
          : shortfallScope === 'week'
            ? ('week' as const)
            : ('month' as const),
      ...filterSuffix,
    }),
    [shortfallRange.from, shortfallRange.to, shortfallScope, filterSuffix]
  );

  const {
    data: shortfallData,
    isLoading: shortfallLoading,
    isError: shortfallIsError,
    error: shortfallError,
  } = useTargetsProgress(shortfallProgressParams, {
    enabled: Boolean(shortfallRange.from && shortfallRange.to),
  });

  const shortfallUsersWithTargets = useMemo(
    () => (shortfallData?.users ?? []).filter((u) => u.hasTarget),
    [shortfallData?.users]
  );

  const tableUsers = useMemo(() => {
    const list = shortfallUsersWithTargets;
    if (!elevated || !onlyBehind) return list;
    const now = new Date();
    return list.filter((u) =>
      userBehindOnAny(u, shortfallScope, shortfallRange, now)
    );
  }, [shortfallUsersWithTargets, elevated, onlyBehind, shortfallScope, shortfallRange]);

  const branchByUid = useMemo(() => {
    const m = new Map<number, BranchListItem>();
    for (const b of branches) {
      if (typeof b.uid === 'number') m.set(b.uid, b);
    }
    return m;
  }, [branches]);

  const progressTableItems = useMemo((): ProgressTableItem[] => {
    if (tableUsers.length === 0) return [];
    if (!elevated || !groupByCountry) {
      return tableUsers.map((user) => ({ kind: 'user' as const, user }));
    }
    const byKey = new Map<string, TargetsProgressUserSummary[]>();
    for (const u of tableUsers) {
      const key = countrySortKey(u, branchByUid);
      const arr = byKey.get(key) ?? [];
      arr.push(u);
      byKey.set(key, arr);
    }
    const keys = orderGroupKeys(new Set(byKey.keys()));
    const out: ProgressTableItem[] = [];
    for (const countryKey of keys) {
      out.push({ kind: 'header', countryKey });
      for (const user of byKey.get(countryKey) ?? []) {
        out.push({ kind: 'user', user });
      }
    }
    return out;
  }, [tableUsers, elevated, groupByCountry, branchByUid]);

  function downloadShortfallCsv() {
    const now = new Date();
    const users = shortfallUsersWithTargets.filter((u) =>
      elevated && onlyBehind
        ? userBehindOnAny(u, shortfallScope, shortfallRange, now)
        : true
    );
    const scopeLabel =
      shortfallScope === 'day'
        ? 'day'
        : shortfallScope === 'week'
          ? 'week'
          : 'month';
    const headers = [
      'UID',
      'Name',
      'Surname',
      'Branch',
      'Country',
      'Scope',
      `Target activity (${scopeLabel})`,
      'Achieved activity',
      'Shortfall activity',
      `Target leads (${scopeLabel})`,
      'Achieved leads',
      'Shortfall leads',
      'Behind on targets',
    ];
    const rows = users.map((u) => {
      const { ta, tl, sa, sl, achievedAct, behind } = computeProgressRowMetrics(
        u,
        shortfallScope,
        shortfallRange,
        now
      );
      return [
        String(u.uid),
        u.name,
        u.surname,
        branchLabelForUser(u, branchByUid),
        countryDisplayNameForUser(u, branchByUid),
        scopeLabel,
        u.periodTargetVisits > 0 ? String(ta) : '',
        String(achievedAct),
        sa != null ? String(sa) : '',
        u.periodTargetLeads > 0 ? String(tl) : '',
        String(u.achievedLeadsInRange),
        sl != null ? String(sl) : '',
        behind ? 'yes' : 'no',
      ];
    });
    exportToCsv(
      headers,
      rows,
      `targets-shortfall-${shortfallRange.from}-${shortfallRange.to}-${scopeLabel}`
    );
  }

  const shortfallEvalNow = new Date();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="size-5 text-amber-600" aria-hidden />
          Current Progress
        </h2>
        <div className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:w-auto">
          <div className="flex w-max min-w-full flex-nowrap items-center gap-2 sm:flex-wrap">
          {elevated ? (
            <>
              <div className="flex shrink-0 items-center gap-2">
                <Switch
                  id="only-behind-overview"
                  checked={onlyBehind}
                  onCheckedChange={setOnlyBehind}
                />
                <Label htmlFor="only-behind-overview" className="text-sm cursor-pointer">
                  Behind on Targets
                </Label>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Switch
                  id="group-by-country-overview"
                  checked={groupByCountry}
                  onCheckedChange={setGroupByCountry}
                />
                <Label
                  htmlFor="group-by-country-overview"
                  className="text-sm cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Globe className="size-3.5 text-muted-foreground" aria-hidden />
                  Group by country
                </Label>
              </div>
            </>
          ) : null}
          <Select
            value={shortfallScope}
            onValueChange={(v) => setShortfallScope(v as ShortfallScope)}
          >
            <SelectTrigger
              className={cn(
                selectTriggerClass,
                'w-[180px] shrink-0 sm:min-w-[200px] sm:w-[200px]'
              )}
            >
              <CalendarRange className="size-4 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Single day (UTC)</SelectItem>
              <SelectItem value="week">This week (UTC)</SelectItem>
              <SelectItem value="month">This month (UTC)</SelectItem>
            </SelectContent>
          </Select>
          {shortfallScope === 'day' ? (
            <Popover open={dayPopoverOpen} onOpenChange={setDayPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    'h-9 w-[190px] shrink-0 justify-start text-left font-normal sm:w-[220px]',
                    selectTriggerClass
                  )}
                >
                  <CalendarIcon className="mr-2 size-4 shrink-0 text-muted-foreground" />
                  {formatUtcYmd(selectedProgressDay)}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[80vw] max-w-sm p-0 sm:w-auto"
                align="center"
              >
                <Calendar
                  mode="single"
                  selected={selectedProgressDay}
                  onSelect={(d) => {
                    if (d)
                      setSelectedProgressDay(
                        new Date(
                          Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
                        )
                      );
                  }}
                  initialFocus
                />
                <div className="flex flex-wrap justify-end gap-2 border-t p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedProgressDay(utcToday())}
                  >
                    Today (UTC)
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDayPopoverOpen(false)}
                  >
                    Done
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          ) : null}
          <Button
            type="button"
            className="h-9 w-[130px] shrink-0 bg-violet-600 text-white hover:bg-violet-700 sm:w-auto dark:bg-violet-600 dark:text-white dark:hover:bg-violet-700"
            disabled={!shortfallUsersWithTargets.length}
            onClick={() => downloadShortfallCsv()}
          >
            Export CSV
          </Button>
          </div>
        </div>
      </div>

      {shortfallIsError ? (
        <p className="text-sm text-destructive">
          {(shortfallError as Error)?.message ?? 'Failed to load current progress data'}
        </p>
      ) : null}

      <div className="rounded-md border border-gray-200 bg-white overflow-x-auto">
        {shortfallLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[160px]">Name</TableHead>
                <TableHead className="text-right" colSpan={3}>
                  Activity
                  <span className="block text-xs font-normal text-muted-foreground">
                    T / A / short · target from check-ins
                  </span>
                </TableHead>
                <TableHead className="text-right" colSpan={3}>
                  Leads
                  <span className="block text-xs font-normal text-muted-foreground">
                    T / A / short
                  </span>
                </TableHead>
                <TableHead className="text-right min-w-[72px]">Behind</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground py-8"
                  >
                    No rows for this filter.
                  </TableCell>
                </TableRow>
              ) : (
                progressTableItems.map((item) => {
                  if (item.kind === 'header') {
                    const { countryKey } = item;
                    const isUnassigned = countryKey === UNASSIGNED_GROUP_KEY;
                    const flagInfo = isUnassigned
                      ? { flag: getCountryFlag('UNLISTED').flag, name: 'Unassigned' }
                      : getCountryFlag(countryKey);
                    return (
                      <TableRow
                        key={`hdr-${countryKey}`}
                        className="bg-teal-50 hover:bg-teal-50 dark:bg-teal-950/40 dark:hover:bg-teal-950/40"
                      >
                        <TableCell colSpan={8} className="py-2 font-semibold text-teal-900 dark:text-teal-100">
                          <span className="inline-flex items-center gap-2">
                            <span className="text-base leading-none" aria-hidden>
                              {flagInfo.flag}
                            </span>
                            <span>{flagInfo.name}</span>
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  }
                  const u = item.user;
                  const { ta, tl, sa, sl, achievedAct, behind, hasAnyMetricTarget } =
                    computeProgressRowMetrics(
                      u,
                      shortfallScope,
                      shortfallRange,
                      shortfallEvalNow
                    );
                  const fullName = [u.name, u.surname].filter(Boolean).join(' ');
                  const branchLine = branchLabelForUser(u, branchByUid);
                  return (
                    <TableRow
                      key={u.uid}
                      className={cn(
                        behind &&
                          hasAnyMetricTarget &&
                          'bg-red-50 text-red-950 dark:bg-red-950/35 dark:text-red-50'
                      )}
                    >
                      <TableCell className="font-medium align-top">
                        <div className="flex flex-col gap-0.5">
                          <span>{fullName}</span>
                          <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
                            <span className="leading-none" aria-hidden>
                              {flagForUserRow(u, branchByUid)}
                            </span>
                            <span>{branchLine}</span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground align-top">
                        {u.periodTargetVisits > 0 ? ta : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums align-top">{achievedAct}</TableCell>
                      <TableCell className="text-right tabular-nums align-top">
                        {sa != null ? sa : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground align-top">
                        {u.periodTargetLeads > 0 ? tl : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums align-top">
                        {u.achievedLeadsInRange}
                      </TableCell>
                      <TableCell className="text-right tabular-nums align-top">
                        {sl != null ? sl : '—'}
                      </TableCell>
                      <TableCell className="text-right align-top">{behind ? 'Yes' : 'No'}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

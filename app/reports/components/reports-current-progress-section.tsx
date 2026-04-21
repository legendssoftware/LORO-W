'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarIcon, CalendarRange } from 'lucide-react';
import type { TargetsProgressUserSummary } from '@/api/types/targets-progress';
import { useTargetsProgress } from '@/api/hooks';
import { exportToCsv } from '@/lib/utils/report-export';
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

export interface ReportsCurrentProgressSectionProps {
  elevated: boolean;
  filterSuffix: { branchId?: number; userUid?: number };
}

export function ReportsCurrentProgressSection({
  elevated,
  filterSuffix,
}: ReportsCurrentProgressSectionProps) {
  const [shortfallScope, setShortfallScope] = useState<ShortfallScope>('day');
  const [onlyBehind, setOnlyBehind] = useState(false);
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
      let ta: number;
      let tl: number;
      let sa: number | null;
      let sl: number | null;
      const achievedAct = achievedActivityTotal(u);
      if (shortfallScope === 'day') {
        ta = u.cumulativeTargetVisitsEnd;
        tl = u.cumulativeTargetLeadsEnd;
        sa =
          u.periodTargetVisits > 0
            ? Math.max(0, u.cumulativeTargetVisitsEnd - achievedAct)
            : null;
        sl = u.periodTargetLeads > 0 ? u.shortfallLeads : null;
      } else {
        ta = shortfallTrimmedTarget(
          shortfallScope,
          u.periodTargetVisits,
          shortfallRange.from,
          shortfallRange.to,
          now
        );
        tl = shortfallTrimmedTarget(
          shortfallScope,
          u.periodTargetLeads,
          shortfallRange.from,
          shortfallRange.to,
          now
        );
        sa = shortfallMetricShortfallTrimmed(
          shortfallScope,
          achievedAct,
          u.periodTargetVisits,
          shortfallRange.from,
          shortfallRange.to,
          now
        );
        sl = shortfallMetricShortfallTrimmed(
          shortfallScope,
          u.achievedLeadsInRange,
          u.periodTargetLeads,
          shortfallRange.from,
          shortfallRange.to,
          now
        );
      }
      return [
        String(u.uid),
        u.name,
        u.surname,
        scopeLabel,
        u.periodTargetVisits > 0 ? String(ta) : '',
        String(achievedAct),
        sa != null ? String(sa) : '',
        u.periodTargetLeads > 0 ? String(tl) : '',
        String(u.achievedLeadsInRange),
        sl != null ? String(sl) : '',
        userBehindOnAny(u, shortfallScope, shortfallRange, now) ? 'yes' : 'no',
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
                tableUsers.map((u) => {
                  let ta: number;
                  let tl: number;
                  let sa: number | null;
                  let sl: number | null;
                  const achievedAct = achievedActivityTotal(u);
                  if (shortfallScope === 'day') {
                    ta = u.cumulativeTargetVisitsEnd;
                    tl = u.cumulativeTargetLeadsEnd;
                    sa =
                      u.periodTargetVisits > 0
                        ? Math.max(0, u.cumulativeTargetVisitsEnd - achievedAct)
                        : null;
                    sl = u.periodTargetLeads > 0 ? u.shortfallLeads : null;
                  } else {
                    ta = shortfallTrimmedTarget(
                      shortfallScope,
                      u.periodTargetVisits,
                      shortfallRange.from,
                      shortfallRange.to,
                      shortfallEvalNow
                    );
                    tl = shortfallTrimmedTarget(
                      shortfallScope,
                      u.periodTargetLeads,
                      shortfallRange.from,
                      shortfallRange.to,
                      shortfallEvalNow
                    );
                    sa = shortfallMetricShortfallTrimmed(
                      shortfallScope,
                      achievedAct,
                      u.periodTargetVisits,
                      shortfallRange.from,
                      shortfallRange.to,
                      shortfallEvalNow
                    );
                    sl = shortfallMetricShortfallTrimmed(
                      shortfallScope,
                      u.achievedLeadsInRange,
                      u.periodTargetLeads,
                      shortfallRange.from,
                      shortfallRange.to,
                      shortfallEvalNow
                    );
                  }
                  const behind = userBehindOnAny(
                    u,
                    shortfallScope,
                    shortfallRange,
                    shortfallEvalNow
                  );
                  const hasAnyMetricTarget =
                    u.periodTargetVisits > 0 || u.periodTargetLeads > 0;
                  return (
                    <TableRow
                      key={u.uid}
                      className={cn(
                        behind &&
                          hasAnyMetricTarget &&
                          'bg-red-50 text-red-950 dark:bg-red-950/35 dark:text-red-50'
                      )}
                    >
                      <TableCell className="font-medium">
                        {[u.name, u.surname].filter(Boolean).join(' ')}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {u.periodTargetVisits > 0 ? ta : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{achievedAct}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {sa != null ? sa : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {u.periodTargetLeads > 0 ? tl : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {u.achievedLeadsInRange}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {sl != null ? sl : '—'}
                      </TableCell>
                      <TableCell className="text-right">{behind ? 'Yes' : 'No'}</TableCell>
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

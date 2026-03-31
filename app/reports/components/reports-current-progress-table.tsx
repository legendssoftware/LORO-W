'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/loading-spinner';
import { cn } from '@/lib/utils';
import type { TargetsProgressUserSummary } from '@/api/types/targets-progress';
import {
  achievedActivityTotal,
  downloadTargetsProgressCsv,
  userBehindForSelectedRange,
} from '@/app/reports/utils/targets-progress-display';

export interface ReportsCurrentProgressTableProps {
  usersWithTargets: TargetsProgressUserSummary[];
  dateFrom: string;
  dateTo: string;
  elevated: boolean;
  onlyBehind: boolean;
  onOnlyBehindChange: (v: boolean) => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  exportButtonClassName?: string;
}

export function ReportsCurrentProgressTable({
  usersWithTargets,
  dateFrom,
  dateTo,
  elevated,
  onlyBehind,
  onOnlyBehindChange,
  isLoading,
  isError,
  error,
  exportButtonClassName,
}: ReportsCurrentProgressTableProps) {
  const tableUsers = onlyBehind
    ? usersWithTargets.filter(userBehindForSelectedRange)
    : usersWithTargets;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="size-5 text-amber-600" aria-hidden />
          Current Progress
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {elevated ? (
            <div className="flex items-center gap-2">
              <Switch
                id="only-behind-overview"
                checked={onlyBehind}
                onCheckedChange={onOnlyBehindChange}
              />
              <Label htmlFor="only-behind-overview" className="text-sm cursor-pointer">
                Behind on Targets
              </Label>
            </div>
          ) : null}
          <Button
            type="button"
            className={cn(
              'h-9 shrink-0 bg-violet-600 text-white hover:bg-violet-700 sm:w-auto dark:bg-violet-600 dark:text-white dark:hover:bg-violet-700',
              exportButtonClassName
            )}
            disabled={!usersWithTargets.length}
            onClick={() =>
              downloadTargetsProgressCsv(
                usersWithTargets,
                dateFrom,
                dateTo,
                onlyBehind
              )
            }
          >
            Export CSV
          </Button>
        </div>
      </div>

      {isError ? (
        <p className="text-sm text-destructive">
          {error?.message ?? 'Failed to load current progress data'}
        </p>
      ) : null}

      <div className="rounded-md border border-gray-200 bg-white overflow-x-auto">
        {isLoading ? (
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
                  const achievedAct = achievedActivityTotal(u);
                  const ta = u.cumulativeTargetVisitsEnd;
                  const tl = u.cumulativeTargetLeadsEnd;
                  const sa =
                    u.periodTargetVisits > 0
                      ? Math.max(0, u.cumulativeTargetVisitsEnd - achievedAct)
                      : null;
                  const sl = u.periodTargetLeads > 0 ? u.shortfallLeads : null;
                  const behind = userBehindForSelectedRange(u);
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
                      <TableCell className="text-right tabular-nums">
                        {achievedAct}
                      </TableCell>
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
                      <TableCell className="text-right">
                        {behind ? 'Yes' : 'No'}
                      </TableCell>
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

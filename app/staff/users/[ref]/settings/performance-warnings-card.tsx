'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  useClearSelectedPerformanceWarnings,
  useUserTarget,
} from '@/api/hooks';
import type { TargetWarningsPayload } from '@/api/endpoints/user';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  getTargetWarningHistory,
  summarizeTargetWarnings,
} from '@/lib/target-warnings-summary';
import { cn } from '@/lib/utils';

const TIER_BADGE: Record<1 | 2 | 3, string> = {
  1: 'bg-green-100 text-green-800 border border-green-200/80',
  2: 'bg-amber-100 text-amber-900 border border-amber-200/80',
  3: 'bg-red-100 text-red-800 border border-red-200/80',
};

const TIER_LABEL: Record<1 | 2 | 3, string> = {
  1: 'Level 1 — first warning',
  2: 'Level 2 — second warning',
  3: 'Level 3 — final warning',
};

type SelectableRow =
  | { kind: 'active'; key: 'active'; level: 1 | 2 | 3; issuedAt?: string }
  | {
      kind: 'history';
      key: `history:${number}`;
      index: number;
      level: 1 | 2 | 3;
      issuedAt: string;
      acknowledgedAt?: string;
      source: string;
    };

function formatWarningDate(value: string | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return format(d, 'dd MMM yyyy HH:mm');
}

function extractTargetWarnings(
  payload: unknown
): TargetWarningsPayload | null {
  if (!payload || typeof payload !== 'object') return null;
  const ut = payload as {
    targetWarnings?: TargetWarningsPayload | null;
    personalTargets?: { targetWarnings?: TargetWarningsPayload | null };
  };
  return ut.personalTargets?.targetWarnings ?? ut.targetWarnings ?? null;
}

export function PerformanceWarningsCard({
  userRef,
  canManage,
  compact = false,
}: {
  userRef: string | null;
  canManage: boolean;
  /** When true, render without outer Card (for embedding in modals). */
  compact?: boolean;
}) {
  const targetQuery = useUserTarget(userRef, { enabled: !!userRef });
  const clearMutation = useClearSelectedPerformanceWarnings(userRef);

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const warnings = useMemo(
    () => extractTargetWarnings(targetQuery.data?.userTarget),
    [targetQuery.data?.userTarget]
  );

  const summary = useMemo(() => summarizeTargetWarnings(warnings), [warnings]);
  const history = useMemo(() => getTargetWarningHistory(warnings), [warnings]);

  const rows = useMemo((): SelectableRow[] => {
    const list: SelectableRow[] = [];
    if (warnings?.level === 1 || warnings?.level === 2 || warnings?.level === 3) {
      list.push({
        kind: 'active',
        key: 'active',
        level: warnings.level,
        issuedAt: warnings.issuedAt,
      });
    }
    history.forEach((entry, index) => {
      list.push({
        kind: 'history',
        key: `history:${index}`,
        index,
        level: entry.level,
        issuedAt: entry.issuedAt,
        acknowledgedAt: entry.acknowledgedAt,
        source: entry.source,
      });
    });
    return list;
  }, [warnings, history]);

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedKeys.has(r.key)),
    [rows, selectedKeys]
  );

  function toggleSelected(key: string, checked: boolean) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function selectAllClearable() {
    setSelectedKeys(new Set(rows.map((r) => r.key)));
  }

  function clearSelection() {
    setSelectedKeys(new Set());
  }

  async function handleClearSelected() {
    const clearActive = selectedRows.some((r) => r.kind === 'active');
    const removeHistoryIndexes = selectedRows
      .filter((r): r is Extract<SelectableRow, { kind: 'history' }> => r.kind === 'history')
      .map((r) => r.index);

    await clearMutation.mutateAsync({
      clearActive,
      removeHistoryIndexes,
    });
    setSelectedKeys(new Set());
    setClearConfirmOpen(false);
  }

  const allSelected =
    rows.length > 0 && rows.every((r) => selectedKeys.has(r.key));

  const body = (
    <>
      {targetQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="size-4 animate-spin" />
          Loading performance warnings…
        </p>
      ) : targetQuery.isError ? (
        <div className="space-y-2 py-2">
          <p className="text-sm text-destructive">
            {targetQuery.error instanceof Error
              ? targetQuery.error.message
              : 'Failed to load performance warnings'}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void targetQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          No performance warnings on record.
        </p>
      ) : (
        <div className="space-y-3">
          {canManage ? (
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(v) => {
                    if (v === true) selectAllClearable();
                    else clearSelection();
                  }}
                  aria-label="Select all performance warnings"
                />
                Select all ({rows.length})
              </label>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={selectedRows.length === 0 || clearMutation.isPending}
                onClick={() => setClearConfirmOpen(true)}
              >
                Clear selected
              </Button>
            </div>
          ) : null}

          <ul className="space-y-2">
            {rows.map((row) => {
              const isActive = row.kind === 'active';
              return (
                <li
                  key={row.key}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border border-border p-3',
                    isActive && 'border-amber-500/50 bg-amber-500/5'
                  )}
                >
                  {canManage ? (
                    <Checkbox
                      checked={selectedKeys.has(row.key)}
                      onCheckedChange={(v) =>
                        toggleSelected(row.key, v === true)
                      }
                      aria-label={`Select ${isActive ? 'active' : 'history'} warning level ${row.level}`}
                      className="mt-0.5"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn('font-normal', TIER_BADGE[row.level])}
                      >
                        {TIER_LABEL[row.level]}
                      </Badge>
                      {isActive ? (
                        <Badge className="bg-amber-600 hover:bg-amber-600 text-white">
                          Active (staff chip)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          History
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Issued {formatWarningDate(row.issuedAt)}
                      {row.kind === 'history' && row.acknowledgedAt
                        ? ` · Ack ${formatWarningDate(row.acknowledgedAt)}`
                        : null}
                      {row.kind === 'history'
                        ? ` · ${row.source.replace(/_/g, ' ')}`
                        : null}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          {summary.pendingCount > 0 ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Employee has not acknowledged the active tier in-app yet.
            </p>
          ) : null}
        </div>
      )}

      <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear selected performance warnings?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear {selectedRows.length} selected warning
              {selectedRows.length === 1 ? '' : 's'}. Warnings you did not
              select stay as they are. Clearing the active tier removes the
              staff-card chip.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={clearMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                void handleClearSelected();
              }}
            >
              {clearMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Clearing…
                </>
              ) : (
                'Clear selected'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  if (compact) {
    return (
      <div className="space-y-2" data-slot="performance-warnings">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" aria-hidden />
            <h3 className="text-sm font-semibold">Performance warnings</h3>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void targetQuery.refetch()}
            disabled={targetQuery.isFetching}
          >
            Refresh
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          These drive the staff-card warning chip. Select entries to clear;
          unselected history stays.
        </p>
        {body}
      </div>
    );
  }

  return (
    <Card data-slot="performance-warnings-card">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <AlertTriangle className="size-4 text-amber-500" aria-hidden />
            Performance warnings
          </CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Active tier shows on the staff card. Select warnings to clear;
            unselected history stays. Separate from formal HR warnings below.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void targetQuery.refetch()}
          disabled={targetQuery.isFetching}
        >
          Refresh
        </Button>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}

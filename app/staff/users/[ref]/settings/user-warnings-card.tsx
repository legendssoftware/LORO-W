'use client';

import { useMemo, useState } from 'react';
import { format, addMonths } from 'date-fns';
import { Loader2Icon } from '@/lib/icons';
import { AlertTriangle } from 'lucide-react';
import {
  useCreateWarningMutation,
  useRevokeWarningsMutation,
  useUserWarnings,
} from '@/api/hooks';
import type { WarningRecord, WarningSeverity } from '@/api/types/warnings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { DatePickerField } from '@/components/ui/date-picker-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { cn } from '@/lib/utils';

const SEVERITY_BADGE: Record<WarningSeverity, string> = {
  LOW: 'bg-emerald-600 hover:bg-emerald-600 text-white',
  MEDIUM: 'bg-amber-500 hover:bg-amber-500 text-white',
  HIGH: 'bg-red-600 hover:bg-red-600 text-white',
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'border-amber-500 text-amber-700 dark:text-amber-400',
  EXPIRED: 'border-muted-foreground/40 text-muted-foreground',
  REVOKED: 'border-muted-foreground/40 text-muted-foreground',
};

function formatWarningDate(value: string | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return format(d, 'dd MMM yyyy');
}

function issuerLabel(w: WarningRecord): string {
  const by = w.issuedBy;
  if (!by) return '—';
  const name = [by.name, by.surname].filter(Boolean).join(' ').trim();
  return name || by.email || '—';
}

export function UserWarningsCard({
  userRef,
  recipientClerkId,
  canManage,
}: {
  /** Numeric uid or clerk id used for GET /warnings/user/:ref */
  userRef: string | number;
  recipientClerkId: string | null | undefined;
  canManage: boolean;
}) {
  const { data: warnings = [], isLoading, isError, error, refetch, isFetching } =
    useUserWarnings(userRef, { enabled: !!userRef });
  const createMutation = useCreateWarningMutation(userRef);
  const revokeMutation = useRevokeWarningsMutation(userRef);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [reason, setReason] = useState('');
  const [severity, setSeverity] = useState<WarningSeverity>('MEDIUM');
  const [expiresAt, setExpiresAt] = useState(() =>
    format(addMonths(new Date(), 6), 'yyyy-MM-dd')
  );

  const clearableWarnings = useMemo(
    () => warnings.filter((w) => w.status === 'ACTIVE'),
    [warnings]
  );

  const selectedClearable = useMemo(
    () => clearableWarnings.filter((w) => selectedIds.has(w.uid)),
    [clearableWarnings, selectedIds]
  );

  function toggleSelected(uid: number, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(uid);
      else next.delete(uid);
      return next;
    });
  }

  function toggleSelectAllClearable(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const w of clearableWarnings) {
        if (checked) next.add(w.uid);
        else next.delete(w.uid);
      }
      return next;
    });
  }

  async function handleClearSelected() {
    const ids = selectedClearable.map((w) => w.uid);
    if (ids.length === 0) return;
    await revokeMutation.mutateAsync(ids);
    setSelectedIds(new Set());
    setClearConfirmOpen(false);
  }

  async function handleIssue() {
    if (!recipientClerkId?.trim()) return;
    const trimmed = reason.trim();
    if (trimmed.length < 10) return;
    if (!expiresAt) return;

    await createMutation.mutateAsync({
      recipientClerkId: recipientClerkId.trim(),
      reason: trimmed,
      severity,
      expiresAt: new Date(`${expiresAt}T23:59:59`).toISOString(),
    });
    setReason('');
    setSeverity('MEDIUM');
    setExpiresAt(format(addMonths(new Date(), 6), 'yyyy-MM-dd'));
    setShowIssueForm(false);
  }

  const allClearableSelected =
    clearableWarnings.length > 0 &&
    clearableWarnings.every((w) => selectedIds.has(w.uid));

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-amber-600" aria-hidden />
            Formal warnings
          </CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Formal HR disciplinary warnings. Select active warnings to clear;
            unselected warnings stay as they are. Does not control the
            staff-card performance warning chip.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              'Refresh'
            )}
          </Button>
          {canManage && recipientClerkId ? (
            <Button
              type="button"
              size="sm"
              variant={showIssueForm ? 'secondary' : 'default'}
              onClick={() => setShowIssueForm((v) => !v)}
            >
              {showIssueForm ? 'Cancel issue' : 'Issue warning'}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage && showIssueForm ? (
          <div className="rounded-lg border border-border p-3 sm:p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-medium">Issue a new warning</p>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground" htmlFor="warning-reason">
                Reason (min 10 characters)
              </label>
              <Textarea
                id="warning-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the issue and expectations…"
                rows={3}
                className="resize-y"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Severity</label>
                <Select
                  value={severity}
                  onValueChange={(v) => setSeverity(v as WarningSeverity)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Expires</label>
                <DatePickerField
                  value={expiresAt}
                  onChange={(v) => setExpiresAt(v ?? '')}
                  placeholder="Expiry date"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                disabled={
                  createMutation.isPending ||
                  reason.trim().length < 10 ||
                  !expiresAt
                }
                onClick={() => void handleIssue()}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2Icon className="size-3.5 animate-spin mr-1.5" />
                    Issuing…
                  </>
                ) : (
                  'Issue warning'
                )}
              </Button>
            </div>
          </div>
        ) : null}

        {!recipientClerkId && canManage ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            This user has no Clerk account linked yet. Link/invite them before
            issuing formal warnings.
          </p>
        ) : null}

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2Icon className="size-4 animate-spin" />
            Loading warnings…
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : 'Failed to load warnings'}
          </p>
        ) : warnings.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No formal warnings on record.</p>
        ) : (
          <div className="space-y-3">
            {canManage && clearableWarnings.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={allClearableSelected}
                    onCheckedChange={(v) => toggleSelectAllClearable(v === true)}
                    aria-label="Select all active warnings"
                  />
                  <span className="text-muted-foreground">
                    Select all active ({clearableWarnings.length})
                  </span>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={selectedClearable.length === 0 || revokeMutation.isPending}
                  onClick={() => setClearConfirmOpen(true)}
                >
                  Clear selected ({selectedClearable.length})
                </Button>
              </div>
            ) : null}

            <ul className="divide-y divide-border rounded-lg border border-border">
              {warnings.map((w) => {
                const isActive = w.status === 'ACTIVE';
                const checked = selectedIds.has(w.uid);
                return (
                  <li
                    key={w.uid}
                    className={cn(
                      'flex gap-3 p-3 sm:p-4',
                      !isActive && 'opacity-70'
                    )}
                  >
                    {canManage && isActive ? (
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => toggleSelected(w.uid, v === true)}
                        className="mt-1"
                        aria-label={`Select warning ${w.uid}`}
                      />
                    ) : (
                      <span className="size-4 shrink-0 mt-1" aria-hidden />
                    )}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          className={cn(
                            'text-[10px] px-1.5 py-0',
                            SEVERITY_BADGE[w.severity] ?? SEVERITY_BADGE.MEDIUM
                          )}
                        >
                          {w.severity}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-1.5 py-0',
                            STATUS_BADGE[w.status]
                          )}
                        >
                          {w.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          #{w.uid}
                        </span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                        {w.reason}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Issued {formatWarningDate(w.issuedAt)}
                        {' · '}
                        Expires {formatWarningDate(w.expiresAt)}
                        {' · '}
                        By {issuerLabel(w)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>

      <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear selected warnings?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke {selectedClearable.length} active warning
              {selectedClearable.length === 1 ? '' : 's'}. Warnings you did not
              select will remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={revokeMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                void handleClearSelected();
              }}
            >
              {revokeMutation.isPending ? (
                <>
                  <Loader2Icon className="size-3.5 animate-spin mr-1.5" />
                  Clearing…
                </>
              ) : (
                'Clear selected'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

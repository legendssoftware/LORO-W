'use client';

import { useEffect, useState } from 'react';
import { addMonths, format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useCreateWarningMutation, useUpdateWarningMutation } from '@/api/hooks/use-warnings';
import type { WarningRecord, WarningSeverity, WarningStatus } from '@/api/types/warnings';
import { Button } from '@/components/ui/button';
import { DatePickerField } from '@/components/ui/date-picker-field';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SearchableUserPicker } from '@/components/filters/searchable-filter-comboboxes';
import { useBranches } from '@/api/hooks/use-branches';
import { useSearchableUsersList } from '@/api/hooks/use-searchable-users-list';
import { cn } from '@/lib/utils';

const primaryButtonClass =
  'border-0 bg-violet-600 text-white hover:bg-violet-700 focus-visible:ring-violet-500/40 dark:bg-violet-600 dark:text-white dark:hover:bg-violet-500';

function toYmd(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return format(date, 'yyyy-MM-dd');
}

export function WarningFormDialog({
  open,
  onOpenChange,
  warning,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing an existing warning. */
  warning?: WarningRecord | null;
}) {
  const isEdit = warning != null;
  const createMutation = useCreateWarningMutation(warning?.owner?.uid);
  const updateMutation = useUpdateWarningMutation(warning?.owner?.uid);
  const branchesQuery = useBranches({ enabled: open && !isEdit });
  const { users, searchQuery, setSearchQuery, isSearchLoading, bindUidChange } = useSearchableUsersList({
    enabled: open && !isEdit,
    limit: 100,
  });

  const [userFilter, setUserFilter] = useState('all');
  const [recipientClerkId, setRecipientClerkId] = useState('');
  const [reason, setReason] = useState('');
  const [severity, setSeverity] = useState<WarningSeverity>('MEDIUM');
  const [status, setStatus] = useState<WarningStatus>('ACTIVE');
  const [expiresAt, setExpiresAt] = useState(() => format(addMonths(new Date(), 6), 'yyyy-MM-dd'));
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    if (warning) {
      setReason(warning.reason);
      setSeverity(warning.severity);
      setStatus(warning.status);
      setExpiresAt(toYmd(warning.expiresAt));
      setRecipientClerkId(warning.owner?.clerkUserId ?? '');
      return;
    }
    setReason('');
    setSeverity('MEDIUM');
    setStatus('ACTIVE');
    setExpiresAt(format(addMonths(new Date(), 6), 'yyyy-MM-dd'));
    setUserFilter('all');
    setRecipientClerkId('');
  }, [open, warning]);

  const handleUserChange = bindUidChange((uid: string) => {
    setUserFilter(uid);
    const person = users.find((row) => String(row.uid) === uid);
    setRecipientClerkId(person?.clerkUserId?.trim() ?? '');
  });

  const pending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 10) {
      setFormError('Enter a reason of at least 10 characters.');
      return;
    }
    if (!expiresAt) {
      setFormError('Choose an expiry date.');
      return;
    }
    if (!isEdit && !recipientClerkId) {
      setFormError('Choose the person who will receive this warning.');
      return;
    }
    setFormError(null);
    const expiresIso = new Date(`${expiresAt}T23:59:59`).toISOString();
    if (isEdit && warning) {
      updateMutation.mutate(
        {
          warningUid: warning.uid,
          payload: { reason: trimmed, severity, status, expiresAt: expiresIso, isExpired: status === 'EXPIRED' },
        },
        { onSuccess: () => onOpenChange(false) }
      );
      return;
    }
    createMutation.mutate(
      { recipientClerkId, reason: trimmed, severity, expiresAt: expiresIso, status },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit warning' : 'Issue warning'}</DialogTitle>
          <DialogDescription>
            Formal HR warnings issued here, or on a staff profile, appear in this list.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          {isEdit ? null : (
            <div className="grid gap-2">
              <Label>Person</Label>
              <SearchableUserPicker
                users={users}
                branches={branchesQuery.data ?? []}
                selectedUid={userFilter}
                onUidChange={handleUserChange}
                triggerClassName="h-9 w-full"
                allOptionLabel="Choose a person"
                searchPlaceholder="Search people…"
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                isSearchLoading={isSearchLoading}
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="warning-reason">Reason</Label>
            <Textarea
              id="warning-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Describe the issue and expectations…"
              rows={4}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="warning-severity">Severity</Label>
              <Select value={severity} onValueChange={(value) => setSeverity(value as WarningSeverity)}>
                <SelectTrigger id="warning-severity" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="warning-status">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as WarningStatus)}>
                <SelectTrigger id="warning-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="REVOKED">Revoked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="warning-expires">Expires</Label>
            <DatePickerField id="warning-expires" value={expiresAt} onChange={(value) => setExpiresAt(value ?? '')} />
          </div>
          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="submit" className={cn(primaryButtonClass)} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEdit ? 'Save warning' : 'Issue warning'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

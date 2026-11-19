'use client';

import { useState } from 'react';
import { AlertTriangle, CircleDot, Plus, UserRound } from 'lucide-react';
import { useSessionSync, useTokenReady, useUsers } from '@/api/hooks';
import {
  useCreateWarningMutation,
  useDeleteWarningMutation,
  useUpdateWarningMutation,
  useWarningsInbox,
} from '@/api/hooks/use-warnings';
import type { WarningRecord, WarningSeverity, WarningStatus } from '@/api/types/warnings';
import { FeatureDenied, FeatureShell } from '@/components/feature-page';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { IconField, IconInput } from '@/components/icon-field';
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
import { canAccessWarnings, canDeleteWarnings } from '@/lib/access';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const STATUSES: WarningStatus[] = ['ACTIVE', 'EXPIRED', 'REVOKED'];
const SEVERITIES: WarningSeverity[] = ['LOW', 'MEDIUM', 'HIGH'];

function personName(row: WarningRecord): string {
  const owner = row.owner;
  if (!owner) return '—';
  return [owner.name, owner.surname].filter(Boolean).join(' ') || '—';
}

export function WarningsContent() {
  const { t } = useTranslation('screens');
  const { isTokenReady } = useTokenReady();
  const { isSyncing: sessionLoading, backendUserData } = useSessionSync();
  const ready = isTokenReady && !sessionLoading;
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<WarningRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    recipientClerkId: '',
    reason: '',
    severity: 'MEDIUM' as WarningSeverity,
    expiresAt: '',
  });
  const [editReason, setEditReason] = useState('');

  const usersQuery = useUsers({ enabled: ready, limit: 200 });
  const listQuery = useWarningsInbox(
    { status: status === 'all' ? undefined : status, limit: 50 },
    { enabled: ready }
  );
  const createMutation = useCreateWarningMutation(null);
  const updateMutation = useUpdateWarningMutation(null);
  const deleteMutation = useDeleteWarningMutation();
  const rows = listQuery.data?.warnings ?? [];

  if (ready && !canAccessWarnings(backendUserData?.accessLevel)) {
    return <FeatureDenied title={t('pages.warnings.title')} />;
  }

  async function submitCreate() {
    if (!form.recipientClerkId || !form.reason.trim() || !form.expiresAt) {
      toast.error('Person, reason, and expiry are required');
      return;
    }
    try {
      await createMutation.mutateAsync({
        recipientClerkId: form.recipientClerkId,
        reason: form.reason.trim(),
        severity: form.severity,
        expiresAt: new Date(form.expiresAt).toISOString(),
      });
      setCreateOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not issue warning');
    }
  }

  async function saveEdit() {
    if (!selected) return;
    try {
      await updateMutation.mutateAsync({
        warningUid: selected.uid,
        payload: { reason: editReason.trim() || selected.reason },
      });
      setSelected(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update warning');
    }
  }

  async function remove() {
    if (!selected) return;
    try {
      await deleteMutation.mutateAsync(selected.uid);
      toast.success('Warning deleted');
      setSelected(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete warning');
    }
  }

  return (
    <>
      <FeatureShell
        tourId="warnings"
        title={t('pages.warnings.title')}
        description={t('pages.warnings.description')}
        actions={<Button type="button" onClick={() => setCreateOpen(true)}><Plus className="size-4" aria-hidden />Issue warning</Button>}
        filters={
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px]">
              <CircleDot className="size-4 text-muted-foreground" aria-hidden />
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <CircleDot className="size-4" aria-hidden />
                All statuses
              </SelectItem>
              {STATUSES.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        isLoading={!ready || listQuery.isLoading}
        isError={listQuery.isError}
        error={listQuery.error}
        onRetry={() => void listQuery.refetch()}
        isEmpty={rows.length === 0}
        emptyMessage="No warnings match this filter."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('tables.person')}</TableHead>
              <TableHead>{t('tables.severity')}</TableHead>
              <TableHead>{t('tables.status')}</TableHead>
              <TableHead>{t('tables.reason')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.uid}
                className="cursor-pointer"
                onClick={() => {
                  setSelected(row);
                  setEditReason(row.reason);
                }}
              >
                <TableCell>
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-muted-foreground" aria-hidden />
                    {personName(row)}
                  </span>
                </TableCell>
                <TableCell>{row.severity}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell className="max-w-xs truncate">{row.reason}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </FeatureShell>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Issue warning</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <IconField icon={UserRound} label="Person">
              <Select value={form.recipientClerkId} onValueChange={(value) => setForm((current) => ({ ...current, recipientClerkId: value }))}>
                <SelectTrigger className="w-full">
                  <UserRound className="size-4 text-muted-foreground" aria-hidden />
                  <SelectValue placeholder="Select a person" />
                </SelectTrigger>
                <SelectContent>
                  {(usersQuery.data ?? []).filter((user) => user.clerkUserId).map((user) => (
                    <SelectItem key={user.uid} value={user.clerkUserId!}>
                      <UserRound className="size-4" aria-hidden />
                      {[user.name, user.surname].filter(Boolean).join(' ') || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </IconField>
            <IconField icon={AlertTriangle} label="Severity">
              <Select value={form.severity} onValueChange={(value) => setForm((current) => ({ ...current, severity: value as WarningSeverity }))}>
                <SelectTrigger className="w-full">
                  <AlertTriangle className="size-4 text-muted-foreground" aria-hidden />
                  <SelectValue placeholder="Choose a severity" />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      <AlertTriangle className="size-4" aria-hidden />
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </IconField>
            <IconField icon={AlertTriangle} label="Reason">
              <IconInput icon={AlertTriangle} value={form.reason} placeholder="What happened" onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} />
            </IconField>
            <IconField icon={CircleDot} label="Expires">
              <IconInput icon={CircleDot} type="date" value={form.expiresAt} aria-label="Expiry date" onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))} />
            </IconField>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => void submitCreate()} disabled={createMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={selected != null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Warning</DialogTitle></DialogHeader>
          {selected ? (
            <div className="space-y-2 text-sm">
              <p>{personName(selected)} · {selected.severity} · {selected.status}</p>
              <IconField icon={AlertTriangle} label="Reason">
                <IconInput icon={AlertTriangle} value={editReason} placeholder="Update the reason" onChange={(event) => setEditReason(event.target.value)} />
              </IconField>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" onClick={() => void saveEdit()} disabled={updateMutation.isPending}>Save</Button>
            {canDeleteWarnings(backendUserData?.accessLevel) ? (
              <Button type="button" variant="destructive" onClick={() => void remove()}>Delete</Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

'use client';

import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const STATUSES: WarningStatus[] = ['ACTIVE', 'EXPIRED', 'REVOKED'];
const SEVERITIES: WarningSeverity[] = ['LOW', 'MEDIUM', 'HIGH'];

function personName(row: WarningRecord): string {
  const owner = row.owner;
  if (!owner) return '—';
  return [owner.name, owner.surname].filter(Boolean).join(' ') || '—';
}

export function WarningsContent() {
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
    return <FeatureDenied title="Warnings" />;
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
        title="Warnings"
        description="Organisation warnings. A warning created on a staff profile appears here."
        actions={<Button type="button" onClick={() => setCreateOpen(true)}>Issue warning</Button>}
        filters={
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
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
              <TableHead>Person</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reason</TableHead>
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
                <TableCell>{personName(row)}</TableCell>
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
            <div className="space-y-1">
              <Label>Person</Label>
              <Select value={form.recipientClerkId} onValueChange={(value) => setForm((current) => ({ ...current, recipientClerkId: value }))}>
                <SelectTrigger><SelectValue placeholder="Select a person" /></SelectTrigger>
                <SelectContent>
                  {(usersQuery.data ?? []).filter((user) => user.clerkUserId).map((user) => (
                    <SelectItem key={user.uid} value={user.clerkUserId!}>
                      {[user.name, user.surname].filter(Boolean).join(' ') || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={(value) => setForm((current) => ({ ...current, severity: value as WarningSeverity }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="warning-reason">Reason</Label>
              <Input id="warning-reason" value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="warning-expires">Expires</Label>
              <Input id="warning-expires" type="date" value={form.expiresAt} onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))} />
            </div>
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
              <Label htmlFor="warning-edit">Reason</Label>
              <Input id="warning-edit" value={editReason} onChange={(event) => setEditReason(event.target.value)} />
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

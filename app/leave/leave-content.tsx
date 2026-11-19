'use client';

import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import { CalendarDays, CircleDot, MessageSquare, Plus, UserRound } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useSessionSync, useTokenReady, useUsers } from '@/api/hooks';
import {
  useApproveLeaveMutation,
  useCancelLeaveMutation,
  useCreateLeaveMutation,
  useDeleteLeaveMutation,
  useLeaveInbox,
  useLeaveReport,
  useRejectLeaveMutation,
} from '@/api/hooks/use-leaves';
import type { LeaveRecord } from '@/api/types/leave';
import { FeatureDenied, FeatureShell } from '@/components/feature-page';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
import { canAccessLeave, canDecideLeave, canOnlySeeOwnLeave } from '@/lib/access';
import toast from 'react-hot-toast';

const LEAVE_TYPES = [
  'ANNUAL',
  'SICK',
  'UNPAID',
  'MATERNITY',
  'PATERNITY',
  'COMPENSATORY',
  'BEREAVEMENT',
  'STUDY',
] as const;

const STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED_BY_USER',
  'CANCELLED_BY_ADMIN',
  'TAKEN',
  'PARTIALLY_TAKEN',
] as const;

function leaveChartConfig(label: string): ChartConfig {
  return { count: { label, color: 'var(--chart-1)' } };
}

function personName(row: LeaveRecord): string {
  const owner = row.owner;
  if (!owner) return '—';
  return [owner.name, owner.surname].filter(Boolean).join(' ') || '—';
}

function dayCount(start: string, end: string): number {
  const from = new Date(start);
  const to = new Date(end);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 1;
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  return Math.max(1, days);
}

export function LeaveContent() {
  const { t } = useTranslation('screens');
  const { isTokenReady } = useTokenReady();
  const { isSyncing: sessionLoading, backendUserData } = useSessionSync();
  const ready = isTokenReady && !sessionLoading;
  const accessLevel = backendUserData?.accessLevel;
  const ownOnly = canOnlySeeOwnLeave(accessLevel);
  const canDecide = canDecideLeave(accessLevel);

  const [status, setStatus] = useState('all');
  const [ownerUid, setOwnerUid] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selected, setSelected] = useState<LeaveRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [form, setForm] = useState({
    leaveType: 'ANNUAL',
    startDate: '',
    endDate: '',
    motivation: '',
  });

  const usersQuery = useUsers({ enabled: ready && !ownOnly, limit: 200 });
  const listQuery = useLeaveInbox(
    {
      status: status === 'all' ? undefined : status,
      ownerUid: !ownOnly && ownerUid !== 'all' ? Number(ownerUid) : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page: 1,
      limit: 50,
    },
    { enabled: ready }
  );
  const reportFrom = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const reportTo = endDate || new Date().toISOString().slice(0, 10);
  const reportQuery = useLeaveReport(reportFrom, reportTo, { enabled: ready && !ownOnly });

  const createMutation = useCreateLeaveMutation();
  const approveMutation = useApproveLeaveMutation();
  const rejectMutation = useRejectLeaveMutation();
  const cancelMutation = useCancelLeaveMutation();
  const deleteMutation = useDeleteLeaveMutation();

  const rows = useMemo(() => {
    const data = listQuery.data?.data ?? [];
    if (!ownOnly || backendUserData?.uid == null) return data;
    return data.filter((row) => row.owner?.uid === backendUserData.uid);
  }, [backendUserData?.uid, listQuery.data?.data, ownOnly]);

  if (ready && !canAccessLeave(accessLevel)) {
    return <FeatureDenied title={t('leave.title')} />;
  }

  async function submitCreate() {
    if (!form.startDate || !form.endDate) {
      toast.error(t('leave.datesRequired'));
      return;
    }
    try {
      await createMutation.mutateAsync({
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        duration: dayCount(form.startDate, form.endDate),
        motivation: form.motivation || undefined,
        isHalfDay: false,
        isPublicHoliday: false,
        isPaid: form.leaveType !== 'UNPAID',
      });
      toast.success(t('leave.requested'));
      setCreateOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('leave.couldNotRequest'));
    }
  }

  async function runAction(action: 'approve' | 'reject' | 'cancel' | 'delete') {
    if (!selected) return;
    try {
      if (action === 'approve') await approveMutation.mutateAsync(selected.uid);
      if (action === 'reject') {
        if (!reason.trim()) {
          toast.error(t('leave.reasonRequired'));
          return;
        }
        await rejectMutation.mutateAsync({ ref: selected.uid, rejectionReason: reason.trim() });
      }
      if (action === 'cancel') {
        await cancelMutation.mutateAsync({
          ref: selected.uid,
          cancellationReason: reason.trim() || 'Cancelled',
        });
      }
      if (action === 'delete') await deleteMutation.mutateAsync(selected.uid);
      toast.success(t('leave.updated'));
      setSelected(null);
      setReason('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('leave.couldNotUpdate'));
    }
  }

  const chartData = (reportQuery.data?.byStatus ?? []).map((item) => ({
    name: item.name,
    count: item.value,
  }));

  return (
    <>
      <FeatureShell
        tourId="leave"
        title={t('leave.title')}
        description={t('leave.description')}
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden />{t('leave.request')}</Button>
        }
        filters={
          <div className="flex flex-wrap gap-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]">
                <CircleDot className="size-4 text-muted-foreground" aria-hidden />
                <SelectValue placeholder={t('actions.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <CircleDot className="size-4" aria-hidden />{t('actions.allStatuses')}</SelectItem>
                {STATUSES.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!ownOnly ? (
              <Select value={ownerUid} onValueChange={setOwnerUid}>
                <SelectTrigger className="w-[200px]">
                  <UserRound className="size-4 text-muted-foreground" aria-hidden />
                  <SelectValue placeholder={t('leave.allPeople')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <UserRound className="size-4" aria-hidden />{t('leave.allPeople')}</SelectItem>
                  {(usersQuery.data ?? []).map((user) => (
                    <SelectItem key={user.uid} value={String(user.uid)}>
                      {[user.name, user.surname].filter(Boolean).join(' ') || user.email || String(user.uid)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="w-[160px]" aria-label={t('leave.fromDate')} />
            <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="w-[160px]" aria-label={t('leave.toDate')} />
          </div>
        }
        isLoading={!ready || listQuery.isLoading}
        isError={listQuery.isError}
        error={listQuery.error}
        onRetry={() => void listQuery.refetch()}
        isEmpty={rows.length === 0}
        emptyMessage={t('leave.empty')}
      >
        {!ownOnly && chartData.length > 0 ? (
          <ChartContainer config={leaveChartConfig(t('leave.requests'))} className="h-48 w-full">
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} width={32} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={4} />
            </BarChart>
          </ChartContainer>
        ) : null}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('leave.person')}</TableHead>
              <TableHead>{t('leave.type')}</TableHead>
              <TableHead>{t('leave.dates')}</TableHead>
              <TableHead>{t('leave.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.uid} className="cursor-pointer" onClick={() => setSelected(row)}>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <UserRound className="size-4 text-muted-foreground" aria-hidden />
                    {personName(row)}
                  </span>
                </TableCell>
                <TableCell>{row.leaveType}</TableCell>
                <TableCell>{String(row.startDate).slice(0, 10)} – {String(row.endDate).slice(0, 10)}</TableCell>
                <TableCell>{row.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </FeatureShell>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('leave.request')}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <IconField icon={CalendarDays} label={t('leave.type')}>
              <Select value={form.leaveType} onValueChange={(value) => setForm((current) => ({ ...current, leaveType: value }))}>
                <SelectTrigger className="w-full">
                  <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
                  <SelectValue placeholder={t('leave.chooseType')} />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((item) => (
                    <SelectItem key={item} value={item}>
                      <CalendarDays className="size-4" aria-hidden />
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </IconField>
            <IconField icon={CalendarDays} label={t('leave.start')}>
              <IconInput icon={CalendarDays} type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} aria-label={t('leave.startDate')} />
            </IconField>
            <IconField icon={CalendarDays} label={t('leave.end')}>
              <IconInput icon={CalendarDays} type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} aria-label={t('leave.endDate')} />
            </IconField>
            <IconField icon={MessageSquare} label={t('leave.motivation')}>
              <IconInput icon={MessageSquare} value={form.motivation} placeholder={t('leave.motivationPlaceholder')} onChange={(event) => setForm((current) => ({ ...current, motivation: event.target.value }))} />
            </IconField>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => void submitCreate()} disabled={createMutation.isPending}>{t('actions.submit')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={selected != null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('leave.dialogTitle')}</DialogTitle></DialogHeader>
          {selected ? (
            <div className="space-y-2 text-sm">
              <p>{personName(selected)} · {selected.leaveType}</p>
              <p>{String(selected.startDate).slice(0, 10)} – {String(selected.endDate).slice(0, 10)} · {selected.status}</p>
              {selected.motivation ? <p>{selected.motivation}</p> : null}
              <IconField icon={MessageSquare} label={t('leave.reason')}>
                <IconInput icon={MessageSquare} value={reason} placeholder={t('leave.reasonPlaceholder')} onChange={(event) => setReason(event.target.value)} />
              </IconField>
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => void runAction('cancel')}>{t('leave.cancelRequest')}</Button>
            {canDecide ? (
              <>
                <Button type="button" onClick={() => void runAction('approve')}>{t('actions.approve')}</Button>
                <Button type="button" variant="destructive" onClick={() => void runAction('reject')}>{t('actions.reject')}</Button>
                <Button type="button" variant="destructive" onClick={() => void runAction('delete')}>{t('actions.delete')}</Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

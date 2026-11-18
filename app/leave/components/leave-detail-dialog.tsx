'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, Loader2, User } from 'lucide-react';
import {
  useApproveLeaveMutation,
  useCancelLeaveMutation,
  useDeleteLeaveMutation,
  useLeave,
  useRejectLeaveMutation,
} from '@/api/hooks/use-leaves';
import type { LeaveRecord } from '@/api/types/leave';
import {
  canCancelLeaveRequest,
  formatLeaveDate,
  formatLeaveDuration,
  formatLeaveStatus,
  formatLeaveType,
  leavePersonName,
  leaveStatusClassName,
  type LeaveViewer,
} from '@/app/leave/lib/leave-display';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  DetailDialogCloseButton,
  DetailFieldRow,
  DETAIL_DIALOG_CONTENT_CLASS,
  DETAIL_FIELD_GRID_CLASS,
} from '@/components/detail-dialog/detail-dialog-primitives';
import { cn } from '@/lib/utils';

export function LeaveDetailDialog({
  leave,
  open,
  onOpenChange,
  canDecide,
  viewer,
}: {
  leave: LeaveRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canDecide: boolean;
  viewer: LeaveViewer;
}) {
  const detailQuery = useLeave(leave?.uid ?? null, { enabled: open && leave?.uid != null });
  const approveMutation = useApproveLeaveMutation();
  const rejectMutation = useRejectLeaveMutation();
  const cancelMutation = useCancelLeaveMutation();
  const deleteMutation = useDeleteLeaveMutation();
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState<'view' | 'reject' | 'cancel' | 'delete'>('view');

  useEffect(() => {
    if (!open) return;
    setReason('');
    setMode('view');
  }, [open, leave?.uid]);

  const record = detailQuery.data?.leave ?? leave;
  const pending = String(record?.status ?? '').toUpperCase() === 'PENDING';
  const busy =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    cancelMutation.isPending ||
    deleteMutation.isPending;
  const showCancel = record
    ? canCancelLeaveRequest({ leave: record, viewer, canDecide })
    : false;

  function closeAfterSuccess() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DETAIL_DIALOG_CONTENT_CLASS} showCloseButton={false}>
        <DetailDialogCloseButton />
        <DialogHeader>
          <DialogTitle>{record ? formatLeaveType(record.leaveType) : 'Leave request'}</DialogTitle>
          <DialogDescription>
            {record ? `Request ${record.uid}` : 'Leave request'}
          </DialogDescription>
        </DialogHeader>

        {!record ? (
          <p className="text-sm text-muted-foreground">This request could not be opened.</p>
        ) : (
          <div className="space-y-4 text-sm">
            <Badge variant="outline" className={cn(leaveStatusClassName(record.status))}>
              {formatLeaveStatus(record.status)}
            </Badge>
            <div className={DETAIL_FIELD_GRID_CLASS}>
              <DetailFieldRow label="Person" icon={User} value={leavePersonName(record.owner)} />
              <DetailFieldRow
                label="Dates"
                icon={Calendar}
                value={`${formatLeaveDate(record.startDate)} – ${formatLeaveDate(record.endDate)}`}
              />
              <DetailFieldRow
                label="Duration"
                icon={Clock}
                value={formatLeaveDuration(record.duration, record.isHalfDay)}
              />
              <DetailFieldRow
                label="Half day"
                icon={Clock}
                value={record.isHalfDay ? formatHalfDay(record.halfDayPeriod) : 'No'}
              />
              <DetailFieldRow label="Paid" icon={Clock} value={record.isPaid === false ? 'No' : 'Yes'} />
              <DetailFieldRow
                label="Public holiday"
                icon={Calendar}
                value={record.isPublicHoliday ? 'Yes' : 'No'}
              />
            </div>
            {record.motivation ? (
              <p>
                <span className="text-muted-foreground">Reason. </span>
                {record.motivation}
              </p>
            ) : null}
            {record.rejectionReason ? (
              <p>
                <span className="text-muted-foreground">Rejection. </span>
                {record.rejectionReason}
              </p>
            ) : null}
            {record.cancellationReason ? (
              <p>
                <span className="text-muted-foreground">Cancellation. </span>
                {record.cancellationReason}
              </p>
            ) : null}
            {record.approvedBy ? (
              <p className="text-muted-foreground">Approved by {leavePersonName(record.approvedBy)}</p>
            ) : null}

            {mode === 'reject' || mode === 'cancel' ? (
              <Textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={mode === 'reject' ? 'Reason for rejection' : 'Reason for cancellation'}
                aria-label={mode === 'reject' ? 'Rejection reason' : 'Cancellation reason'}
                rows={3}
              />
            ) : null}
            {mode === 'delete' ? (
              <p className="text-sm text-muted-foreground">
                This removes the request from the inbox. The server keeps a soft-deleted copy.
              </p>
            ) : null}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {record && canDecide && pending && mode === 'view' ? (
              <>
                <Button
                  type="button"
                  variant="success"
                  disabled={busy}
                  onClick={() => approveMutation.mutate(record.uid, { onSuccess: closeAfterSuccess })}
                >
                  {approveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Approve
                </Button>
                <Button type="button" variant="cancel" disabled={busy} onClick={() => setMode('reject')}>
                  Reject
                </Button>
              </>
            ) : null}
            {record && showCancel && mode === 'view' ? (
              <Button type="button" variant="outline" disabled={busy} onClick={() => setMode('cancel')}>
                Cancel request
              </Button>
            ) : null}
            {record && canDecide && mode === 'view' ? (
              <Button type="button" variant="outline" disabled={busy} onClick={() => setMode('delete')}>
                Delete
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {mode !== 'view' ? (
              <Button type="button" variant="outline" disabled={busy} onClick={() => setMode('view')}>
                Back
              </Button>
            ) : null}
            {record && mode === 'reject' ? (
              <Button
                type="button"
                variant="cancel"
                disabled={busy || reason.trim().length === 0}
                onClick={() =>
                  rejectMutation.mutate(
                    { ref: record.uid, rejectionReason: reason.trim() },
                    { onSuccess: closeAfterSuccess }
                  )
                }
              >
                {rejectMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Confirm reject
              </Button>
            ) : null}
            {record && mode === 'cancel' ? (
              <Button
                type="button"
                variant="cancel"
                disabled={busy || reason.trim().length === 0}
                onClick={() =>
                  cancelMutation.mutate(
                    { ref: record.uid, cancellationReason: reason.trim() },
                    { onSuccess: closeAfterSuccess }
                  )
                }
              >
                {cancelMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Confirm cancel
              </Button>
            ) : null}
            {record && mode === 'delete' ? (
              <Button
                type="button"
                variant="cancel"
                disabled={busy}
                onClick={() => deleteMutation.mutate(record.uid, { onSuccess: closeAfterSuccess })}
              >
                {deleteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Confirm delete
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatHalfDay(period?: string | null): string {
  if (period === 'FIRST_HALF') return 'Morning';
  if (period === 'SECOND_HALF') return 'Afternoon';
  return 'Yes';
}

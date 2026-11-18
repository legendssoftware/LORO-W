'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useDeleteWarningMutation, useWarning } from '@/api/hooks/use-warnings';
import type { WarningRecord } from '@/api/types/warnings';
import { formatWarningDay, warningPersonName } from '@/app/warnings/components/warning-row-card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DetailDialogCloseButton,
  DetailFieldRow,
  DETAIL_DIALOG_CONTENT_CLASS,
  DETAIL_FIELD_GRID_CLASS,
} from '@/components/detail-dialog/detail-dialog-primitives';
import { AlertTriangle, Calendar, User } from 'lucide-react';

export function WarningDetailDialog({
  warning,
  open,
  onOpenChange,
  onEdit,
}: {
  warning: WarningRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (warning: WarningRecord) => void;
}) {
  const detailQuery = useWarning(warning?.uid ?? null, { enabled: open && warning?.uid != null });
  const deleteMutation = useDeleteWarningMutation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const record = detailQuery.data?.warning ?? warning;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setConfirmDelete(false);
        onOpenChange(next);
      }}
    >
      <DialogContent className={DETAIL_DIALOG_CONTENT_CLASS} showCloseButton={false}>
        <DetailDialogCloseButton />
        <DialogHeader>
          <DialogTitle>Warning {record ? record.uid : ''}</DialogTitle>
          <DialogDescription>
            {record ? `${record.severity} · ${record.status}` : 'Formal warning'}
          </DialogDescription>
        </DialogHeader>
        {record ? (
          <div className="space-y-4 text-sm">
            <div className={DETAIL_FIELD_GRID_CLASS}>
              <DetailFieldRow label="Person" icon={User} value={warningPersonName(record.owner)} />
              <DetailFieldRow label="Issued by" icon={User} value={warningPersonName(record.issuedBy)} />
              <DetailFieldRow label="Issued" icon={Calendar} value={formatWarningDay(record.issuedAt)} />
              <DetailFieldRow label="Expires" icon={Calendar} value={formatWarningDay(record.expiresAt)} />
              <DetailFieldRow label="Severity" icon={AlertTriangle} value={record.severity} />
              <DetailFieldRow label="Status" icon={AlertTriangle} value={record.status} />
            </div>
            <p>{record.reason}</p>
            {confirmDelete ? (
              <p className="text-muted-foreground">This permanently deletes the warning.</p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">This warning could not be opened.</p>
        )}
        <DialogFooter className="gap-2">
          {record && !confirmDelete ? (
            <>
              <Button type="button" variant="outline" onClick={() => onEdit(record)}>
                Edit
              </Button>
              <Button type="button" variant="cancel" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            </>
          ) : null}
          {record && confirmDelete ? (
            <>
              <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
                Back
              </Button>
              <Button
                type="button"
                variant="cancel"
                disabled={deleteMutation.isPending}
                onClick={() =>
                  deleteMutation.mutate(record.uid, { onSuccess: () => onOpenChange(false) })
                }
              >
                {deleteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Confirm delete
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

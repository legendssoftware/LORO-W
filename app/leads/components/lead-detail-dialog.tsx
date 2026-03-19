'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { format } from 'date-fns';
import type { LeadListItem } from '@/api/types/leads';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  useUpdateLeadMutation,
  useDeleteLeadMutation,
  useReactivateLeadMutation,
} from '@/api/hooks';
import type { UpdateLeadPayload } from '@/api/types/leads';
import {
  LEAD_STATUS_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  LEAD_TEMPERATURE_OPTIONS,
  LEAD_PRIORITY_OPTIONS,
} from '@/lib/lead-form-utils';
import { Loader2Icon, XIcon } from '@/lib/icons';
import { Pencil } from 'lucide-react';
import toast from 'react-hot-toast';

function getOptionLabel(
  options: { value: string; label: string }[],
  value: string | undefined
): string {
  if (!value) return '-';
  return options.find((o) => o.value === value)?.label ?? value;
}

function formatDate(s: string | undefined): string {
  if (!s) return '-';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '-' : format(d, 'MMM d, yyyy');
}

function formatDateTime(s: string | undefined): string {
  if (!s) return '-';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '-' : format(d, 'MMM d, yyyy HH:mm');
}

function formatCurrency(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return '-';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export interface LeadDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadListItem | null;
  onActionSuccess?: () => void;
}

export function LeadDetailDialog({
  open,
  onOpenChange,
  lead,
  onActionSuccess,
}: LeadDetailDialogProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [statusChangeOpen, setStatusChangeOpen] = useState(false);
  const [statusChangeTarget, setStatusChangeTarget] = useState<string | null>(null);
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [statusChangeDescription, setStatusChangeDescription] = useState('');
  const [editForm, setEditForm] = useState<{
    status?: string;
    priority?: string;
    temperature?: string;
    notes?: string;
    nextFollowUpDate?: string;
  }>({});

  const updateMutation = useUpdateLeadMutation();
  const deleteMutation = useDeleteLeadMutation();
  const reactivateMutation = useReactivateLeadMutation();

  const canReactivate =
    lead?.status === 'DECLINED' || lead?.status === 'CANCELLED';
  const isConverted = lead?.status === 'CONVERTED';
  const leadUid = lead?.uid;

  const openEdit = () => {
    setEditForm({
      status: lead?.status ?? '',
      priority: lead?.priority ?? '',
      temperature: lead?.temperature ?? '',
      notes: lead?.notes ?? '',
      nextFollowUpDate: lead?.nextFollowUpDate
        ? lead.nextFollowUpDate.slice(0, 10)
        : '',
    });
    setEditOpen(true);
  };

  const handleEditSubmit = () => {
    if (leadUid == null) return;
    const payload: UpdateLeadPayload = {
      ...(editForm.status && { status: editForm.status }),
      ...(editForm.priority && { priority: editForm.priority }),
      ...(editForm.temperature && { temperature: editForm.temperature }),
      ...(editForm.notes !== undefined && { notes: editForm.notes }),
      ...(editForm.nextFollowUpDate && {
        nextFollowUpDate: editForm.nextFollowUpDate,
      }),
    };
    updateMutation.mutate(
      { ref: leadUid, payload },
      {
        onSuccess: () => {
          toast.success('Lead updated');
          setEditOpen(false);
          onActionSuccess?.();
        },
        onError: (err: { message?: string }) => {
          toast.error(err?.message ?? 'Failed to update lead');
        },
      }
    );
  };

  const handleDelete = () => {
    if (leadUid == null) return;
    deleteMutation.mutate(leadUid, {
      onSuccess: () => {
        toast.success('Lead deleted');
        setDeleteConfirmOpen(false);
        onOpenChange(false);
        onActionSuccess?.();
      },
      onError: (err: { message?: string }) => {
        toast.error(err?.message ?? 'Failed to delete lead');
      },
    });
  };

  const handleReactivate = () => {
    if (leadUid == null) return;
    reactivateMutation.mutate(leadUid, {
      onSuccess: () => {
        toast.success('Lead reactivated');
        onOpenChange(false);
        onActionSuccess?.();
      },
      onError: (err: { message?: string }) => {
        toast.error(err?.message ?? 'Failed to reactivate lead');
      },
    });
  };

  const handleConvertToClient = () => {
    if (leadUid == null || isConverted) return;
    updateMutation.mutate(
      {
        ref: leadUid,
        payload: { status: 'CONVERTED' },
      },
      {
        onSuccess: () => {
          toast.success('Lead converted to client');
          onOpenChange(false);
          onActionSuccess?.();
        },
        onError: (err: { message?: string }) => {
          toast.error(err?.message ?? 'Failed to convert lead');
        },
      }
    );
  };

  const openStatusChange = (status: string) => {
    setStatusChangeTarget(status);
    setStatusChangeReason('');
    setStatusChangeDescription('');
    setStatusChangeOpen(true);
  };

  const handleStatusChangeSubmit = () => {
    if (leadUid == null || statusChangeTarget == null) return;
    const payload: UpdateLeadPayload = {
      status: statusChangeTarget,
      ...(statusChangeReason.trim() && { statusChangeReason: statusChangeReason.trim() }),
      ...(statusChangeDescription.trim() && { statusChangeDescription: statusChangeDescription.trim() }),
    };
    updateMutation.mutate(
      { ref: leadUid, payload },
      {
        onSuccess: () => {
          toast.success('Status updated');
          setStatusChangeOpen(false);
          setStatusChangeTarget(null);
          onActionSuccess?.();
        },
        onError: (err: { message?: string }) => {
          toast.error(err?.message ?? 'Failed to update status');
        },
      }
    );
  };

  if (!lead) return null;

  const ownerFullName = lead.owner
    ? [lead.owner.name, lead.owner.surname].filter(Boolean).join(' ').trim() || '-'
    : '-';
  const fieldGridClass = 'grid grid-cols-2 gap-x-6 gap-y-3';
  const fieldCell = (label: string, value: ReactNode) => (
    <div>
      <span className="text-muted-foreground">{label}</span>
      <div className="font-medium">{value}</div>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[calc(100%-3rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6 pt-12 pr-14"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <Button
              size="sm"
              className="gap-1.5 bg-purple-600 text-white hover:bg-purple-700"
              onClick={(e) => {
                e.stopPropagation();
                openEdit();
              }}
              disabled={!leadUid}
            >
              <Pencil className="size-4" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="success"
              className="rounded-full"
              onClick={handleConvertToClient}
              disabled={!leadUid || isConverted || updateMutation.isPending}
            >
              {updateMutation.isPending && !isConverted ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                'Convert to client'
              )}
            </Button>
            {canReactivate && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={handleReactivate}
                disabled={!leadUid || reactivateMutation.isPending}
              >
                {reactivateMutation.isPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  'Reactivate'
                )}
              </Button>
            )}
            <DialogClose asChild>
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-full border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Close"
              >
                <XIcon className="size-5" />
              </button>
            </DialogClose>
          </div>
          <DialogHeader className="pr-24">
            <DialogTitle>
              {lead.name?.trim() || lead.companyName?.trim() || `Lead #${lead.uid}`}
            </DialogTitle>
            <DialogDescription>
              {ownerFullName} · {formatDateTime(lead.updatedAt)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Contact</h4>
              <dl className={fieldGridClass}>
                {fieldCell('Name', lead.name?.trim() || '-')}
                {fieldCell('Email', lead.email?.trim() || '-')}
                {fieldCell('Phone', lead.phone?.trim() || '-')}
                {fieldCell('Company', lead.companyName?.trim() || '-')}
              </dl>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold mb-2">Status</h4>
              <dl className={fieldGridClass}>
                {fieldCell('Status', getOptionLabel(LEAD_STATUS_OPTIONS, lead.status))}
                {fieldCell('Source', getOptionLabel(LEAD_SOURCE_OPTIONS, lead.source))}
                {fieldCell('Temperature', getOptionLabel(LEAD_TEMPERATURE_OPTIONS, lead.temperature))}
                {fieldCell('Priority', getOptionLabel(LEAD_PRIORITY_OPTIONS, lead.priority))}
              </dl>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold mb-2">Scoring & value</h4>
              <dl className={fieldGridClass}>
                {fieldCell('Lead score', lead.leadScore != null ? `${lead.leadScore}` : '-')}
                {fieldCell('Estimated value', formatCurrency(lead.estimatedValue))}
              </dl>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold mb-2">Dates</h4>
              <dl className={fieldGridClass}>
                {fieldCell('Created', formatDateTime(lead.createdAt))}
                {fieldCell('Updated', formatDateTime(lead.updatedAt))}
                {fieldCell('Last contact', formatDate(lead.lastContactDate))}
                {fieldCell('Next follow-up', formatDate(lead.nextFollowUpDate))}
              </dl>
            </div>
            {(lead.totalInteractions != null || lead.averageResponseTime != null) && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Activity</h4>
                  <dl className={fieldGridClass}>
                    {lead.totalInteractions != null &&
                      fieldCell('Total interactions', lead.totalInteractions)}
                    {lead.averageResponseTime != null &&
                      fieldCell('Avg response time (hours)', lead.averageResponseTime)}
                  </dl>
                </div>
              </>
            )}
            <Separator />
            <div>
              <h4 className="font-semibold mb-2">People</h4>
              <dl className={fieldGridClass}>
                <div>
                  <span className="text-muted-foreground">Owner</span>
                  <div className="mt-0.5 flex items-center gap-2 font-medium">
                    {lead.owner ? (
                      <>
                        <Avatar className="size-6">
                          <AvatarImage
                            src={
                              lead.owner.photoURL ?? lead.owner.avatar ?? undefined
                            }
                            alt=""
                          />
                          <AvatarFallback className="text-xs">
                            {[lead.owner.name, lead.owner.surname]
                              .filter(Boolean)
                              .join(' ')
                              .slice(0, 2)
                              .toUpperCase() || '-'}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          {[lead.owner.name, lead.owner.surname]
                            .filter(Boolean)
                            .join(' ')
                            .trim() || lead.owner.email || '-'}
                        </span>
                      </>
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
                {lead.assignees && lead.assignees.length > 0 ? (
                  <div>
                    <span className="text-muted-foreground">Assignees</span>
                    <ul className="mt-0.5 list-inside list-disc font-medium">
                      {lead.assignees.map((a, i) => (
                        <li key={i}>
                          {[a.name, a.email].filter(Boolean).join(' ') || '-'}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  fieldCell('Assignees', '-')
                )}
              </dl>
            </div>
            {lead.notes?.trim() && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Notes</h4>
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {lead.notes.trim()}
                  </p>
                </div>
              </>
            )}
            {lead.attachments && lead.attachments.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Attachments</h4>
                  <ul className="space-y-1">
                    {lead.attachments.map((url, i) => (
                      <li key={i}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline hover:no-underline"
                        >
                          {url.length > 50 ? `${url.slice(0, 50)}…` : url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-3">
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={!leadUid}
            >
              Delete
            </Button>
          </DialogFooter>

          <div className="border-t pt-3">
            <p className="font-semibold mb-2">
              Change status
            </p>
            <div className="flex flex-wrap gap-2">
              {LEAD_STATUS_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={lead.status === opt.value ? 'secondary' : 'outline'}
                  size="sm"
                  className="rounded-full"
                  disabled={!leadUid || lead.status === opt.value}
                  onClick={() => openStatusChange(opt.value)}
                >
                  Set to {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit lead dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[calc(100%-3rem)] sm:max-w-md max-h-[90vh] overflow-y-auto p-6 pt-12 pr-14"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute top-4 right-4 z-10">
            <DialogClose asChild>
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-full border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Close"
              >
                <XIcon className="size-5" />
              </button>
            </DialogClose>
          </div>
          <DialogHeader className="pr-24">
            <DialogTitle>Edit lead</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={editForm.status || ''}
                onValueChange={(v) =>
                  setEditForm((f) => ({ ...f, status: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select
                value={editForm.priority || ''}
                onValueChange={(v) =>
                  setEditForm((f) => ({ ...f, priority: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Temperature</Label>
              <Select
                value={editForm.temperature || ''}
                onValueChange={(v) =>
                  setEditForm((f) => ({ ...f, temperature: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select temperature" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_TEMPERATURE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Next follow-up date</Label>
              <Input
                type="date"
                value={editForm.nextFollowUpDate || ''}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    nextFollowUpDate: e.target.value || undefined,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                value={editForm.notes || ''}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button
              variant="cancel"
              className="rounded-full"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              className="rounded-full"
              onClick={handleEditSubmit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the lead. You can restore it later if
              needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change status sub-dialog */}
      <Dialog open={statusChangeOpen} onOpenChange={setStatusChangeOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[calc(100%-3rem)] sm:max-w-md max-h-[90vh] overflow-y-auto p-6 pt-12 pr-14"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute top-4 right-4 z-10">
            <DialogClose asChild>
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-full border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Close"
              >
                <XIcon className="size-5" />
              </button>
            </DialogClose>
          </div>
          <DialogHeader className="pr-24">
            <DialogTitle>
              Set status to{' '}
              {statusChangeTarget
                ? getOptionLabel(LEAD_STATUS_OPTIONS, statusChangeTarget)
                : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="status-reason">Reason (optional)</Label>
              <Input
                id="status-reason"
                value={statusChangeReason}
                onChange={(e) => setStatusChangeReason(e.target.value)}
                placeholder="e.g. Customer requested callback"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status-description">Description (optional)</Label>
              <Textarea
                id="status-description"
                value={statusChangeDescription}
                onChange={(e) => setStatusChangeDescription(e.target.value)}
                placeholder="Additional notes"
                rows={6}
                className="min-h-[120px] resize-y rounded-md"
              />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button
              variant="cancel"
              className="rounded-full"
              onClick={() => setStatusChangeOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              className="rounded-full"
              onClick={handleStatusChangeSubmit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                'Confirm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

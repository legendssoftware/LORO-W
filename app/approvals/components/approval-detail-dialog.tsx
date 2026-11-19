'use client';

import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import {
  Calendar,
  Check,
  Clock,
  DollarSign,
  FileText,
  Loader2Icon,
  Paperclip,
  Shield,
  User,
  X,
} from 'lucide-react';
import type { Approval, ApprovalSourceItem } from '@/api/types/approvals';
import { useApiClient } from '@/api/hooks/use-api-client';
import { useApproval, usePerformApprovalAction } from '@/api/hooks/use-approvals';
import {
  archiveApproval,
  bulkApprovalAction,
  getApprovalHistory,
  getApprovalSignatures,
  signApproval,
  submitApproval,
  withdrawApproval,
} from '@/api/endpoints/approvals';
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
  DetailSectionHeading,
  APPROVAL_DETAIL_DIALOG_CONTENT_CLASS,
  APPROVAL_DETAIL_FIELD_GRID_CLASS,
} from '@/components/detail-dialog/detail-dialog-primitives';
import {
  collectApprovalPayloadSections,
  collectIntakeFormSections,
  collectRecordFieldSections,
  formatApprovalTypeLabel,
  type IntakeFormRow,
} from '@/app/approvals/intake-form-fields';
import {
  approvalPriorityClassName,
  approvalStatusClassName,
  formatApprovalAmount,
  getApprovalSourceEntityType,
  getApprovalSourceHref,
  resolveApprovalAmount,
} from '@/app/approvals/approval-display';
import { ApprovalSourceOpenButton } from '@/app/approvals/components/approval-source-open-button';
import { cn } from '@/lib/utils';

function formatDateTime(value?: string): string {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'd MMM yyyy HH:mm');
  } catch {
    return value;
  }
}

function personName(person?: { name?: string; surname?: string; email?: string }): string {
  const name = `${person?.name ?? ''} ${person?.surname ?? ''}`.trim();
  return name || person?.email || '—';
}

function isPhotoRow(row: IntakeFormRow): boolean {
  return row.name === 'photoURL' || row.name.endsWith('.photoURL');
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function IntakeValue({ row }: { row: IntakeFormRow }) {
  const { t } = useTranslation('screens');
  if (isPhotoRow(row) && isHttpUrl(row.value)) {
    return (
      <a href={row.value} target="_blank" rel="noreferrer" className="inline-block">
        {/* Intake photos are stored on GCS; next/image remotePatterns do not allow that host. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={row.value}
          alt={t('approvals.employeePhoto')}
          className="size-16 rounded-md object-cover"
        />
      </a>
    );
  }
  if (isHttpUrl(row.value)) {
    return (
      <a
        href={row.value}
        target="_blank"
        rel="noreferrer"
        className="break-all text-violet-700 underline underline-offset-2"
      >
        {row.value}
      </a>
    );
  }
  return row.value;
}

function sourceSectionTitle(sourceItem: ApprovalSourceItem | undefined, translate: TFunction): string {
  const type = String(sourceItem?.entityType ?? '').toLowerCase();
  if (type === 'claim') return translate('approvals.sourceClaim');
  if (type === 'leave') return translate('approvals.sourceLeave');
  if (type === 'client_profile' || type === 'client_credit_limit' || type === 'client') {
    return translate('approvals.sourceClient');
  }
  return sourceItem?.label || translate('approvals.sourceFallback');
}

export function ApprovalDetailDialog({
  approval,
  open,
  onOpenChange,
  canAct,
}: {
  approval: Approval | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canAct: boolean;
}) {
  const { t } = useTranslation('screens');
  const detailQuery = useApproval(approval?.uid ?? null, {
    enabled: open && approval?.uid != null,
  });
  const actionMutation = usePerformApprovalAction();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open, approval?.uid]);

  const record = detailQuery.data ?? approval;
  const status = String(record?.status ?? '').toLowerCase();
  const isActionable =
    canAct && ['pending', 'under_review', 'submitted'].includes(status);
  const intakeForm = record?.intakeForm;
  const sourceItem = record?.sourceItem;
  const intakeSections = useMemo(
    () => (intakeForm ? collectIntakeFormSections(intakeForm) : []),
    [intakeForm],
  );
  const sourceSections = useMemo(
    () =>
      intakeForm
        ? []
        : collectRecordFieldSections({
            record: record?.sourceRecord,
            detailsTitle: sourceSectionTitle(sourceItem, t),
          }),
    [intakeForm, record?.sourceRecord, sourceItem, t],
  );
  const payloadSections = useMemo(() => {
    const sourceKeys = record?.sourceRecord ? Object.keys(record.sourceRecord) : [];
    return collectApprovalPayloadSections({
      entityData: record?.entityData,
      metadata: record?.metadata,
      skipKeys: [
        'userId',
        'claimId',
        'leaveId',
        'clientId',
        'clientAuthId',
        'clientClerkUserId',
        ...(intakeForm ? ['hireName', 'hireEmail', 'email', 'invitationUid', 'source'] : []),
        ...sourceKeys,
      ],
    });
  }, [record?.entityData, record?.metadata, record?.sourceRecord, intakeForm]);
  const amountLabel = record
    ? formatApprovalAmount(resolveApprovalAmount(record), record.currency)
    : undefined;
  const sourceHref = record ? getApprovalSourceHref(record) : undefined;
  const sourceType = record ? getApprovalSourceEntityType(record) : undefined;
  const sourceOpenButton = (
    <ApprovalSourceOpenButton href={sourceHref} entityType={sourceType} />
  );
  const deadlineLabel = record?.deadline
    ? `${formatDateTime(record.deadline)}${record.isOverdue ? ' (overdue)' : ''}`
    : undefined;

  async function handleAction(action: 'approve' | 'reject') {
    if (!record?.uid) return;
    await actionMutation.mutateAsync({
      uid: record.uid,
      action,
      comments: action === 'approve' ? 'Approved via web inbox' : undefined,
      reason: action === 'reject' ? reason.trim() || 'Rejected via web inbox' : undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={APPROVAL_DETAIL_DIALOG_CONTENT_CLASS} showCloseButton={false}>
        <DetailDialogCloseButton />
        <DialogHeader>
          <DialogTitle>{t('approvals.details')}</DialogTitle>
          <DialogDescription>
            {record?.approvalReference || (record ? `APR-${record.uid}` : 'Loading…')}
          </DialogDescription>
        </DialogHeader>

        {detailQuery.isLoading && !detailQuery.data ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Loading full details…
          </div>
        ) : record ? (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className={cn('uppercase', approvalStatusClassName(record.status))}
              >
                {record.status}
              </Badge>
              {record.priority ? (
                <Badge
                  variant="outline"
                  className={cn('uppercase', approvalPriorityClassName(record.priority))}
                >
                  {record.priority}
                </Badge>
              ) : null}
              {record.isUrgent ? (
                <Badge
                  variant="outline"
                  className={cn('uppercase', approvalPriorityClassName('urgent'))}
                >
                  Urgent
                </Badge>
              ) : null}
            </div>

            <section>
              <DetailSectionHeading
                title={t('approvals.request')}
                icon={FileText}
                action={
                  intakeSections.length === 0 && sourceSections.length === 0
                    ? sourceOpenButton
                    : null
                }
              />
              <div className={APPROVAL_DETAIL_FIELD_GRID_CLASS}>
                <DetailFieldRow label={t('approvals.fieldTitle')} value={record.title} icon={FileText} />
                <DetailFieldRow
                  label={t('approvals.type')}
                  value={formatApprovalTypeLabel(record.type)}
                  icon={FileText}
                />
                <DetailFieldRow
                  label={t('approvals.submittedBy')}
                  value={personName(record.requester)}
                  icon={User}
                />
                <DetailFieldRow
                  label={t('approvals.submitted')}
                  value={formatDateTime(record.submittedAt ?? record.createdAt)}
                  icon={Calendar}
                />
                {record.approver ? (
                  <DetailFieldRow
                    label={t('approvals.approver')}
                    value={personName(record.approver)}
                    icon={Shield}
                  />
                ) : null}
                {deadlineLabel ? (
                  <DetailFieldRow label={t('approvals.deadline')} value={deadlineLabel} icon={Clock} />
                ) : null}
                {amountLabel ? (
                  <DetailFieldRow label={t('approvals.amount')} value={amountLabel} icon={DollarSign} />
                ) : null}
                {record.requestSource ? (
                  <DetailFieldRow
                    label={t('approvals.requestSource')}
                    value={record.requestSource}
                    icon={FileText}
                  />
                ) : null}
              </div>
              {record.description ? (
                <p className="mt-3 text-sm text-muted-foreground">{record.description}</p>
              ) : null}
            </section>

            {intakeSections.map((section, index) => (
              <section key={section.title}>
                <DetailSectionHeading
                  title={section.title}
                  icon={User}
                  action={index === 0 ? sourceOpenButton : undefined}
                />
                <div className={APPROVAL_DETAIL_FIELD_GRID_CLASS}>
                  {section.rows.map((row) => (
                    <DetailFieldRow
                      key={row.name}
                      label={row.label}
                      value={<IntakeValue row={row} />}
                      icon={User}
                    />
                  ))}
                </div>
              </section>
            ))}

            {sourceSections.map((section, index) => (
              <section key={section.title}>
                <DetailSectionHeading
                  title={section.title}
                  icon={FileText}
                  action={index === 0 ? sourceOpenButton : undefined}
                />
                <div className={APPROVAL_DETAIL_FIELD_GRID_CLASS}>
                  {section.rows.map((row) => (
                    <DetailFieldRow
                      key={row.name}
                      label={row.label}
                      value={<IntakeValue row={row} />}
                      icon={FileText}
                    />
                  ))}
                </div>
              </section>
            ))}

            {intakeForm?.documents?.length ? (
              <section>
                <DetailSectionHeading title={t('approvals.documents')} icon={Paperclip} />
                <ul className="space-y-2">
                  {intakeForm.documents.map((doc) => (
                    <li key={doc.url}>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-violet-700 underline underline-offset-2"
                      >
                        {doc.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {payloadSections.map((section) => (
              <section key={section.title}>
                <DetailSectionHeading title={section.title} icon={FileText} />
                <div className={APPROVAL_DETAIL_FIELD_GRID_CLASS}>
                  {section.rows.map((row) => (
                    <DetailFieldRow
                      key={row.name}
                      label={row.label}
                      value={<IntakeValue row={row} />}
                      icon={FileText}
                    />
                  ))}
                </div>
              </section>
            ))}

            {isActionable ? (
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="approval-decline-reason">
                  {t('approvals.declineReason')}
                </label>
                <Textarea
                  id="approval-decline-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={t('approvals.declinePlaceholder')}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {record?.uid ? <ApprovalLifecycleActions approvalId={record.uid} /> : null}

        {isActionable ? (
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="destructive"
              disabled={actionMutation.isPending}
              onClick={() => handleAction('reject')}
            >
              {actionMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <X className="size-4" />
              )}
              {t('actions.reject')}
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={actionMutation.isPending}
              onClick={() => handleAction('approve')}
            >
              {actionMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {t('actions.approve')}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ApprovalLifecycleActions({ approvalId }: { approvalId: number }) {
  const { t } = useTranslation('screens');
  const client = useApiClient();
  async function run(label: string, task: () => Promise<unknown>) {
    try {
      const result = await task();
      toast.success(typeof result === 'object' && result && 'message' in result ? String((result as { message?: string }).message) : label);
    } catch {
      toast.error(t('approvals.couldNotAction', { action: label }));
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" onClick={() => void run(t('approvals.submittedDone'), () => submitApproval(client, approvalId))}>{t('actions.submit')}</Button>
      <Button type="button" size="sm" variant="outline" onClick={() => void run(t('approvals.signedDone'), () => signApproval(client, approvalId))}>{t('approvals.sign')}</Button>
      <Button type="button" size="sm" variant="outline" onClick={() => void run(t('approvals.withdrawnDone'), () => withdrawApproval(client, approvalId))}>{t('approvals.withdraw')}</Button>
      <Button type="button" size="sm" variant="outline" onClick={() => void run(t('approvals.archivedDone'), () => archiveApproval(client, approvalId))}>{t('approvals.archive')}</Button>
      <Button type="button" size="sm" variant="outline" onClick={() => void run(t('approvals.historyLoaded'), () => getApprovalHistory(client, approvalId))}>{t('approvals.history')}</Button>
      <Button type="button" size="sm" variant="outline" onClick={() => void run(t('approvals.signaturesLoaded'), () => getApprovalSignatures(client, approvalId))}>{t('approvals.signatures')}</Button>
      <Button type="button" size="sm" variant="outline" onClick={() => void run(t('approvals.bulkSent'), () => bulkApprovalAction(client, [approvalId], 'approve'))}>{t('approvals.bulkApprove')}</Button>
    </div>
  );
}

'use client';

import { useTranslation } from 'react-i18next';

import { useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ExternalLink, FileText, ShoppingBag } from 'lucide-react';
import type { ClientProfileData, ClientProject } from '@/api/types/client-portal';
import { getMyClientProject } from '@/api/endpoints/client-portal';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  formatQuotationStatusLabel,
  formatZar,
  parseQuotationAmount,
  quotationStatusClass,
} from '@/lib/client-portal-utils';
import {
  formatProjectAddress,
  formatProjectLabel,
  getProjectQuotations,
  getProjectSales,
  projectStatusClass,
} from '@/lib/project-display';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DialogCloseButton } from '@/components/dialog-close-button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/loading-spinner';

function formatDate(value?: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : format(d, 'PPp');
}

function MetadataRow({ label, value }: { label: string; value: ReactNode }) {
  if (value == null || value === '' || value === false) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium break-words">{value}</p>
    </div>
  );
}

function LinkedRecordButton({
  title,
  subtitle,
  amount,
  status,
  href,
}: {
  title: string;
  subtitle?: string;
  amount?: string;
  status?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="w-full flex items-center justify-between gap-3 rounded-lg border p-3 text-left hover:bg-muted/50 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm truncate">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1">
        {amount && <p className="text-sm font-semibold">{amount}</p>}
        {status && (
          <Badge className={`text-[10px] ${quotationStatusClass(status)}`}>
            {formatQuotationStatusLabel(status)}
          </Badge>
        )}
      </div>
    </Link>
  );
}

export function ProjectDetailDialog({
  project,
  client,
  open,
  onOpenChange,
}: {
  project: ClientProject | null;
  client: ClientProfileData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation('portal');
  const apiClient = useApiClient();

  const projectId = project?.uid;

  const { data: fetchedProject, isLoading } = useQuery({
    queryKey: ['shop', 'projects', 'me', projectId],
    queryFn: () => getMyClientProject(apiClient, projectId!),
    enabled: open && projectId != null,
    staleTime: 60_000,
  });

  const detail = fetchedProject ?? project;

  const quotations = useMemo(
    () => (detail ? getProjectQuotations(detail, client) : []),
    [detail, client]
  );

  const sales = useMemo(() => getProjectSales(quotations), [quotations]);

  if (!project) return null;

  const title = detail?.name ?? `Project #${project.uid}`;
  const assignedName = detail?.assignedUser
    ? [detail.assignedUser.name, detail.assignedUser.surname]
        .filter(Boolean)
        .join(' ')
    : null;

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="max-w-3xl max-h-[85vh] overflow-y-auto rounded shadow-none sm:max-w-3xl"
        >
          <DialogHeader className="flex flex-row items-start justify-between gap-4 space-y-0 text-left">
            <DialogTitle className="pr-2">{title}</DialogTitle>
            <DialogCloseButton />
          </DialogHeader>

          {isLoading && !detail ? (
            <LoadingSpinner wrapperClassName="py-12" />
          ) : (
            <div className="space-y-6 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge className={projectStatusClass(detail?.status)}>
                  {formatProjectLabel(detail?.status)}
                </Badge>
                {detail?.priority && (
                  <Badge variant="outline">
                    {formatProjectLabel(detail.priority)} priority
                  </Badge>
                )}
                {detail?.type && (
                  <Badge variant="outline">{formatProjectLabel(detail.type)}</Badge>
                )}
              </div>

              {detail?.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {detail.description}
                </p>
              )}

              <section>
                <h3 className="font-medium mb-3">{t('overview')}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <MetadataRow label={t('projectNumber')} value={String(detail?.uid ?? project.uid)} />
                  <MetadataRow
                    label={t('status')}
                    value={formatProjectLabel(detail?.status)}
                  />
                  <MetadataRow
                    label={t('type')}
                    value={formatProjectLabel(detail?.type)}
                  />
                  <MetadataRow
                    label={t('priority')}
                    value={formatProjectLabel(detail?.priority)}
                  />
                  <MetadataRow label={t('assignedTo')} value={assignedName} />
                  <MetadataRow
                    label={t('progress')}
                    value={
                      detail?.progressPercentage != null
                        ? `${detail.progressPercentage}%`
                        : null
                    }
                  />
                  <MetadataRow label={t('currency')} value={detail?.currency ?? 'ZAR'} />
                  <MetadataRow label={t('created')} value={formatDate(detail?.createdAt)} />
                  <MetadataRow label={t('updated')} value={formatDate(detail?.updatedAt)} />
                </div>
              </section>

              <section>
                <h3 className="font-medium mb-3">{t('financials')}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <MetadataRow
                    label={t('budget')}
                    value={
                      detail?.budget != null ? formatZar(detail.budget) : null
                    }
                  />
                  <MetadataRow
                    label={t('spent')}
                    value={
                      detail?.currentSpent != null
                        ? formatZar(detail.currentSpent)
                        : null
                    }
                  />
                  <MetadataRow
                    label={t('value')}
                    value={detail?.value != null ? formatZar(detail.value) : null}
                  />
                  <MetadataRow
                    label={t('totalCost')}
                    value={
                      detail?.totalCost != null ? formatZar(detail.totalCost) : null
                    }
                  />
                </div>
              </section>

              <section>
                <h3 className="font-medium mb-3">{t('timeline')}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <MetadataRow label={t('startDate')} value={formatDate(detail?.startDate)} />
                  <MetadataRow label={t('endDate')} value={formatDate(detail?.endDate)} />
                  <MetadataRow
                    label={t('expectedCompletion')}
                    value={formatDate(detail?.expectedCompletionDate)}
                  />
                </div>
              </section>

              <section>
                <h3 className="font-medium mb-3">{t('contact')}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <MetadataRow label={t('contactPerson')} value={detail?.contactPerson} />
                  <MetadataRow label={t('email')} value={detail?.contactEmail} />
                  <MetadataRow label={t('phone')} value={detail?.contactPhone} />
                </div>
              </section>

              {(detail?.address ||
                detail?.latitude != null ||
                detail?.longitude != null) && (
                <section>
                  <h3 className="font-medium mb-3">{t('location')}</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <MetadataRow
                      label={t('address')}
                      value={formatProjectAddress(detail?.address)}
                    />
                    {detail?.latitude != null && detail?.longitude != null && (
                      <MetadataRow
                        label={t('coordinates')}
                        value={`${detail.latitude}, ${detail.longitude}`}
                      />
                    )}
                  </div>
                </section>
              )}

              {detail?.requirements && detail.requirements.length > 0 && (
                <section>
                  <h3 className="font-medium mb-2">{t('requirements')}</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {detail.requirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </section>
              )}

              {detail?.tags && detail.tags.length > 0 && (
                <section>
                  <h3 className="font-medium mb-2">{t('tags')}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              {detail?.notes && (
                <section>
                  <h3 className="font-medium mb-2">{t('notes')}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {detail.notes}
                  </p>
                </section>
              )}

              {detail?.linkedInvoices && detail.linkedInvoices.length > 0 && (
                <section>
                  <h3 className="font-medium mb-2">{t('linkedInvoices')}</h3>
                  <ul className="space-y-1 text-sm">
                    {detail.linkedInvoices.map((inv) => (
                      <li key={inv} className="font-mono text-xs">
                        {inv}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {detail?.linkedMedia && detail.linkedMedia.length > 0 && (
                <section>
                  <h3 className="font-medium mb-2">{t('linkedMedia')}</h3>
                  <ul className="space-y-2">
                    {detail.linkedMedia.map((media, i) => (
                      <li key={i}>
                        <a
                          href={media.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-primary text-sm underline-offset-4 hover:underline"
                        >
                          <ExternalLink className="size-3.5 shrink-0" />
                          {media.label ?? media.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <FileText className="size-4" />
                  Linked quotations
                  <span className="text-muted-foreground font-normal">
                    ({quotations.length})
                  </span>
                </h3>
                {quotations.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No quotations linked to this project yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {quotations.map((q) => (
                      <LinkedRecordButton
                        key={q.uid}
                        title={
                          q.quotationNumber ??
                          q.title ??
                          `Quotation #${q.uid}`
                        }
                        subtitle={formatDate(q.createdAt) ?? undefined}
                        amount={formatZar(parseQuotationAmount(q.totalAmount))}
                        status={q.status}
                        href={`/orders/${q.uid}`}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <ShoppingBag className="size-4" />
                  Sales & orders
                  <span className="text-muted-foreground font-normal">
                    ({sales.length})
                  </span>
                </h3>
                {sales.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No converted sales or orders for this project yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {sales.map((q) => (
                      <LinkedRecordButton
                        key={`sale-${q.uid}`}
                        title={q.orderNumber ?? q.quotationNumber ?? `Order #${q.uid}`}
                        subtitle={
                          q.isConverted
                            ? `Converted ${formatDate(q.convertedAt as string) ?? ''}`.trim()
                            : formatDate(q.createdAt) ?? undefined
                        }
                        amount={formatZar(parseQuotationAmount(q.totalAmount))}
                        status={q.status}
                        href={`/orders/${q.uid}`}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
  );
}

'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useCompetitor, useDeleteCompetitorMutation } from '@/api/hooks';
import type { CompetitorListItem } from '@/api/types/competitors';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { COMPETITOR_MODAL_CONTENT_CLASS } from './competitor-dialog-shared';
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
import { LoadingSpinner } from '@/components/loading-spinner';
import { Pencil, Trash2, ExternalLink } from 'lucide-react';
import { formatDisplayName, formatEmailDisplay } from '@/lib/client-display';
import { cn } from '@/lib/utils';
import { useState } from 'react';

function ModalRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={cn('break-words text-right font-medium', valueClassName)}>{value}</span>
    </div>
  );
}

function ModalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="border-b border-border pb-1.5 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

export function CompetitorDetailDialog({
  listItem,
  onClose,
  onEdit,
  canEdit,
  canDelete,
}: {
  listItem: CompetitorListItem | null;
  onClose: () => void;
  onEdit: (id: number) => void;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const open = !!listItem;
  const id = listItem?.uid ?? null;
  const { data: competitor, isLoading, isError } = useCompetitor(id, { enabled: open && id != null });
  const deleteMutation = useDeleteCompetitorMutation();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  function handleDelete() {
    if (id == null) return;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        setDeleteConfirmOpen(false);
        onClose();
      },
    });
  }

  const addr = competitor?.address;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className={cn(COMPETITOR_MODAL_CONTENT_CLASS)}>
          <DialogHeader className="shrink-0 space-y-1 px-6 pt-6 pb-2 pr-12">
            <div className="flex items-start justify-between gap-2">
              <DialogTitle className="text-left leading-tight">
                {listItem?.name
                  ? formatDisplayName(listItem.name) || listItem.name
                  : 'Competitor'}
              </DialogTitle>
              {id != null ? (
                <Button variant="ghost" size="icon" className="-mt-1 shrink-0" asChild>
                  <Link href={`/competitors/${id}`} title="Open full page">
                    <ExternalLink className="size-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
            {listItem?.contactEmail ? (
              <p className="text-left text-xs text-muted-foreground">
                {formatEmailDisplay(listItem.contactEmail)}
              </p>
            ) : null}
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6">
            <div className="space-y-4 pb-4 pr-3">
              {isLoading && (
                <div className="py-8">
                  <LoadingSpinner />
                </div>
              )}
              {isError && (
                <p className="text-sm text-destructive">Could not load competitor details.</p>
              )}
              {!isLoading && competitor && (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {competitor.status ? (
                      <Badge variant="secondary" className="capitalize">
                        {String(competitor.status)}
                      </Badge>
                    ) : null}
                    {typeof competitor.threatLevel === 'number' && competitor.threatLevel > 0 ? (
                      <Badge variant="outline">Threat {competitor.threatLevel}/5</Badge>
                    ) : null}
                    {competitor.isDirect === true ? (
                      <Badge variant="outline">Direct</Badge>
                    ) : competitor.isDirect === false ? (
                      <Badge variant="outline">Indirect</Badge>
                    ) : null}
                    {competitor.industry ? (
                      <Badge variant="outline">{competitor.industry}</Badge>
                    ) : null}
                  </div>
                  <ModalSection title="Contact">
                    <ModalRow label="Email" value={competitor.contactEmail ? formatEmailDisplay(competitor.contactEmail) : '—'} />
                    <ModalRow label="Phone" value={competitor.contactPhone ?? '—'} />
                    {competitor.website ? (
                      <ModalRow
                        label="Website"
                        value={
                          <a
                            href={
                              competitor.website.startsWith('http')
                                ? competitor.website
                                : `https://${competitor.website}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline"
                          >
                            {competitor.website}
                          </a>
                        }
                      />
                    ) : null}
                  </ModalSection>
                  <ModalSection title="Location">
                    {addr ? (
                      <>
                        <ModalRow label="Street" value={addr.street ?? '—'} />
                        <ModalRow label="City" value={addr.city ?? '—'} />
                        <ModalRow label="Province" value={addr.state ?? '—'} />
                        <ModalRow label="Country" value={addr.country ?? '—'} />
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No address on file.</p>
                    )}
                    {competitor.latitude != null && competitor.longitude != null ? (
                      <ModalRow
                        label="Coordinates"
                        value={`${competitor.latitude}, ${competitor.longitude}`}
                      />
                    ) : null}
                  </ModalSection>
                  {competitor.description ? (
                    <ModalSection title="Notes">
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {String(competitor.description)}
                      </p>
                    </ModalSection>
                  ) : null}
                  {(competitor.createdAt || competitor.updatedAt) && (
                    <ModalSection title="Record">
                      {competitor.createdAt ? (
                        <ModalRow
                          label="Created"
                          value={format(new Date(competitor.createdAt), 'MMM d, yyyy')}
                        />
                      ) : null}
                      {competitor.updatedAt ? (
                        <ModalRow
                          label="Updated"
                          value={format(new Date(competitor.updatedAt), 'MMM d, yyyy')}
                        />
                      ) : null}
                    </ModalSection>
                  )}
                </>
              )}
            </div>
          </div>

          <Separator className="shrink-0" />
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 px-6 py-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {id != null && canEdit ? (
              <Button variant="outline" className="gap-1" onClick={() => onEdit(id)}>
                <Pencil className="size-4" />
                Edit
              </Button>
            ) : null}
            {id != null && canDelete ? (
              <Button variant="destructive" className="gap-1" onClick={() => setDeleteConfirmOpen(true)}>
                <Trash2 className="size-4" />
                Delete
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this competitor?</AlertDialogTitle>
            <AlertDialogDescription>
              The competitor will be archived (soft delete). Only administrators can remove records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

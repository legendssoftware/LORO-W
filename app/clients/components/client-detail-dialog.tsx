'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useClient, useDeleteClientMutation } from '@/api/hooks';
import type { ClientListItem } from '@/api/types/clients';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CLIENT_MODAL_CONTENT_CLASS } from './client-dialog-shared';
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
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between gap-1 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={cn('font-medium break-words text-right', valueClassName)}>{value}</span>
    </div>
  );
}

function ModalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground border-b border-border pb-1.5">{title}</h3>
      {children}
    </div>
  );
}

function formatZar(n: unknown): string {
  if (n == null || n === '') return '—';
  const num = typeof n === 'string' ? Number(n) : Number(n);
  if (Number.isNaN(num)) return '—';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function ClientDetailDialog({
  listItem,
  onClose,
  onEdit,
}: {
  listItem: ClientListItem | null;
  onClose: () => void;
  onEdit: (ref: number) => void;
}) {
  const open = !!listItem;
  const ref = listItem?.uid ?? null;
  const { data: client, isLoading, isError } = useClient(ref, { enabled: open && ref != null });
  const deleteMutation = useDeleteClientMutation();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  function handleDelete() {
    if (ref == null) return;
    deleteMutation.mutate(ref, {
      onSuccess: () => {
        setDeleteConfirmOpen(false);
        onClose();
      },
    });
  }

  const addr = client?.address;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className={cn(CLIENT_MODAL_CONTENT_CLASS)}>
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0 space-y-1 pr-12">
            <div className="flex items-start justify-between gap-2">
              <DialogTitle className="text-left leading-tight">
                {listItem?.name
                  ? formatDisplayName(listItem.name) || listItem.name
                  : 'Client'}
              </DialogTitle>
              {ref != null ? (
                <Button variant="ghost" size="icon" className="shrink-0 -mt-1" asChild>
                  <Link href={`/clients/${ref}`} title="Open full page">
                    <ExternalLink className="size-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
            {listItem?.email ? (
              <p className="text-xs text-muted-foreground text-left">
                {formatEmailDisplay(listItem.email)}
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
                <p className="text-sm text-destructive">Could not load client details.</p>
              )}
              {!isLoading && client && (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {client.status ? (
                      <Badge variant="secondary" className="capitalize">
                        {client.status}
                      </Badge>
                    ) : null}
                    {client.category ? <Badge variant="outline">{client.category}</Badge> : null}
                  </div>
                  <ModalSection title="Contact">
                    <ModalRow
                      label="Contact person"
                      value={
                        client.contactPerson
                          ? formatDisplayName(client.contactPerson)
                          : '—'
                      }
                    />
                    <ModalRow label="Phone" value={client.phone ?? '—'} />
                    <ModalRow label="Alt. phone" value={client.alternativePhone ?? '—'} />
                    <ModalRow
                      label="Email"
                      value={client.email ? formatEmailDisplay(client.email) : '—'}
                    />
                    {client.website ? (
                      <ModalRow
                        label="Website"
                        value={
                          <a
                            href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline"
                          >
                            {client.website}
                          </a>
                        }
                      />
                    ) : null}
                  </ModalSection>
                  <ModalSection title="Address">
                    {addr ? (
                      <>
                        <ModalRow label="Street" value={addr.street ?? '—'} />
                        <ModalRow label="Suburb" value={addr.suburb ?? '—'} />
                        <ModalRow label="City" value={addr.city ?? '—'} />
                        <ModalRow label="Province" value={addr.state ?? '—'} />
                        <ModalRow label="Country" value={addr.country ?? '—'} />
                        <ModalRow label="Postal" value={addr.postalCode ?? '—'} />
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No address on file.</p>
                    )}
                  </ModalSection>
                  <ModalSection title="Business">
                    <ModalRow label="Industry" value={client.industry ?? '—'} />
                    <ModalRow
                      label="Sales rep"
                      value={
                        client.assignedSalesRep?.name
                          ? formatDisplayName(client.assignedSalesRep.name) ||
                            client.assignedSalesRep.name
                          : client.assignedSalesRep?.email
                            ? formatEmailDisplay(client.assignedSalesRep.email)
                            : '—'
                      }
                    />
                    {client.description ? (
                      <ModalRow label="Description" value={client.description} />
                    ) : null}
                  </ModalSection>
                  <ModalSection title="Financial">
                    <ModalRow label="Credit limit" value={formatZar(client.creditLimit)} />
                    <ModalRow label="Outstanding" value={formatZar(client.outstandingBalance)} />
                    {typeof client.utilization === 'number' ? (
                      <ModalRow
                        label="Utilization"
                        value={`${client.utilization}%`}
                      />
                    ) : null}
                    {typeof client.availableCredit === 'number' ? (
                      <ModalRow label="Available credit" value={formatZar(client.availableCredit)} />
                    ) : null}
                  </ModalSection>
                  {(client.createdAt || client.updatedAt) && (
                    <ModalSection title="Record">
                      {client.createdAt ? (
                        <ModalRow
                          label="Created"
                          value={format(new Date(client.createdAt), 'MMM d, yyyy')}
                        />
                      ) : null}
                      {client.updatedAt ? (
                        <ModalRow
                          label="Updated"
                          value={format(new Date(client.updatedAt), 'MMM d, yyyy')}
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
            {ref != null ? (
              <>
                <Button variant="outline" className="gap-1" onClick={() => onEdit(ref)}>
                  <Pencil className="size-4" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  className="gap-1"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this client?</AlertDialogTitle>
            <AlertDialogDescription>
              The client will be archived (soft delete). You can restore them later if needed.
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

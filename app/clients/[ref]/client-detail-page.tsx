'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useClient, useDeleteClientMutation } from '@/api/hooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ClientFormDialog } from '../components/client-form-dialog';
import { useRouter } from 'next/navigation';

function Row({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between gap-1 text-sm py-1.5 border-b border-border/60 last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={cn('font-medium break-words text-right', valueClassName)}>{value}</span>
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

export function ClientDetailPage({ refParam }: { refParam: number }) {
  const router = useRouter();
  const { data: client, isLoading, isError } = useClient(refParam);
  const deleteMutation = useDeleteClientMutation();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  function handleDelete() {
    deleteMutation.mutate(refParam, {
      onSuccess: () => {
        setDeleteOpen(false);
        router.push('/clients');
      },
    });
  }

  const addr = client?.address;

  return (
    <div className="container mx-auto max-w-6xl lg:max-w-[88rem] px-3 py-8 sm:px-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="outline" size="icon" className="shrink-0 bg-white border-gray-200" asChild>
            <Link href="/clients" aria-label="Back to clients">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-foreground truncate">
              {client?.name ?? 'Client'}
            </h1>
            {client?.email ? (
              <p className="text-sm text-muted-foreground truncate">{client.email}</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            variant="outline"
            className="gap-1 bg-white border-gray-200"
            onClick={() => setFormOpen(true)}
            disabled={!client}
          >
            <Pencil className="size-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            className="gap-1"
            onClick={() => setDeleteOpen(true)}
            disabled={!client}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="py-16">
          <LoadingSpinner />
        </div>
      )}
      {isError && (
        <p className="text-center text-destructive py-12">Could not load this client.</p>
      )}
      {!isLoading && client && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-lg border border-gray-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Overview</CardTitle>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {client.status ? (
                  <Badge variant="secondary" className="capitalize">
                    {client.status}
                  </Badge>
                ) : null}
                {client.category ? <Badge variant="outline">{client.category}</Badge> : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-0">
              <Row label="Contact person" value={client.contactPerson ?? '—'} />
              <Row label="Phone" value={client.phone ?? '—'} />
              <Row label="Alt. phone" value={client.alternativePhone ?? '—'} />
              <Row label="Email" value={client.email ?? '—'} />
              {client.website ? (
                <Row
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
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-gray-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Address</CardTitle>
            </CardHeader>
            <CardContent>
              {addr ? (
                <div className="space-y-0">
                  <Row label="Street" value={addr.street ?? '—'} />
                  <Row label="Suburb" value={addr.suburb ?? '—'} />
                  <Row label="City" value={addr.city ?? '—'} />
                  <Row label="Province" value={addr.state ?? '—'} />
                  <Row label="Country" value={addr.country ?? '—'} />
                  <Row label="Postal" value={addr.postalCode ?? '—'} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No address on file.</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-gray-200 bg-white md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Business & financial</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-0 sm:grid-cols-2">
                <div>
                  <Row label="Industry" value={client.industry ?? '—'} />
                  <Row
                    label="Sales rep"
                    value={
                      client.assignedSalesRep?.name
                        ? client.assignedSalesRep.name
                        : client.assignedSalesRep?.email ?? '—'
                    }
                  />
                </div>
                <div>
                  <Row label="Credit limit" value={formatZar(client.creditLimit)} />
                  <Row label="Outstanding" value={formatZar(client.outstandingBalance)} />
                  {typeof client.utilization === 'number' ? (
                    <Row label="Utilization" value={`${client.utilization}%`} />
                  ) : null}
                  {typeof client.availableCredit === 'number' ? (
                    <Row label="Available credit" value={formatZar(client.availableCredit)} />
                  ) : null}
                </div>
              </div>
              {client.description ? (
                <>
                  <Separator className="my-3" />
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.description}</p>
                </>
              ) : null}
            </CardContent>
          </Card>
          {(client.createdAt || client.updatedAt) && (
            <Card className="rounded-lg border border-gray-200 bg-white md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Record</CardTitle>
              </CardHeader>
              <CardContent>
                {client.createdAt ? (
                  <Row label="Created" value={format(new Date(client.createdAt), 'MMM d, yyyy')} />
                ) : null}
                {client.updatedAt ? (
                  <Row label="Updated" value={format(new Date(client.updatedAt), 'MMM d, yyyy')} />
                ) : null}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <ClientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode="edit"
        clientRef={refParam}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this client?</AlertDialogTitle>
            <AlertDialogDescription>
              The client will be archived (soft delete). You can restore them from the API if needed.
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
    </div>
  );
}

'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useCompetitor, useDeleteCompetitorMutation, useSessionSync } from '@/api/hooks';
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
import { formatDisplayName, formatEmailDisplay } from '@/lib/client-display';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { CompetitorFormDialog } from '../components/competitor-form-dialog';
import { canDeleteCompetitors, canManageCompetitors } from '@/lib/access';

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
    <div className="flex flex-col gap-1 border-b border-border/60 py-1.5 text-sm last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={cn('break-words text-right font-medium', valueClassName)}>{value}</span>
    </div>
  );
}

export function CompetitorDetailPage({ idParam }: { idParam: number }) {
  const router = useRouter();
  const { backendUserData: profile } = useSessionSync();
  const canEdit = canManageCompetitors(profile?.accessLevel);
  const canDelete = canDeleteCompetitors(profile?.accessLevel);
  const { data: competitor, isLoading, isError } = useCompetitor(idParam);
  const deleteMutation = useDeleteCompetitorMutation();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  function handleDelete() {
    deleteMutation.mutate(idParam, {
      onSuccess: () => {
        setDeleteOpen(false);
        router.push('/competitors');
      },
    });
  }

  const addr = competitor?.address;

  return (
    <div className="container mx-auto max-w-6xl px-3 py-8 sm:px-6 lg:max-w-[88rem]">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="outline" size="icon" className="shrink-0 border-gray-200 bg-white" asChild>
            <Link href="/competitors" aria-label="Back to competitors">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-foreground">
              {competitor?.name ? formatDisplayName(competitor.name) || competitor.name : 'Competitor'}
            </h1>
            {competitor?.contactEmail ? (
              <p className="truncate text-sm text-muted-foreground">
                {formatEmailDisplay(competitor.contactEmail)}
              </p>
            ) : null}
          </div>
        </div>
        {(canEdit || canDelete) && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {canEdit ? (
              <Button
                variant="outline"
                className="gap-1 border-gray-200 bg-white"
                onClick={() => setFormOpen(true)}
                disabled={!competitor}
              >
                <Pencil className="size-4" />
                Edit
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                variant="destructive"
                className="gap-1"
                onClick={() => setDeleteOpen(true)}
                disabled={!competitor}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            ) : null}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="py-16">
          <LoadingSpinner />
        </div>
      )}
      {isError && (
        <p className="py-12 text-center text-destructive">Could not load this competitor.</p>
      )}
      {!isLoading && competitor && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-lg border border-gray-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Overview</CardTitle>
              <div className="flex flex-wrap gap-1.5 pt-1">
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
                {competitor.industry ? <Badge variant="outline">{competitor.industry}</Badge> : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-0">
              <Row label="Reference" value={competitor.competitorRef ?? '—'} />
              <Row
                label="Email"
                value={
                  competitor.contactEmail ? formatEmailDisplay(competitor.contactEmail) : '—'
                }
              />
              <Row label="Phone" value={competitor.contactPhone ?? '—'} />
              {competitor.website ? (
                <Row
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
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-gray-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Address & map</CardTitle>
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
              {competitor.latitude != null && competitor.longitude != null ? (
                <Row label="Coordinates" value={`${competitor.latitude}, ${competitor.longitude}`} />
              ) : null}
              {competitor.enableGeofence ? (
                <Row
                  label="Geofence"
                  value={`${String(competitor.geofenceType ?? '—')} · ${competitor.geofenceRadius ?? '—'} m`}
                />
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-gray-200 bg-white md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Intelligence</CardTitle>
            </CardHeader>
            <CardContent>
              {competitor.description ? (
                <>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {String(competitor.description)}
                  </p>
                  <Separator className="my-3" />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No description yet.</p>
              )}
            </CardContent>
          </Card>
          {(competitor.createdAt || competitor.updatedAt) && (
            <Card className="rounded-lg border border-gray-200 bg-white md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Record</CardTitle>
              </CardHeader>
              <CardContent>
                {competitor.createdAt ? (
                  <Row label="Created" value={format(new Date(competitor.createdAt), 'MMM d, yyyy')} />
                ) : null}
                {competitor.updatedAt ? (
                  <Row label="Updated" value={format(new Date(competitor.updatedAt), 'MMM d, yyyy')} />
                ) : null}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <CompetitorFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode="edit"
        competitorId={idParam}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this competitor?</AlertDialogTitle>
            <AlertDialogDescription>
              The competitor will be archived (soft delete). This action requires administrator access.
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

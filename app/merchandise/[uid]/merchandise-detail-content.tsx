'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Loader2, MapPin, Pencil, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import {
  useDeleteJournalMutation,
  useJournal,
  useJournalStatusMutation,
} from '@/api/hooks/use-journals';
import { canManageMerchandise } from '@/lib/access';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import { canEditMerchandiseEntry } from '@/app/merchandise/lib/merchandise-access';
import {
  merchandiseAddressLines,
  merchandiseCreatedLabel,
  merchandiseDateLabel,
  merchandiseOwnerName,
  merchandiseStatusLabel,
  merchandiseStatusTone,
} from '@/app/merchandise/lib/merchandise-display';
import { MerchandiseEditDialog } from '../components/merchandise-edit-dialog';

type PendingAction = 'publish' | 'reject' | 'delete' | null;

export function MerchandiseDetailContent() {
  const params = useParams();
  const router = useRouter();
  const uidRaw = params?.uid;
  const uid =
    typeof uidRaw === 'string'
      ? Number.parseInt(uidRaw, 10)
      : Array.isArray(uidRaw)
        ? Number.parseInt(uidRaw[0] ?? '', 10)
        : NaN;

  const { isTokenReady } = useTokenReady();
  const { backendUserData, isSyncing } = useSessionSync();
  const journalQuery = useJournal(uid, { enabled: isTokenReady && !isSyncing && Number.isFinite(uid) });
  const statusMutation = useJournalStatusMutation();
  const deleteMutation = useDeleteJournalMutation();
  const [editOpen, setEditOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  if (!isTokenReady || isSyncing || journalQuery.isLoading) {
    return <LoadingSpinner wrapperClassName="py-12" />;
  }

  const journal = journalQuery.data?.journal;
  if (!journal) {
    return (
      <main className="container mx-auto max-w-3xl px-3 py-8 sm:px-6">
        <p className="text-sm text-muted-foreground">
          {journalQuery.error
            ? getQueryErrorMessage(journalQuery.error, 'Could not load merchandise')
            : "The merchandise entry you're looking for doesn't exist."}
        </p>
        <Button asChild variant="link" className="mt-2 px-0">
          <Link href="/merchandise">Back to merchandise</Link>
        </Button>
      </main>
    );
  }

  const entry = journal;
  const manage = canManageMerchandise(backendUserData?.accessLevel);
  const canEdit = canEditMerchandiseEntry(backendUserData?.accessLevel, entry, backendUserData);
  const canDecide = manage && (entry.status === 'PENDING_REVIEW' || !entry.status);
  const addressLines = merchandiseAddressLines(entry);
  const busy = statusMutation.isPending || deleteMutation.isPending;

  async function confirmAction() {
    try {
      if (pendingAction === 'publish') {
        await statusMutation.mutateAsync({ ref: entry.uid, status: 'PUBLISHED' });
      } else if (pendingAction === 'reject') {
        await statusMutation.mutateAsync({ ref: entry.uid, status: 'REJECTED' });
      } else if (pendingAction === 'delete') {
        await deleteMutation.mutateAsync(entry.uid);
        router.push('/merchandise');
      }
      setPendingAction(null);
    } catch {
      // The mutation hook already shows the error toast.
    }
  }

  return (
    <main className="container mx-auto flex max-w-3xl flex-col gap-6 px-3 py-5 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="px-0">
          <Link href="/merchandise">
            <ArrowLeft className="size-4" />
            Merchandise
          </Link>
        </Button>
        {canEdit ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col items-start gap-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Merchandise entry</p>
        <Badge variant={merchandiseStatusTone(journal.status)}>
          {merchandiseStatusLabel(journal.status)}
        </Badge>
        <p className="text-sm text-muted-foreground">{merchandiseCreatedLabel(journal.createdAt)}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Client reference</p>
            <p className="font-medium">{journal.clientRef || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="font-medium">{merchandiseDateLabel(journal.createdAt)}</p>
            {journal.updatedAt ? (
              <p className="text-xs text-muted-foreground">
                Last updated {merchandiseDateLabel(journal.updatedAt)}
              </p>
            ) : null}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Comments</p>
            <p className="whitespace-pre-wrap font-medium">{journal.comments || 'No comments'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Owner</CardTitle>
        </CardHeader>
        <CardContent className="flex items-start gap-3 text-sm">
          <User className="mt-0.5 size-4 text-muted-foreground" />
          <div>
            <p className="font-medium">{merchandiseOwnerName(journal)}</p>
            {journal.owner?.accessLevel ? (
              <p className="text-xs capitalize text-muted-foreground">
                {journal.owner.accessLevel.replace(/_/g, ' ').toLowerCase()}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {journal.organisation || journal.branch ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organisation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {journal.organisation ? (
              <div className="flex items-start gap-3">
                {journal.organisation.logo ? (
                  <img
                    src={journal.organisation.logo}
                    alt=""
                    className="size-10 rounded-full object-contain"
                  />
                ) : null}
                <div>
                  <p className="font-medium">{journal.organisation.name}</p>
                  {journal.organisation.email ? (
                    <p className="text-xs text-muted-foreground">{journal.organisation.email}</p>
                  ) : null}
                  {journal.organisation.phone ? (
                    <p className="text-xs text-muted-foreground">{journal.organisation.phone}</p>
                  ) : null}
                </div>
              </div>
            ) : null}
            {journal.branch ? (
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Branch</p>
                  <p className="font-medium">{journal.branch.name || 'Branch'}</p>
                  {journal.branch.contactPerson ? (
                    <p className="text-xs text-muted-foreground">
                      Contact: {journal.branch.contactPerson}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
            {addressLines.length > 0 ? (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  {addressLines.map((line) => (
                    <p key={line} className="font-medium">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {journal.fileURL ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attachment</CardTitle>
          </CardHeader>
          <CardContent>
            <a href={journal.fileURL} target="_blank" rel="noreferrer">
              <img
                src={journal.fileURL}
                alt="Merchandise attachment"
                className="max-h-80 w-full rounded-md object-cover"
              />
            </a>
          </CardContent>
        </Card>
      ) : null}

      {manage ? (
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          {canDecide ? (
            <>
              <Button type="button" variant="success" disabled={busy} onClick={() => setPendingAction('publish')}>
                Publish
              </Button>
              <Button type="button" variant="cancel" disabled={busy} onClick={() => setPendingAction('reject')}>
                Reject
              </Button>
            </>
          ) : null}
          <Button type="button" variant="destructive" disabled={busy} onClick={() => setPendingAction('delete')}>
            Delete
          </Button>
        </div>
      ) : null}

      <MerchandiseEditDialog journal={journal} open={editOpen} onOpenChange={setEditOpen} />

      <AlertDialog open={pendingAction != null} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction === 'publish'
                ? 'Publish merchandise'
                : pendingAction === 'reject'
                  ? 'Reject merchandise'
                  : 'Delete merchandise'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === 'delete'
                ? 'This removes the log from the merchandise list. Are you sure?'
                : pendingAction === 'publish'
                  ? 'Publish this merchandise log? It can no longer be edited.'
                  : 'Reject this merchandise log?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button type="button" disabled={busy} onClick={confirmAction}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirm
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  useClaim,
  useDeleteClaimMutation,
  useGenerateShareTokenMutation,
  useUpdateClaimMutation,
} from '@/api/hooks/use-claims';
import { useBranches } from '@/api/hooks/use-branches';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import type { BranchListItem } from '@/api/types/branch';
import { canManageClaims } from '@/lib/access';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { ClaimEditDialog } from '@/app/claims/components/claim-edit-dialog';
import { ClaimPersonRow } from '@/app/claims/components/claim-person-row';
import { claimBranchFlagAndLabel } from '@/lib/utils/branch-person-cell';
import {
  ArrowLeft,
  Share2,
  Pencil,
  Loader2,
  Building2,
  User,
  Receipt,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import {
  claimPrimaryAmount,
  claimSecondaryAmount,
} from '@/app/claims/lib/claim-display';

function formatLabel(s: string | undefined) {
  if (!s) return '—';
  return s
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusBadgeVariant(
  s: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const x = s?.toLowerCase() ?? '';
  if (x === 'approved' || x === 'paid') return 'default';
  if (x === 'pending') return 'secondary';
  if (x === 'declined' || x === 'rejected' || x === 'cancelled')
    return 'destructive';
  return 'outline';
}

export function ClaimDetailContent() {
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
  const { backendUserData: profile } = useSessionSync();
  const [editOpen, setEditOpen] = useState(false);
  const [confirm, setConfirm] = useState<
    null | 'approve' | 'decline' | 'paid' | 'delete'
  >(null);

  const claimQuery = useClaim(Number.isFinite(uid) && uid > 0 ? uid : null, {
    enabled: isTokenReady && Number.isFinite(uid) && uid > 0,
  });
  const branchesQuery = useBranches({
    enabled: isTokenReady && Number.isFinite(uid) && uid > 0,
  });
  const updateMutation = useUpdateClaimMutation();
  const deleteMutation = useDeleteClaimMutation();
  const shareMutation = useGenerateShareTokenMutation();

  const branchByUid = useMemo(() => {
    const map = new Map<number, BranchListItem>();
    for (const b of branchesQuery.data ?? []) {
      if (b.uid != null) map.set(b.uid, b);
    }
    return map;
  }, [branchesQuery.data]);

  const claim = claimQuery.data?.claim ?? null;
  const manage = canManageClaims(profile?.accessLevel);
  const myClerkId = profile?.clerkUserId;
  const isOwner =
    !!claim?.owner?.clerkUserId &&
    !!myClerkId &&
    claim.owner.clerkUserId === myClerkId;
  const st = (claim?.status ?? '').toLowerCase();
  const isDeclined = ['declined', 'rejected', 'cancelled'].includes(st);
  const canEdit =
    isOwner &&
    !['paid', 'deleted', 'declined', 'rejected', 'cancelled'].includes(st);

  function runStatusUpdate(
    next: 'approved' | 'declined' | 'paid',
    ref: number
  ) {
    updateMutation.mutate(
      { ref, body: { status: next } },
      { onSuccess: () => setConfirm(null) }
    );
  }

  function runDelete(ref: number) {
    deleteMutation.mutate(ref, {
      onSuccess: () => {
        setConfirm(null);
        router.replace('/claims');
      },
    });
  }

  function handleShare(ref: number) {
    shareMutation.mutate(ref, {
      onSuccess: async (data) => {
        const link =
          data.shareLink ||
          (typeof window !== 'undefined'
            ? `${window.location.origin}/claims/share/${data.shareToken ?? ''}`
            : '');
        if (!link) {
          toast.error('No share link returned');
          return;
        }
        try {
          await navigator.clipboard.writeText(link);
          toast.success('Share link copied');
        } catch {
          toast.error('Could not copy link');
        }
      },
      onError: (e) => {
        toast.error(getQueryErrorMessage(e, 'Could not share'));
      },
    });
  }

  if (!isTokenReady || claimQuery.isLoading) {
    return <LoadingSpinner wrapperClassName="py-16" />;
  }

  if (!Number.isFinite(uid) || uid < 1) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-10 text-center text-muted-foreground">
        Invalid claim id.
      </div>
    );
  }

  if (claimQuery.isError || !claim) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-destructive">
          {claimQuery.error
            ? getQueryErrorMessage(claimQuery.error, 'Claim not found')
            : 'Claim not found.'}
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/claims">Back to claims</Link>
        </Button>
      </div>
    );
  }

  const branchInfo = claimBranchFlagAndLabel(claim.branch, branchByUid);
  const showApprover =
    !!claim.verifiedBy &&
    ['approved', 'declined', 'rejected', 'paid', 'cancelled'].includes(st);
  const originalAmount = claimPrimaryAmount(claim, 'original');
  const zarAmount = claimSecondaryAmount(claim, 'original');

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <main className="container mx-auto max-w-3xl flex-1 px-3 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="-ml-2 gap-1">
            <Link href="/claims">
              <ArrowLeft className="size-4" />
              Claims
            </Link>
          </Button>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              size="sm"
              className="gap-1 bg-green-600 text-white hover:bg-green-700"
              disabled={shareMutation.isPending}
              onClick={() => handleShare(claim.uid)}
            >
              {shareMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Share2 className="size-4" />
              )}
              Share
            </Button>
            {canEdit ? (
              <Button
                size="sm"
                className="gap-1 bg-violet-600 text-white hover:bg-violet-700"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-4" />
                Edit
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold sm:text-2xl">
              {claim.claimRef || `Claim #${claim.uid}`}
            </h1>
            <Badge variant={statusBadgeVariant(String(claim.status))}>
              {formatLabel(String(claim.status))}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatLabel(claim.category)} · {originalAmount}
            {zarAmount ? ` · ${zarAmount}` : ''}
          </p>
          {claim.amountZar != null &&
          Number.isFinite(claim.amountZar) &&
          claim.fxCode &&
          claim.fxRate != null &&
          claim.fxRate !== 1 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Converted with {claim.fxCode} rate {claim.fxRate} on {claim.fxDate ?? 'claim date'}
              {' '}(1 ZAR = {claim.fxRate} {claim.fxCode}).
            </p>
          ) : claim.currency &&
            claim.currency !== 'ZAR' &&
            (claim.amountZar == null || !Number.isFinite(claim.amountZar)) ? (
            <p className="mt-1 text-xs text-muted-foreground">
              No FX rate found for {claim.currency} on the claim date.
            </p>
          ) : null}
          {claim.createdAt ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Created {format(new Date(claim.createdAt), 'MMM d, yyyy')}
              {claim.updatedAt
                ? ` · Updated ${format(new Date(claim.updatedAt), 'MMM d, yyyy')}`
                : ''}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="size-4" />
                Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="min-h-[4.5rem] whitespace-pre-wrap text-foreground">
                  {claim.comments?.trim() ? (
                    claim.comments
                  ) : (
                    <span className="italic text-muted-foreground">
                      No notes saved
                    </span>
                  )}
                </p>
              </div>
              {claim.documentUrl ? (
                <div>
                  <p className="text-xs text-muted-foreground">Attachment</p>
                  <a
                    href={claim.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-violet-600 underline"
                  >
                    Open receipt
                  </a>
                  {/\.(jpg|jpeg|png|gif|webp)$/i.test(claim.documentUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={claim.documentUrl}
                      alt="Receipt"
                      className="mt-2 max-h-64 rounded-md border object-contain"
                    />
                  ) : null}
                </div>
              ) : null}
              {claim.claimGroup?.title ? (
                <div>
                  <p className="text-xs text-muted-foreground">Folder</p>
                  <p>{claim.claimGroup.title}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="size-4" />
                People
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <ClaimPersonRow label="Created by" person={claim.owner} />
              {showApprover ? (
                <ClaimPersonRow
                  label="Approved by"
                  person={claim.verifiedBy}
                  className="mt-4"
                />
              ) : null}
            </CardContent>
          </Card>

          {branchInfo ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="size-4" />
                  Branch
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="flex items-center gap-2">
                  <span aria-hidden>{branchInfo.flag}</span>
                  <span>{branchInfo.label}</span>
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {manage && st === 'pending' ? (
          <div className="mt-8 flex flex-wrap justify-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setConfirm('decline')}
            >
              Decline
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => setConfirm('approve')}
            >
              Approve
            </Button>
          </div>
        ) : null}

        {manage && st === 'approved' ? (
          <div className="mt-8 flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setConfirm('decline')}>
              Decline
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => setConfirm('paid')}
            >
              Mark paid
            </Button>
          </div>
        ) : null}

        {manage && isDeclined ? (
          <div className="mt-8 flex justify-end">
            <Button size="sm" variant="destructive" onClick={() => setConfirm('delete')}>
              Delete
            </Button>
          </div>
        ) : null}
      </main>

      <ClaimEditDialog claim={claim} open={editOpen} onOpenChange={setEditOpen} />

      <AlertDialog
        open={confirm === 'approve'}
        onOpenChange={(o) => !o && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve claim?</AlertDialogTitle>
            <AlertDialogDescription>
              The submitter will be notified that this claim was approved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => runStatusUpdate('approved', claim.uid)}
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirm === 'decline'}
        onOpenChange={(o) => !o && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline claim?</AlertDialogTitle>
            <AlertDialogDescription>
              This sets the claim to declined. You can add follow-up in approvals
              if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => runStatusUpdate('declined', claim.uid)}
            >
              Decline
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirm === 'paid'}
        onOpenChange={(o) => !o && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as paid?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm reimbursement was completed for this claim.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => runStatusUpdate('paid', claim.uid)}
            >
              Mark paid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirm === 'delete'}
        onOpenChange={(o) => !o && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete claim?</AlertDialogTitle>
            <AlertDialogDescription>
              This soft-deletes the claim. You can restore it from the server if
              your role allows.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => runDelete(claim.uid)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

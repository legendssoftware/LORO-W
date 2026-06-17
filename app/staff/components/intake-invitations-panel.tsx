'use client';

import { useMemo, useState } from 'react';
import {
  useBranches,
  useDeleteIntakeInvitationMutation,
  useIntakeInvitations,
  useResendIntakeInvitationMutation,
} from '@/api/hooks';
import { getBranchDisplayLabel } from '@/api/hooks/use-branches';
import { Button } from '@/components/ui/button';
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
import { formatEnumLabel } from '@/lib/format-enum-label';
import toast from 'react-hot-toast';

function buildIntakeUrl(token: string): string {
  return `${window.location.origin}/employee-intake?token=${encodeURIComponent(token)}`;
}

export function IntakeInvitationsPanel() {
  const { data, isLoading } = useIntakeInvitations();
  const { data: branches = [] } = useBranches();
  const resendMutation = useResendIntakeInvitationMutation();
  const deleteMutation = useDeleteIntakeInvitationMutation();
  const [deleteTargetUid, setDeleteTargetUid] = useState<number | null>(null);

  const branchById = useMemo(() => {
    const map = new Map<number, string>();
    branches.forEach((b) => map.set(b.uid, getBranchDisplayLabel(b)));
    return map;
  }, [branches]);

  const invitations = data?.data ?? [];
  const pending = invitations.filter((i) => i.status === 'pending');

  async function handleResend(uid: number) {
    try {
      const result = await resendMutation.mutateAsync(uid);
      await navigator.clipboard.writeText(result.invitation.intakeUrl);
      toast.success('Link regenerated, emailed, and copied to clipboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resend');
    }
  }

  async function handleCopyLink(token: string) {
    try {
      await navigator.clipboard.writeText(buildIntakeUrl(token));
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Could not copy link');
    }
  }

  async function handleDeleteConfirm() {
    if (deleteTargetUid == null) return;
    try {
      await deleteMutation.mutateAsync(deleteTargetUid);
      toast.success('Invitation removed');
      setDeleteTargetUid(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete invitation');
    }
  }

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading intake invitations…</p>
    );
  }

  if (pending.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No pending employee intake links.</p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Branch</th>
              <th className="px-3 py-2 font-medium">Access</th>
              <th className="px-3 py-2 font-medium">Expires</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {pending.map((inv) => (
              <tr key={inv.uid} className="border-b last:border-0">
                <td className="px-3 py-2">{inv.prefillEmail ?? '—'}</td>
                <td className="px-3 py-2">
                  {inv.branchUid != null ? branchById.get(inv.branchUid) ?? inv.branchUid : '—'}
                </td>
                <td className="px-3 py-2">
                  {inv.accessLevel ? formatEnumLabel(inv.accessLevel) : '—'}
                </td>
                <td className="px-3 py-2">
                  {new Date(inv.tokenExpiresAt).toLocaleDateString()}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-2">
                    {inv.prefillEmail ? (
                      <Button
                        type="button"
                        size="sm"
                        className="bg-purple-600 text-white hover:bg-purple-700 [&_svg]:text-white"
                        disabled={resendMutation.isPending}
                        onClick={() => handleResend(inv.uid)}
                      >
                        Resend
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyLink(inv.token)}
                      >
                        Copy link
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={deleteMutation.isPending}
                      onClick={() => setDeleteTargetUid(inv.uid)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog
        open={deleteTargetUid != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetUid(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this intake invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the invitation and remove any linked user profile data saved from it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteConfirm();
              }}
            >
              {deleteMutation.isPending ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

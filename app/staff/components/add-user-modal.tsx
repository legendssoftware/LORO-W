'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DetailDialogCloseButton,
  DETAIL_DIALOG_SMALL_CONTENT_CLASS,
} from '@/components/detail-dialog/detail-dialog-primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBranches, useInviteUserMutation } from '@/api/hooks';
import { getBranchDisplayLabel } from '@/api/hooks/use-branches';
import { AccessLevel, WorkforceType } from '@/api/types/user';
import { formatEnumLabel } from '@/lib/format-enum-label';
import { Loader2Icon } from '@/lib/icons';
import { UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const MODAL_SELECT_TRIGGER =
  'h-9 w-full border-border bg-background text-foreground';

export interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const accessLevels = Object.values(AccessLevel);
const workforceTypes = Object.values(WorkforceType);

export function AddUserModal({ open, onOpenChange }: AddUserModalProps) {
  const router = useRouter();
  const inviteMutation = useInviteUserMutation();
  const { data: branches = [] } = useBranches({ enabled: open });

  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [accessLevel, setAccessLevel] = useState<string>(AccessLevel.USER);
  const [workforceType, setWorkforceType] = useState<string>(
    WorkforceType.GENERAL_WORKER
  );
  const [branchId, setBranchId] = useState<string>('');

  useEffect(() => {
    if (!open) {
      setName('');
      setSurname('');
      setEmail('');
      setPhone('');
      setAccessLevel(AccessLevel.USER);
      setWorkforceType(WorkforceType.GENERAL_WORKER);
      setBranchId('');
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!name.trim() || !surname.trim() || !trimmedEmail) {
      toast.error('Name, surname, and email are required.');
      return;
    }

    try {
      const result = await inviteMutation.mutateAsync({
        name: name.trim(),
        surname: surname.trim(),
        email: trimmedEmail,
        phone: phone.trim() || undefined,
        accessLevel,
        workforceType,
        role: accessLevel,
        branchId: branchId ? Number(branchId) : undefined,
      });
      toast.success(`Invite sent to ${result.user.email}`);
      onOpenChange(false);
      router.push(`/reports/users/${result.user.uid}/settings`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to invite user';
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={DETAIL_DIALOG_SMALL_CONTENT_CLASS}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-4 right-4 z-10">
          <DetailDialogCloseButton />
        </div>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5" />
            Add user
          </DialogTitle>
          <DialogDescription>
            Creates a Clerk account, syncs the user to LORO, and emails sign-in
            instructions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="add-user-name">First name</Label>
              <Input
                id="add-user-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane"
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-user-surname">Surname</Label>
              <Input
                id="add-user-surname"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder="Smith"
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-user-email">Email</Label>
            <Input
              id="add-user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane.smith@example.com"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-user-phone">Phone (optional)</Label>
            <Input
              id="add-user-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+27 64 123 4567"
              autoComplete="tel"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Access level</Label>
              <Select value={accessLevel} onValueChange={setAccessLevel}>
                <SelectTrigger className={MODAL_SELECT_TRIGGER}>
                  <SelectValue placeholder="Access level" />
                </SelectTrigger>
                <SelectContent>
                  {accessLevels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {formatEnumLabel(level)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Workforce type</Label>
              <Select value={workforceType} onValueChange={setWorkforceType}>
                <SelectTrigger className={MODAL_SELECT_TRIGGER}>
                  <SelectValue placeholder="Workforce type" />
                </SelectTrigger>
                <SelectContent>
                  {workforceTypes.map((wt) => (
                    <SelectItem key={wt} value={wt}>
                      {formatEnumLabel(wt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Branch (optional)</Label>
            <Select
              value={branchId || '__none__'}
              onValueChange={(v) => setBranchId(v === '__none__' ? '' : v)}
            >
              <SelectTrigger className={MODAL_SELECT_TRIGGER}>
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No branch</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.uid} value={String(b.uid)}>
                    {getBranchDisplayLabel(b) || `Branch ${b.uid}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="cancel"
              className="rounded-full"
              onClick={() => onOpenChange(false)}
              disabled={inviteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="success"
              className={cn('rounded-full gap-2')}
              disabled={inviteMutation.isPending}
            >
              {inviteMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <UserPlus className="size-4" />
              )}
              Add user
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

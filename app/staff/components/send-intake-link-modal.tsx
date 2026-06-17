'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DetailDialogCloseButton,
  DETAIL_DIALOG_CONTENT_CLASS,
} from '@/components/detail-dialog/detail-dialog-primitives';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBranches, useCreateIntakeInvitationMutation } from '@/api/hooks';
import { AccessLevel, WorkforceType } from '@/api/types/user';
import { getBranchDisplayLabel } from '@/api/hooks/use-branches';
import { formatEnumLabel } from '@/lib/format-enum-label';
import { Link2, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

const sendIntakeSchema = z.object({
  prefillEmail: z.union([z.string().email(), z.literal('')]).optional(),
  branchId: z.string().optional(),
  accessLevel: z.string().min(1, 'Access level is required'),
  workforceType: z.string().optional(),
  role: z.string().optional(),
  expiresInDays: z.number().min(1).max(90).optional(),
});

type SendIntakeFormValues = z.infer<typeof sendIntakeSchema>;

const MODAL_SELECT_TRIGGER =
  'h-9 w-full border-border bg-background text-foreground';

const accessLevels = Object.values(AccessLevel);
const workforceTypes = Object.values(WorkforceType);

export interface SendIntakeLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendIntakeLinkModal({ open, onOpenChange }: SendIntakeLinkModalProps) {
  const createMutation = useCreateIntakeInvitationMutation();
  const { data: branches = [] } = useBranches({ enabled: open });
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  const form = useForm<SendIntakeFormValues>({
    resolver: zodResolver(sendIntakeSchema),
    defaultValues: {
      prefillEmail: '',
      branchId: '',
      accessLevel: AccessLevel.USER,
      workforceType: WorkforceType.GENERAL_WORKER,
      role: AccessLevel.USER,
      expiresInDays: 30,
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
      setGeneratedUrl(null);
    }
  }, [open, form]);

  async function onSubmit(values: SendIntakeFormValues) {
    const branchId = values.branchId ? Number(values.branchId) : undefined;
    try {
      const result = await createMutation.mutateAsync({
        prefillEmail: values.prefillEmail?.trim() || undefined,
        branchId: branchId && branchId > 0 ? branchId : undefined,
        accessLevel: values.accessLevel,
        workforceType: values.workforceType || undefined,
        role: values.role || values.accessLevel,
        expiresInDays: values.expiresInDays ?? 30,
      });
      setGeneratedUrl(result.invitation.intakeUrl);
      if (result.invitation.emailSent) {
        toast.success('Intake link created and email sent');
      } else {
        toast.success('Intake link created — copy and share with the employee');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create intake link');
    }
  }

  async function copyLink() {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Could not copy link');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DETAIL_DIALOG_CONTENT_CLASS}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="size-5" />
            Send employee intake link
          </DialogTitle>
          <DialogDescription>
            Generate a public link for a new hire to complete their profile. Org, branch, and
            access are pre-assigned; the employee fills personal and employment details without
            signing in.
          </DialogDescription>
        </DialogHeader>
        <DetailDialogCloseButton />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="prefillEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee email (optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="jane.smith@example.com"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    If provided, the email is locked on the form and the link is sent automatically.
                  </p>
                </FormItem>
              )}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="accessLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className={MODAL_SELECT_TRIGGER}>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accessLevels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {formatEnumLabel(level)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="workforceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workforce type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger className={MODAL_SELECT_TRIGGER}>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {workforceTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {formatEnumLabel(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="branchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl>
                      <SelectTrigger className={MODAL_SELECT_TRIGGER}>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.uid} value={String(b.uid)}>
                          {getBranchDisplayLabel(b)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {generatedUrl ? (
              <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Intake link</p>
                <p className="break-all text-sm">{generatedUrl}</p>
                <Button type="button" variant="outline" size="sm" onClick={copyLink}>
                  <Copy className="mr-2 size-4" />
                  Copy link
                </Button>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {generatedUrl ? 'Close' : 'Cancel'}
              </Button>
              {!generatedUrl ? (
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating…' : 'Create link'}
                </Button>
              ) : null}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Form } from '@/components/ui/form';
import {
  useBranches,
  useClients,
  useInviteUserMutation,
  useUsers,
} from '@/api/hooks';
import { useApiClient } from '@/api/hooks/use-api-client';
import { patchUser } from '@/api/endpoints/user';
import { normalizePrimaryBranchUid } from '@/lib/user-form';
import {
  addUserWizardSchema,
  buildInviteFollowUpPatchBody,
  getDefaultAddUserWizardValues,
  WIZARD_STEP_FIELDS,
  WIZARD_STEP_LABELS,
  type AddUserWizardValues,
} from '@/lib/user-form';
import { UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { StepBasics } from './add-user-wizard/step-basics';
import { StepAccess } from './add-user-wizard/step-access';
import { StepTargets } from './add-user-wizard/step-targets';
import { StepAssignments } from './add-user-wizard/step-assignments';
import { WizardFooter } from './add-user-wizard/wizard-footer';
import { WizardStepIndicator } from './add-user-wizard/wizard-step-indicator';

const TOTAL_STEPS = WIZARD_STEP_LABELS.length;

export interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddUserModal({ open, onOpenChange }: AddUserModalProps) {
  const router = useRouter();
  const apiClient = useApiClient();
  const inviteMutation = useInviteUserMutation();
  const [step, setStep] = useState(0);

  const { data: branches = [] } = useBranches({ enabled: open });
  const { data: users = [] } = useUsers({ enabled: open, limit: 200 });
  const { data: clients = [] } = useClients({ enabled: open, limit: 100 });

  const form = useForm<AddUserWizardValues>({
    resolver: zodResolver(addUserWizardSchema),
    defaultValues: getDefaultAddUserWizardValues(),
    mode: 'onChange',
  });

  useEffect(() => {
    if (!open) {
      form.reset(getDefaultAddUserWizardValues());
      setStep(0);
    }
  }, [open, form]);

  async function validateCurrentStep(): Promise<boolean> {
    const fields = WIZARD_STEP_FIELDS[step];
    if (!fields?.length) return true;
    const valid = await form.trigger(fields);
    return valid;
  }

  async function handleNext() {
    const valid = await validateCurrentStep();
    if (!valid) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit(values: AddUserWizardValues) {
    const trimmedEmail = values.email.trim();
    if (!values.name.trim() || !values.surname.trim() || !trimmedEmail) {
      toast.error('Name, surname, and email are required.');
      setStep(0);
      return;
    }

    const warnings: string[] = [];

    try {
      const branchId = normalizePrimaryBranchUid(values.branchUid ?? null);

      const result = await inviteMutation.mutateAsync({
        name: values.name.trim(),
        surname: values.surname.trim(),
        email: trimmedEmail,
        phone: values.phone?.trim() || undefined,
        accessLevel: values.accessLevel,
        workforceType: values.workforceType,
        role: values.role || values.accessLevel,
        branchId: branchId ?? undefined,
      });

      if (result.warnings?.length) {
        warnings.push(...result.warnings);
      }

      const patchBody = buildInviteFollowUpPatchBody(values);
      const hasPatchFields = Object.keys(patchBody).length > 0;

      if (hasPatchFields) {
        try {
          await patchUser(apiClient, String(result.user.uid), patchBody);
        } catch (patchErr) {
          const patchMessage =
            patchErr instanceof Error
              ? patchErr.message
              : 'Failed to save linked fields';
          warnings.push(
            `Some profile fields could not be saved: ${patchMessage}`
          );
        }
      }

      if (warnings.length > 0) {
        toast.success(
          `User created for ${result.user.email}. Review warnings below.`
        );
        warnings.forEach((warning) => toast.error(warning, { duration: 6000 }));
      } else {
        toast.success(
          hasPatchFields
            ? `User created, invite sent to ${result.user.email}, and profile linked`
            : `Invite sent to ${result.user.email}`
        );
      }

      onOpenChange(false);
      router.push(`/reports/users/${result.user.uid}/settings`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create user';
      toast.error(message);
    }
  }

  const isPending = inviteMutation.isPending || form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={DETAIL_DIALOG_CONTENT_CLASS}
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
            Step {step + 1} of {TOTAL_STEPS}: {WIZARD_STEP_LABELS[step]}. Creates
            a Clerk account, syncs to LORO, and emails sign-in instructions.
          </DialogDescription>
        </DialogHeader>

        <WizardStepIndicator currentStep={step} />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <div className="min-h-[320px] max-h-[min(52vh,520px)] overflow-y-auto pr-1">
              {step === 0 && <StepBasics control={form.control} />}
              {step === 1 && (
                <StepAccess control={form.control} branches={branches} />
              )}
              {step === 2 && <StepTargets control={form.control} />}
              {step === 3 && (
                <StepAssignments
                  control={form.control}
                  branches={branches}
                  users={users}
                  clients={clients}
                />
              )}
            </div>

            <WizardFooter
              step={step}
              isFirstStep={step === 0}
              isLastStep={step === TOTAL_STEPS - 1}
              isPending={isPending}
              onBack={handleBack}
              onNext={handleNext}
              onCancel={() => onOpenChange(false)}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

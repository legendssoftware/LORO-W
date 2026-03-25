'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  useSessionSync,
  useBranches,
  useCreateLeadMutation,
  useApiClient,
  getBranchDisplayLabel,
} from '@/api/hooks';
import { uploadFile } from '@/api/endpoints/upload';
import { Loader2Icon, HandshakeIcon } from '@/lib/icons';
import toast from 'react-hot-toast';
import {
  LeadFormBody,
  createDefaultLeadForm,
  DEFAULT_LEAD_FORM_COLLAPSED,
  formStateToCreatePayload,
  type CreateLeadModalInitialValues,
  type LeadFormCollapsedKey,
  type LeadFormCollapsedState,
  type LeadFormState,
} from './lead-form-shared';

export type { CreateLeadModalInitialValues };

export interface CreateLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (createdLead?: { uid: number }) => void;
  initialValues?: CreateLeadModalInitialValues;
}

export function CreateLeadModal({
  open,
  onOpenChange,
  onSuccess,
  initialValues,
}: CreateLeadModalProps) {
  const { backendUserData } = useSessionSync();
  const sessionBranchUid = backendUserData?.branch?.uid ?? null;

  const [form, setForm] = useState<LeadFormState>(() =>
    createDefaultLeadForm(sessionBranchUid)
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [collapsed, setCollapsed] = useState<LeadFormCollapsedState>(
    DEFAULT_LEAD_FORM_COLLAPSED
  );
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const client = useApiClient();
  const { data: branches = [] } = useBranches({ enabled: open });
  const createMutation = useCreateLeadMutation();

  const hasSessionBranch = sessionBranchUid != null;
  const effectiveBranchUid = form.branchUid ?? sessionBranchUid;

  useEffect(() => {
    if (open) {
      const base = createDefaultLeadForm(sessionBranchUid);
      const merged = initialValues
        ? {
            ...base,
            ...initialValues,
            branchUid:
              (initialValues.branchUid as number | null | undefined) ??
              sessionBranchUid,
          }
        : base;
      setForm(merged as LeadFormState);
      setValidationError(null);
      setImageFile(null);
      setImagePreview(null);
      setAttachmentFiles([]);
    }
  }, [open, sessionBranchUid, initialValues]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  function validate(): boolean {
    if (initialValues != null) {
      setValidationError(null);
      return true;
    }
    const hasName = (form.name ?? '').trim() !== '';
    const hasEmail = (form.email ?? '').trim() !== '';
    const hasPhone = (form.phone ?? '').trim() !== '';
    if (!hasName && !hasEmail && !hasPhone) {
      setValidationError('Please provide at least one of: name, email, or phone.');
      return false;
    }
    if (effectiveBranchUid == null) {
      setValidationError('Please select a branch.');
      return false;
    }
    setValidationError(null);
    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;

    let imageUrl: string | undefined;
    const attachmentUrls: string[] = [];

    try {
      for (const file of attachmentFiles) {
        try {
          const url = await uploadFile(client, file);
          attachmentUrls.push(url);
        } catch {
          // Continue with others (APK behavior)
        }
      }
      if (imageFile) {
        try {
          imageUrl = await uploadFile(client, imageFile);
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : 'Image upload failed. Creating lead without image.'
          );
        }
      }

      const branchUid = effectiveBranchUid ?? sessionBranchUid;
      const payload = formStateToCreatePayload(form, {
        branchUid: branchUid!,
        ...(imageUrl && { imageUrl }),
        ...(attachmentUrls.length > 0 && { attachmentUrls }),
      });

      const result = await createMutation.mutateAsync(payload);
      toast.success('Lead created successfully');
      onOpenChange(false);
      const createdLead = result?.data?.uid != null ? { uid: result.data.uid } : undefined;
      onSuccess?.(createdLead);
    } catch (err: unknown) {
      const axiosData =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data
          : undefined;
      const message =
        typeof axiosData?.message === 'string'
          ? axiosData.message
          : 'Failed to create lead. Please try again.';
      toast.error(message);
    }
  }

  const canSubmit =
    initialValues != null
      ? !createMutation.isPending
      : effectiveBranchUid != null &&
        ((form.name ?? '').trim() !== '' ||
          (form.email ?? '').trim() !== '' ||
          (form.phone ?? '').trim() !== '') &&
        !createMutation.isPending;

  function toggleSection(key: LeadFormCollapsedKey) {
    setCollapsed((c) => ({ ...c, [key]: !c[key] }));
  }

  const displayImageSrc = imagePreview;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[36rem] max-h-[90vh] overflow-y-auto"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>Create lead</DialogTitle>
          <DialogDescription>
            Add a new sales lead. At least one of name, email, or phone is required.
          </DialogDescription>
        </DialogHeader>

        <LeadFormBody
          form={form}
          setForm={setForm}
          collapsed={collapsed}
          toggleSection={toggleSection}
          idPrefix="create-lead"
          displayImageSrc={displayImageSrc}
          imageInputRef={imageInputRef}
          onImageInputChange={(file) => setImageFile(file)}
          onClearImageSelection={() => {
            setImageFile(null);
            if (imageInputRef.current) imageInputRef.current.value = '';
          }}
          attachmentFiles={attachmentFiles}
          attachmentInputRef={attachmentInputRef}
          onAttachmentFilesAdded={(files) =>
            setAttachmentFiles((prev) => [...prev, ...files])
          }
          onRemovePendingAttachment={(index) =>
            setAttachmentFiles((prev) => prev.filter((_, j) => j !== index))
          }
          showBranchPicker={!hasSessionBranch}
          branches={branches}
          effectiveBranchUid={effectiveBranchUid}
          getBranchDisplayLabel={getBranchDisplayLabel}
          validationError={validationError}
        />

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!canSubmit} className="gap-2">
            {createMutation.isPending ? (
              <>
                <Loader2Icon className="size-4 shrink-0 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <HandshakeIcon className="size-4 shrink-0" />
                Create lead
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

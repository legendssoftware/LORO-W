'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useApiClient } from '@/api/hooks/use-api-client';
import { uploadFile } from '@/api/endpoints/upload';
import { useUpdateJournalMutation } from '@/api/hooks/use-journals';
import type { Journal } from '@/api/types/journal';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import {
  MERCHANDISE_PHOTO_TOO_LARGE,
  compressMerchandisePhoto,
  merchandisePhotoUploadMessage,
} from '@/app/merchandise/lib/compress-merchandise-photo';
import { Loader2 } from 'lucide-react';
import { validateMerchandiseFields } from './merchandise-create-dialog';

const primaryClass =
  'border-0 bg-violet-600 text-white hover:bg-violet-700 focus-visible:ring-violet-500/40 [&_svg]:text-white';

export function MerchandiseEditDialog({
  journal,
  open,
  onOpenChange,
}: {
  journal: Journal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const client = useApiClient();
  const updateMutation = useUpdateJournalMutation();
  const [clientRef, setClientRef] = useState(journal.clientRef ?? '');
  const [comments, setComments] = useState(journal.comments ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(journal.fileURL ?? null);
  const [errors, setErrors] = useState<{ clientRef?: string; comments?: string; file?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setClientRef(journal.clientRef ?? '');
    setComments(journal.comments ?? '');
    setFile(null);
    setPreviewUrl(journal.fileURL ?? null);
    setErrors({});
    setSubmitError(null);
    setIsCompressing(false);
  }, [open, journal]);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handlePhotoChange(next: File | null): Promise<boolean> {
    if (!next) {
      setFile(null);
      setPreviewUrl(journal.fileURL ?? null);
      return true;
    }
    setIsCompressing(true);
    setSubmitError(null);
    try {
      const prepared = await compressMerchandisePhoto(next);
      setFile(prepared);
      setErrors((current) => ({ ...current, file: undefined }));
      return true;
    } catch (error) {
      setFile(null);
      setPreviewUrl(journal.fileURL ?? null);
      setErrors((current) => ({
        ...current,
        file: error instanceof Error ? error.message : MERCHANDISE_PHOTO_TOO_LARGE,
      }));
      return false;
    } finally {
      setIsCompressing(false);
    }
  }

  async function handleSubmit() {
    const nextErrors = validateMerchandiseFields({
      clientRef,
      comments,
      hasImage: Boolean(file || journal.fileURL),
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload: { clientRef?: string; comments?: string; fileURL?: string } = {};
    const nextRef = clientRef.trim();
    const nextComments = comments.trim();
    if (nextRef !== (journal.clientRef ?? '')) payload.clientRef = nextRef;
    if (nextComments !== (journal.comments ?? '')) payload.comments = nextComments;

    setSubmitError(null);
    try {
      if (file) {
        const photo = await compressMerchandisePhoto(file);
        payload.fileURL = await uploadFile(client, photo);
      }
      if (Object.keys(payload).length === 0) {
        onOpenChange(false);
        return;
      }
      await updateMutation.mutateAsync({ ref: journal.uid, payload });
      onOpenChange(false);
    } catch (error) {
      setSubmitError(
        merchandisePhotoUploadMessage(
          getQueryErrorMessage(error, 'Could not update merchandise'),
          'Could not update merchandise',
        ),
      );
    }
  }

  const pending = updateMutation.isPending || isCompressing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit merchandise</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-merchandise-client-ref">Client reference</Label>
            <Input
              id="edit-merchandise-client-ref"
              value={clientRef}
              onChange={(event) => setClientRef(event.target.value)}
            />
            {errors.clientRef ? (
              <p className="text-xs text-destructive">{errors.clientRef}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-merchandise-comments">Comments</Label>
            <Textarea
              id="edit-merchandise-comments"
              value={comments}
              onChange={(event) => setComments(event.target.value)}
              rows={5}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">{comments.trim().length}/500</p>
            {errors.comments ? (
              <p className="text-xs text-destructive">{errors.comments}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-merchandise-image">Photo</Label>
            <Input
              id="edit-merchandise-image"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const input = event.currentTarget;
                void handlePhotoChange(input.files?.[0] ?? null).then((accepted) => {
                  if (!accepted) input.value = '';
                });
              }}
              disabled={isCompressing || pending}
            />
            {isCompressing ? (
              <p className="text-xs text-muted-foreground">Preparing photo...</p>
            ) : null}
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Merchandise attachment"
                className="h-40 w-full rounded-md object-cover"
              />
            ) : null}
            {errors.file ? <p className="text-xs text-destructive">{errors.file}</p> : null}
          </div>
          {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" className={primaryClass} onClick={handleSubmit} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

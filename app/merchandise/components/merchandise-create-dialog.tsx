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
import { useCreateJournalMutation } from '@/api/hooks/use-journals';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import {
  MERCHANDISE_PHOTO_TOO_LARGE,
  compressMerchandisePhoto,
  merchandisePhotoUploadMessage,
} from '@/app/merchandise/lib/compress-merchandise-photo';
import { Loader2 } from 'lucide-react';

const primaryClass =
  'border-0 bg-violet-600 text-white hover:bg-violet-700 focus-visible:ring-violet-500/40 [&_svg]:text-white';

interface FieldErrors {
  clientRef?: string;
  comments?: string;
  file?: string;
}

/** Client-side checks matching the mobile merchandise form. */
export function validateMerchandiseFields(input: {
  clientRef: string;
  comments: string;
  hasImage: boolean;
}): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.clientRef.trim()) errors.clientRef = 'Client reference is required';
  const comments = input.comments.trim();
  if (!comments) errors.comments = 'Comments are required';
  else if (comments.length > 500) errors.comments = 'Comments must be 500 characters or fewer';
  if (!input.hasImage) errors.file = 'Image is required';
  return errors;
}

export function MerchandiseCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const client = useApiClient();
  const createMutation = useCreateJournalMutation();
  const [clientRef, setClientRef] = useState('');
  const [comments, setComments] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setClientRef('');
    setComments('');
    setFile(null);
    setPreviewUrl(null);
    setErrors({});
    setSubmitError(null);
    setIsCompressing(false);
  }, [open]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handlePhotoChange(next: File | null): Promise<boolean> {
    if (!next) {
      setFile(null);
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
      hasImage: Boolean(file),
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !file) return;

    setSubmitError(null);
    try {
      const photo = await compressMerchandisePhoto(file);
      const fileURL = await uploadFile(client, photo);
      await createMutation.mutateAsync({
        clientRef: clientRef.trim(),
        comments: comments.trim(),
        fileURL,
      });
      onOpenChange(false);
    } catch (error) {
      setSubmitError(
        merchandisePhotoUploadMessage(
          getQueryErrorMessage(error, 'Could not create merchandise'),
          'Could not create merchandise',
        ),
      );
    }
  }

  const pending = createMutation.isPending || isCompressing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New merchandise</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="merchandise-client-ref">Client reference</Label>
            <Input
              id="merchandise-client-ref"
              value={clientRef}
              onChange={(event) => setClientRef(event.target.value)}
              placeholder="CLT123456"
            />
            {errors.clientRef ? (
              <p className="text-xs text-destructive">{errors.clientRef}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="merchandise-comments">Comments</Label>
            <Textarea
              id="merchandise-comments"
              value={comments}
              onChange={(event) => setComments(event.target.value)}
              rows={5}
              maxLength={500}
              placeholder="What did you see in store?"
            />
            <p className="text-xs text-muted-foreground">{comments.trim().length}/500</p>
            {errors.comments ? (
              <p className="text-xs text-destructive">{errors.comments}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="merchandise-image">Photo</Label>
            <Input
              id="merchandise-image"
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
                alt="Selected merchandise"
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

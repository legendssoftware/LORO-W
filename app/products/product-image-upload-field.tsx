'use client';

import { useRef, useState } from 'react';
import { ImageIcon, Loader2, Upload, X } from 'lucide-react';
import { useApiClient } from '@/api/hooks';
import { uploadFile } from '@/api/endpoints/upload';
import { IconField } from '@/components/icon-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import { DEFAULT_PRODUCT_IMAGE_URL, getProductImageUri } from '@/lib/product-display';
import toast from 'react-hot-toast';

export interface ProductImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

/**
 * Product image control: preview + file upload that stores the returned public URL.
 */
export function ProductImageUploadField({
  label,
  value,
  onChange,
  disabled = false,
}: ProductImageUploadFieldProps) {
  const client = useApiClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const previewSrc = value.trim()
    ? previewFailed
      ? DEFAULT_PRODUCT_IMAGE_URL
      : getProductImageUri(value)
    : '';

  async function handleFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadFile(client, file);
      setPreviewFailed(false);
      onChange(url);
      toast.success('Image uploaded');
    } catch (error: unknown) {
      toast.error(getQueryErrorMessage(error, 'Could not upload image'));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <IconField icon={ImageIcon} label={label} className="sm:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- uploaded CDN / API URLs vary
            <img
              src={previewSrc}
              alt=""
              className="size-full object-cover"
              onError={() => setPreviewFailed(true)}
            />
          ) : (
            <ImageIcon className="size-8 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Input
            ref={inputRef}
            type="file"
            accept="image/*"
            disabled={disabled || uploading}
            aria-label={label}
            onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Upload className="size-4" aria-hidden />
              )}
              {uploading ? 'Uploading…' : 'Upload image'}
            </Button>
            {value.trim() ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled || uploading}
                onClick={() => {
                  setPreviewFailed(false);
                  onChange('');
                }}
              >
                <X className="size-4" aria-hidden />
                Remove
              </Button>
            ) : null}
          </div>
          {value.trim() ? (
            <p className="truncate text-xs text-muted-foreground" title={value}>
              {value}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">PNG, JPG, or WebP</p>
          )}
        </div>
      </div>
    </IconField>
  );
}

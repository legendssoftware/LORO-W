'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { AxiosInstance } from 'axios';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadDocFile } from '@/api/endpoints/docs';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

type LogoFieldProps = {
  client: AxiosInstance;
  value: string;
  onChange: (url: string) => void;
  urlInputId?: string;
  className?: string;
};

/**
 * Logo URL with optional file upload (POST /docs/upload). Falls back to manual URL if upload is forbidden.
 */
export function LogoField({ client, value, onChange, urlInputId, className }: LogoFieldProps) {
  const autoId = useId();
  const fileInputId = urlInputId ? `${urlInputId}-file` : `${autoId}-file`;
  const resolvedUrlId = urlInputId ?? `${autoId}-url`;
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingBlobRef = useRef<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const displaySrc = (pendingPreview ?? '').trim() || value.trim();

  useEffect(() => {
    setImgError(false);
  }, [value, pendingPreview]);

  useEffect(() => {
    return () => {
      if (pendingBlobRef.current) {
        URL.revokeObjectURL(pendingBlobRef.current);
        pendingBlobRef.current = null;
      }
    };
  }, []);

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (pendingBlobRef.current) {
        URL.revokeObjectURL(pendingBlobRef.current);
        pendingBlobRef.current = null;
      }
      const blobUrl = URL.createObjectURL(file);
      pendingBlobRef.current = blobUrl;
      setPendingPreview(blobUrl);
      setUploading(true);
      try {
        const res = await uploadDocFile(client, file, 'image');
        if (!res.publicUrl) throw new Error('Upload succeeded but no URL was returned');
        onChange(res.publicUrl);
        toast.success('Image uploaded');
      } catch (e) {
        const err = e as Error & { apiError?: { status?: number; message?: string } };
        const status = err.apiError?.status;
        const msg = err.apiError?.message ?? err.message ?? 'Upload failed';
        if (status === 403) {
          toast.error(
            'Logo upload is not available for this organisation (documents access required). Paste an image URL instead.'
          );
        } else {
          toast.error(msg);
        }
      } finally {
        setUploading(false);
        if (pendingBlobRef.current) {
          URL.revokeObjectURL(pendingBlobRef.current);
          pendingBlobRef.current = null;
        }
        setPendingPreview(null);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [client, onChange]
  );

  const showImage = Boolean(displaySrc && !imgError);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-muted/40">
          {showImage ? (
            <img
              src={displaySrc}
              alt=""
              className="max-h-full max-w-full object-contain"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="px-2 text-center text-xs text-muted-foreground">No preview</span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            ref={inputRef}
            id={fileInputId}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="sr-only"
            onChange={(ev) => {
              const f = ev.target.files?.[0];
              void handleFile(f ?? null);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit gap-2 bg-white border-gray-200"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="size-4" />
            {uploading ? 'Uploading…' : 'Upload image'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Or paste a URL below. Upload requires documents access on your plan.
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={resolvedUrlId}>Image URL</Label>
        <Input
          id={resolvedUrlId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…"
          className="bg-white border-gray-200"
        />
      </div>
    </div>
  );
}

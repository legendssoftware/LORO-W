'use client';

import { useRef, type ChangeEvent } from 'react';
import { Camera, Image as ImageIcon, Images, Paperclip } from 'lucide-react';
import type { VisitExportItem } from '@/api/types/reports';
import { Button } from '@/components/ui/button';
import { DetailSectionHeading } from '@/components/detail-dialog/detail-dialog-primitives';
import { VisitMediaUpload, MAX_VISIT_MEDIA_BYTES } from '@/components/visits/visit-media-upload';
import { VISITS_TABLE_LINK_CLASS } from '@/components/visits-table/visits-table-utils';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const VISIT_IMAGE_FALLBACK_URL =
  'https://images.pexels.com/photos/163194/old-retro-antique-vintage-163194.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';

const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|webp|bmp|svg)(\?|$)/i;
const DOCUMENT_EXTENSIONS = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|odt|ods)(\?|$)/i;
const PROOF_PHOTO_ACCEPT = '.jpg,.jpeg,.png,.gif,image/jpeg,image/png,image/gif';

function isImageUrl(url: string): boolean {
  if (!url.startsWith('http')) return false;
  return IMAGE_EXTENSIONS.test(url) || url.includes('image');
}

function isDocumentUrl(url: string): boolean {
  return DOCUMENT_EXTENSIONS.test(url) || url.includes('application/pdf') || url.includes('document');
}

function getFileIconType(url: string): 'pdf' | 'word' | 'excel' | 'generic' {
  const lower = url.toLowerCase();
  if (/\.pdf(\?|$)/i.test(lower)) return 'pdf';
  if (/\.(doc|docx)(\?|$)/i.test(lower)) return 'word';
  if (/\.(xls|xlsx)(\?|$)/i.test(lower)) return 'excel';
  return 'generic';
}

function getFilenameFromUrl(item: string): string {
  if (item.startsWith('http')) {
    try {
      const path = new URL(item).pathname;
      return path.split('/').pop() || item;
    } catch {
      return item;
    }
  }
  return item;
}

function PdfIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#DC2626"
      strokeWidth="2"
      className={cn('shrink-0 size-10', className)}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function WordIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded size-10 shrink-0 bg-[#2B579A] text-white font-bold text-sm',
        className
      )}
      aria-hidden
    >
      W
    </div>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      width={24}
      height={24}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function isProofPhotoFile(file: File): boolean {
  if (file.size > MAX_VISIT_MEDIA_BYTES) return false;
  return /\.(jpe?g|png|gif)$/i.test(file.name) || /^image\/(jpeg|jpg|png|gif)$/i.test(file.type);
}

function ProofPhotoPicker({
  label,
  existingUrl,
  previewUrl,
  onSelect,
  onClear,
  onExpand,
  disabled,
}: {
  label: string;
  existingUrl?: string | null;
  previewUrl: string | null;
  onSelect: (file: File) => void;
  onClear: () => void;
  onExpand: (url: string) => void;
  disabled: boolean;
}) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const displayUrl = previewUrl ?? existingUrl ?? null;

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_VISIT_MEDIA_BYTES) {
      toast.error(`${file.name} is over 5MB`);
      return;
    }
    if (!isProofPhotoFile(file)) {
      toast.error(`${file.name} must be JPG, PNG, or GIF`);
      return;
    }
    onSelect(file);
  }

  return (
    <div className="grid gap-2">
      <p className="text-muted-foreground text-xs">{label}</p>
      <input
        ref={galleryRef}
        type="file"
        accept={PROOF_PHOTO_ACCEPT}
        className="hidden"
        disabled={disabled}
        onChange={handleChange}
      />
      <input
        ref={cameraRef}
        type="file"
        accept={PROOF_PHOTO_ACCEPT}
        capture="environment"
        className="hidden"
        disabled={disabled}
        onChange={handleChange}
      />
      {displayUrl ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onExpand(displayUrl);
          }}
          className="block w-full rounded-lg border overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`View ${label} full size`}
        >
          <img
            src={displayUrl}
            alt={label}
            className="w-full max-h-48 object-cover cursor-pointer"
            onError={(e) => {
              e.currentTarget.src = VISIT_IMAGE_FALLBACK_URL;
            }}
          />
        </button>
      ) : (
        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
          No photo yet
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-2"
          onClick={() => galleryRef.current?.click()}
        >
          <Images className="size-4" />
          Gallery
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-2"
          onClick={() => cameraRef.current?.click()}
        >
          <Camera className="size-4" />
          Camera
        </Button>
        {(previewUrl || existingUrl) && previewUrl ? (
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={onClear}>
            Remove new photo
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function MediaGrid({
  items,
  onExpand,
}: {
  items: string[];
  onExpand: (url: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {items.map((item, i) => {
        const isImage = item.startsWith('http') && isImageUrl(item);
        const isDocument = item.startsWith('http') && isDocumentUrl(item);
        const isNonUrlDoc = !item.startsWith('http') && DOCUMENT_EXTENSIONS.test(item);
        const filename = getFilenameFromUrl(item);

        if (isImage) {
          return (
            <button
              key={`${item}-${i}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onExpand(item);
              }}
              className="block rounded-lg border overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-left"
              aria-label={`View image ${i + 1} full size`}
            >
              <img
                src={item}
                alt={`Media ${i + 1}`}
                className="w-full h-24 object-cover cursor-pointer"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = VISIT_IMAGE_FALLBACK_URL;
                }}
              />
            </button>
          );
        }

        if (isDocument || isNonUrlDoc || (item.startsWith('http') && !isImage)) {
          const iconType = item.startsWith('http') ? getFileIconType(item) : 'generic';
          const Icon = iconType === 'pdf' ? PdfIcon : iconType === 'word' ? WordIcon : FileIcon;
          const href = item.startsWith('http') ? item : undefined;
          const content = (
            <>
              <Icon className="shrink-0 size-10" />
              <span className="truncate text-xs">{filename}</span>
            </>
          );
          if (href) {
            return (
              <a
                key={`${item}-${i}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex flex-col items-center justify-center gap-1 h-24 rounded-lg border p-2 text-sm',
                  VISITS_TABLE_LINK_CLASS
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {content}
              </a>
            );
          }
          return (
            <span
              key={`${item}-${i}`}
              className="flex flex-col items-center justify-center gap-1 h-24 rounded-lg border p-2 text-sm text-muted-foreground"
            >
              <FileIcon className="shrink-0 size-10 text-muted-foreground" />
              <span className="truncate text-xs">{filename}</span>
            </span>
          );
        }

        return (
          <span
            key={`${item}-${i}`}
            className="flex flex-col items-center justify-center gap-1 h-24 rounded-lg border p-2 text-sm text-muted-foreground"
          >
            <FileIcon className="shrink-0 size-10 text-muted-foreground" />
            <span className="truncate text-xs">{item}</span>
          </span>
        );
      })}
    </div>
  );
}

export interface VisitDetailMediaSectionProps {
  visit: VisitExportItem;
  isEditing: boolean;
  canEdit: boolean;
  mediaFiles: File[];
  mediaUrls: string[];
  onFilesAdd: (files: File[]) => void;
  onFileRemove: (index: number) => void;
  onUrlAdd: (url: string) => void;
  onUrlRemove: (index: number) => void;
  checkInPhotoPreview: string | null;
  checkOutPhotoPreview: string | null;
  onCheckInPhotoSelect: (file: File) => void;
  onCheckOutPhotoSelect: (file: File) => void;
  onCheckInPhotoClear: () => void;
  onCheckOutPhotoClear: () => void;
  onExpandImage: (url: string) => void;
  disabled?: boolean;
}

/**
 * Always-visible Photos & media block for visit details: view existing files,
 * or upload replacements when editing a completed visit.
 */
export function VisitDetailMediaSection({
  visit,
  isEditing,
  canEdit,
  mediaFiles,
  mediaUrls,
  onFilesAdd,
  onFileRemove,
  onUrlAdd,
  onUrlRemove,
  checkInPhotoPreview,
  checkOutPhotoPreview,
  onCheckInPhotoSelect,
  onCheckOutPhotoSelect,
  onCheckInPhotoClear,
  onCheckOutPhotoClear,
  onExpandImage,
  disabled = false,
}: VisitDetailMediaSectionProps) {
  const proofPhotos = [
    visit.checkInPhoto ? { label: 'Check-in photo', url: visit.checkInPhoto } : null,
    visit.checkOutPhoto ? { label: 'Check-out photo', url: visit.checkOutPhoto } : null,
    visit.contactImage ? { label: 'Contact image', url: visit.contactImage } : null,
  ].filter((item): item is { label: string; url: string } => item != null);
  const mediaItems = (visit.media ?? []).filter(Boolean);
  const hasAny = proofPhotos.length > 0 || mediaItems.length > 0;

  return (
    <div>
      <DetailSectionHeading title="Photos & media" icon={ImageIcon} />
      {isEditing ? (
        <div className="grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProofPhotoPicker
              label="Check-in photo"
              existingUrl={visit.checkInPhoto}
              previewUrl={checkInPhotoPreview}
              onSelect={onCheckInPhotoSelect}
              onClear={onCheckInPhotoClear}
              onExpand={onExpandImage}
              disabled={disabled}
            />
            <ProofPhotoPicker
              label="Check-out photo"
              existingUrl={visit.checkOutPhoto}
              previewUrl={checkOutPhotoPreview}
              onSelect={onCheckOutPhotoSelect}
              onClear={onCheckOutPhotoClear}
              onExpand={onExpandImage}
              disabled={disabled}
            />
          </div>
          {visit.contactImage ? (
            <div>
              <p className="text-muted-foreground text-xs mb-1">Contact image</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onExpandImage(visit.contactImage as string);
                }}
                className="block w-full rounded-lg border overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="View contact image full size"
              >
                <img
                  src={visit.contactImage}
                  alt="Contact"
                  className="w-full max-h-48 object-cover cursor-pointer"
                  onError={(e) => {
                    e.currentTarget.src = VISIT_IMAGE_FALLBACK_URL;
                  }}
                />
              </button>
            </div>
          ) : null}
          <VisitMediaUpload
            files={mediaFiles}
            urls={mediaUrls}
            onFilesAdd={onFilesAdd}
            onFileRemove={onFileRemove}
            onUrlAdd={onUrlAdd}
            onUrlRemove={onUrlRemove}
            disabled={disabled}
          />
        </div>
      ) : hasAny ? (
        <div className="grid gap-4">
          {proofPhotos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {proofPhotos.map((photo) => (
                <div key={photo.label}>
                  <p className="text-muted-foreground text-xs mb-1">{photo.label}</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExpandImage(photo.url);
                    }}
                    className="block w-full rounded-lg border overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`View ${photo.label} full size`}
                  >
                    <img
                      src={photo.url}
                      alt={photo.label}
                      className="w-full max-h-48 object-cover cursor-pointer"
                      onError={(e) => {
                        e.currentTarget.src = VISIT_IMAGE_FALLBACK_URL;
                      }}
                    />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {mediaItems.length > 0 ? (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Paperclip className="size-3.5" aria-hidden />
                Attachments
              </p>
              <MediaGrid items={mediaItems} onExpand={onExpandImage} />
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {canEdit
            ? 'No photos or files yet. Edit this visit to add them.'
            : 'No photos or files yet.'}
        </p>
      )}
    </div>
  );
}

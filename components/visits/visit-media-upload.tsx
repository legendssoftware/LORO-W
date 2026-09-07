'use client';

import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { FileText, Film, Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export const MAX_VISIT_MEDIA_BYTES = 12 * 1024 * 1024;

const ACCEPT =
  'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.mp4,.mov,.webm';

export type VisitMediaFileKind = 'PDF' | 'WORD' | 'MP4' | 'IMG' | 'FILE';

/**
 * Human-readable size for uploaded visit files.
 */
export function formatVisitFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Maps a filename / MIME type to a compact badge label.
 */
export function visitMediaFileKind(name: string, mimeType = ''): VisitMediaFileKind {
  const lower = name.toLowerCase();
  const type = mimeType.toLowerCase();
  if (type.includes('pdf') || lower.endsWith('.pdf')) return 'PDF';
  if (type.includes('word') || lower.endsWith('.doc') || lower.endsWith('.docx')) return 'WORD';
  if (
    type.includes('video') ||
    lower.endsWith('.mp4') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.webm')
  ) {
    return 'MP4';
  }
  if (type.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic|bmp|svg)$/.test(lower)) {
    return 'IMG';
  }
  return 'FILE';
}

const KIND_STYLES: Record<VisitMediaFileKind, string> = {
  PDF: 'bg-orange-100 text-orange-800',
  WORD: 'bg-sky-100 text-sky-800',
  MP4: 'bg-zinc-200 text-zinc-800',
  IMG: 'bg-violet-100 text-violet-800',
  FILE: 'bg-muted text-muted-foreground',
};

function KindIcon({ kind }: { kind: VisitMediaFileKind }) {
  switch (kind) {
    case 'PDF':
    case 'WORD':
    case 'FILE':
      return <FileText className="size-4" />;
    case 'MP4':
      return <Film className="size-4" />;
    case 'IMG':
      return <ImageIcon className="size-4" />;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function MediaCard({
  title,
  subtitle,
  kind,
  onRemove,
}: {
  title: string;
  subtitle: string;
  kind: VisitMediaFileKind;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
      <div
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold',
          KIND_STYLES[kind]
        )}
        aria-hidden="true"
      >
        <span className="flex flex-col items-center gap-0.5 leading-none">
          <KindIcon kind={kind} />
          {kind}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground" title={title}>
          {title}
        </p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
        aria-label={`Remove ${title}`}
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}

export interface VisitMediaUploadProps {
  files: File[];
  urls: string[];
  onFilesAdd: (files: File[]) => void;
  onFileRemove: (index: number) => void;
  onUrlAdd: (url: string) => void;
  onUrlRemove: (index: number) => void;
  disabled?: boolean;
}

/**
 * Drag-and-drop visit media picker with file cards (name, size, type, remove).
 */
export function VisitMediaUpload({
  files,
  urls,
  onFilesAdd,
  onFileRemove,
  onUrlAdd,
  onUrlRemove,
  disabled = false,
}: VisitMediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  function addFiles(list: File[]) {
    if (!list.length) return;
    const accepted: File[] = [];
    for (const file of list) {
      if (file.size > MAX_VISIT_MEDIA_BYTES) {
        toast.error(`${file.name} is over 12MB`);
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length) onFilesAdd(accepted);
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = '';
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    addFiles(Array.from(e.dataTransfer.files ?? []));
  }

  function handleAddUrl() {
    const url = urlInput.trim();
    if (!url) return;
    onUrlAdd(url);
    setUrlInput('');
  }

  return (
    <div className="grid gap-3">
      <Label>Media (images / files)</Label>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        disabled={disabled}
        onChange={handleInputChange}
      />
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/30 bg-muted/40 hover:border-primary/50 hover:bg-muted/60',
          disabled && 'pointer-events-none opacity-50'
        )}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Upload className="size-6" />
        </div>
        <p className="text-sm font-medium text-foreground">Click to upload or drag and drop</p>
        <p className="text-xs text-muted-foreground">max: 12MB</p>
      </div>

      {(files.length > 0 || urls.length > 0) && (
        <div className="grid gap-2">
          <p className="text-sm font-medium text-foreground">Uploaded files</p>
          <ul className="grid gap-2">
            {files.map((file, i) => (
              <MediaCard
                key={`file-${file.name}-${file.size}-${i}`}
                title={file.name}
                subtitle={formatVisitFileSize(file.size)}
                kind={visitMediaFileKind(file.name, file.type)}
                onRemove={() => onFileRemove(i)}
              />
            ))}
            {urls.map((url, i) => (
              <MediaCard
                key={`url-${url}-${i}`}
                title={url}
                subtitle="Link"
                kind={visitMediaFileKind(url)}
                onRemove={() => onUrlRemove(i)}
              />
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Or paste a file URL"
          value={urlInput}
          disabled={disabled}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddUrl();
            }
          }}
          className="max-w-xs"
        />
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={handleAddUrl}>
          Add URL
        </Button>
      </div>
    </div>
  );
}

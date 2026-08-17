import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeftRight,
  CheckCircle2,
  CircleDashed,
  Loader2,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  RotateCcw,
  SkipForward,
  XCircle,
} from 'lucide-react';
import type { TranscriptStatus } from '@/api/types/calls';

export const SEARCH_DEBOUNCE_MS = 350;

export const STATUS_LABEL: Record<TranscriptStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  ready: 'Ready',
  failed: 'Failed',
  skipped: 'Skipped',
};

export const TRANSCRIPT_STATUS_FILTER_OPTIONS: Array<{ value: TranscriptStatus; label: string }> = [
  { value: 'pending', label: STATUS_LABEL.pending },
  { value: 'processing', label: STATUS_LABEL.processing },
  { value: 'ready', label: STATUS_LABEL.ready },
  { value: 'failed', label: STATUS_LABEL.failed },
  { value: 'skipped', label: STATUS_LABEL.skipped },
];

export type CallDirectionKind = 'inbound' | 'outbound' | 'internal' | 'unknown';

export function formatCallDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.abs(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function transcriptStatusVariant(
  status: TranscriptStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'ready':
      return 'default';
    case 'failed':
      return 'destructive';
    case 'processing':
      return 'secondary';
    case 'pending':
    case 'skipped':
      return 'outline';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function isRetryableTranscriptStatus(status: TranscriptStatus | undefined): boolean {
  return status === 'failed' || status === 'skipped';
}

export function transcriptStatusIcon(status: TranscriptStatus): LucideIcon {
  switch (status) {
    case 'ready':
      return CheckCircle2;
    case 'failed':
      return XCircle;
    case 'processing':
      return Loader2;
    case 'pending':
      return CircleDashed;
    case 'skipped':
      return SkipForward;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function transcriptActionIcon(status: TranscriptStatus): LucideIcon {
  if (isRetryableTranscriptStatus(status)) return RotateCcw;
  return transcriptStatusIcon(status);
}

export function normalizeCallDirection(callType: string | null | undefined): CallDirectionKind {
  const t = callType?.trim().toLowerCase();
  if (t === 'inbound') return 'inbound';
  if (t === 'outbound') return 'outbound';
  if (t === 'internal') return 'internal';
  return 'unknown';
}

export function callDirectionLabel(kind: CallDirectionKind, fallback?: string | null): string {
  switch (kind) {
    case 'inbound':
      return 'Inbound';
    case 'outbound':
      return 'Outbound';
    case 'internal':
      return 'Internal';
    case 'unknown':
      return fallback?.trim() || '—';
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function callDirectionIcon(kind: CallDirectionKind): LucideIcon {
  switch (kind) {
    case 'inbound':
      return PhoneIncoming;
    case 'outbound':
      return PhoneOutgoing;
    case 'internal':
      return ArrowLeftRight;
    case 'unknown':
      return Phone;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function displayCallMeta(value: string | number | null | undefined): string {
  if (value == null) return '—';
  if (typeof value === 'number' && !Number.isFinite(value)) return '—';
  const text = String(value).trim();
  return text.length > 0 ? text : '—';
}

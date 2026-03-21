'use client';

import type { ReactNode } from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import type { VisitExportItem } from '@/api/types/reports';
import type { UpdateVisitDetailsPayload } from '@/api/types/visits';
import {
  formatContactAddress,
  formatMethodOfContact,
} from '@/lib/utils/visits-export';
import {
  buildMapsUrl,
  buildTelUrl,
  formatAddressForDisplay,
  formatContactMade,
  formatSalesValue,
  normalizeDurationDisplay,
  visitsColumnWidthClass,
  VISITS_TABLE_LINK_CLASS,
  type VisitsColumnWidth,
} from './visits-table-utils';
import {
  METHOD_OPTIONS,
  TYPE_OF_BUSINESS_OPTIONS,
  SITE_TYPE_OPTIONS,
  QUOTATION_STATUS_OPTIONS,
  PERSON_POSITION_OPTIONS,
  CURRENCY_OPTIONS,
} from '@/lib/visit-form-utils';
import { validateEditVisitFormChangedFields } from '@/lib/schemas/visit-schemas';
import { useUpdateVisitDetailsMutation, useClientsInfinite } from '@/api/hooks';
import type { ClientListItem } from '@/api/endpoints/clients';

/**
 * Visit detail modal field mapping (all columns and data presence) is documented in
 * visit-detail-modal-mapping.md. The modal shows every field; missing values display as "-".
 */
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Pencil, UserPlus, ChevronRight, Users } from 'lucide-react';
import { CalendarIcon, ChevronDownIcon, Loader2Icon, XIcon } from '@/lib/icons';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  CreateLeadModal,
  type CreateLeadModalInitialValues,
} from '@/app/leads/components/create-lead-modal';

const VISIT_IMAGE_FALLBACK_URL =
  'https://images.pexels.com/photos/163194/old-retro-antique-vintage-163194.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';

const NOTES_MAX_WORDS = 2500;
const NOTES_MAX_LENGTH = NOTES_MAX_WORDS * 15; // ~15 chars per word

/** Client row icons rendered 20% smaller than default (size-4). */
const CLIENT_ROW_ICON_CLASS = 'size-4 shrink-0 scale-[0.8]';

/** Format client name for display (lowercase / sentence case instead of all caps). */
function toSentenceCase(s: string): string {
  const t = (s ?? '').trim();
  if (!t) return t;
  return t.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRoleLabel(role: string | null | undefined): string {
  const value = (role ?? '').trim();
  if (!value) return '';
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getWordCount(value: string | null | undefined): number {
  return (value ?? '').trim().split(/\s+/).filter(Boolean).length;
}

const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|webp|bmp|svg)(\?|$)/i;
const DOCUMENT_EXTENSIONS = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|odt|ods)(\?|$)/i;

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
      className={cn('flex items-center justify-center rounded size-10 shrink-0 bg-[#2B579A] text-white font-bold text-sm', className)}
      aria-hidden
    >
      W
    </div>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} width={24} height={24}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

interface VisitsDisplayColumn {
  key: string;
  label: string;
  render: (c: VisitExportItem) => ReactNode;
  width?: VisitsColumnWidth;
}

function renderPhotoCell(url: string | null | undefined): ReactNode {
  if (!url?.trim()) return '-';
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('inline-flex items-center gap-0.5', VISITS_TABLE_LINK_CLASS)}
      onClick={(e) => e.stopPropagation()}
      title="Open in new tab"
    >
      <img
        src={url}
        alt=""
        className="h-8 w-8 rounded object-cover border border-border shrink-0"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
          const next = (e.target as HTMLImageElement).nextElementSibling as HTMLElement | null;
          if (next) next.style.display = 'inline';
        }}
      />
      <span className="text-xs whitespace-nowrap" style={{ display: 'none' }}>
        View
      </span>
    </a>
  );
}

export const VISITS_DISPLAY_COLUMNS: VisitsDisplayColumn[] = [
  {
    key: 'salesPerson',
    label: 'Sales Person',
    render: (c) => {
      const o = c.owner;
      if (!o) return '-';
      const fullName = [o.name, o.surname].filter(Boolean).join(' ').trim() || '-';
      const imgSrc = o.photoURL ?? o.avatar ?? undefined;
      const branchName = o.branch?.name?.trim() || c.branch?.name?.trim() || '';
      const roleLabel = formatRoleLabel(o.role);
      return (
        <span className="flex items-start gap-2 whitespace-normal">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={imgSrc} alt={fullName} />
            <AvatarFallback className="text-xs">
              {fullName !== '-' ? fullName.slice(0, 2).toUpperCase() : '-'}
            </AvatarFallback>
          </Avatar>
          <span className="space-y-0.5 block min-w-0">
            <span className="block font-medium">{fullName}</span>
            {o.email && (
              <a
                href={`mailto:${o.email}`}
                className={cn('block text-xs truncate', VISITS_TABLE_LINK_CLASS)}
                title={o.email}
                onClick={(e) => e.stopPropagation()}
              >
                {o.email}
              </a>
            )}
            <span className="block text-xs text-muted-foreground truncate">
              {o.phone ? (
                <>
                  <a
                    href={buildTelUrl(o.phone)}
                    className={cn(VISITS_TABLE_LINK_CLASS)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {o.phone}
                  </a>
                  {' · '}
                </>
              ) : null}
              Branch: {branchName || '—'}
              {roleLabel ? ` · Role: ${roleLabel}` : ''}
            </span>
            {!o.email && !o.phone && !branchName && !roleLabel && (
              <span className="block text-xs text-muted-foreground">-</span>
            )}
          </span>
        </span>
      );
    },
  },
  {
    key: 'date',
    label: 'Date and time',
    render: (c) => {
      const dateLine = format(new Date(c.checkInTime), 'MMM d, yyyy,');
      const inTime = format(new Date(c.checkInTime), 'HH:mm');
      const outTime = c.checkOutTime ? format(new Date(c.checkOutTime), 'HH:mm') : '-';
      const timeLine = `${inTime} – ${outTime}`;
      const durationLine = normalizeDurationDisplay(c.duration);
      return (
        <span className="whitespace-normal block">
          <span className="block">{dateLine}</span>
          <span className="block">{timeLine}</span>
          <span className="block text-muted-foreground text-xs">{durationLine}</span>
        </span>
      );
    },
  },
  {
    key: 'location',
    label: 'Check-in / Check-out location',
    render: (c) => {
      const inAddr = formatAddressForDisplay(c.fullAddress, c.checkInLocation || '-');
      const outAddr = formatAddressForDisplay(c.checkOutFullAddress, c.checkOutLocation || '-');
      const inMapTarget = c.checkInLocation || inAddr;
      const outMapTarget = c.checkOutLocation || outAddr;
      const inUrl = inMapTarget !== '-' ? buildMapsUrl(inMapTarget) : null;
      const outUrl = outMapTarget !== '-' ? buildMapsUrl(outMapTarget) : null;
      const locLinkClass = cn(VISITS_TABLE_LINK_CLASS, 'block truncate text-left max-w-[12rem]');
      return (
        <span className="flex flex-col gap-1">
          {inUrl && inUrl !== '#' ? (
            <a href={inUrl} target="_blank" rel="noopener noreferrer" className={locLinkClass} title={inAddr} onClick={(e) => e.stopPropagation()}>
              In: {inAddr}
            </a>
          ) : (
            <span className="block truncate max-w-[12rem]" title={inAddr}>In: {inAddr}</span>
          )}
          {outUrl && outUrl !== '#' ? (
            <a href={outUrl} target="_blank" rel="noopener noreferrer" className={locLinkClass} title={outAddr} onClick={(e) => e.stopPropagation()}>
              Out: {outAddr}
            </a>
          ) : (
            <span className="block truncate max-w-[12rem]" title={outAddr}>Out: {outAddr}</span>
          )}
        </span>
      );
    },
  },
  {
    key: 'method',
    label: 'Method of visit',
    width: 'quarter',
    render: (c) => {
      if (c.methodOfContact) return formatMethodOfContact(c.methodOfContact);
      const hasLocation =
        (c.checkInLocation && c.checkInLocation !== '-') ||
        (c.checkOutLocation && c.checkOutLocation !== '-');
      return hasLocation ? 'Physical' : '-';
    },
  },
  {
    key: 'buildingType',
    label: 'Building type',
    width: 'quarter',
    render: (c) => (c.buildingType ? String(c.buildingType).replace(/_/g, ' ') : '-'),
  },
  {
    key: 'contactMade',
    label: 'Contact made',
    width: 'quarter',
    render: (c) => formatContactMade(c.contactMade),
  },
  {
    key: 'companyName',
    label: 'Company',
    render: (c) => c.companyName?.trim() || '-',
  },
  {
    key: 'businessType',
    label: 'Business type',
    render: (c) => (c.businessType ? String(c.businessType).replace(/_/g, ' ') : '-'),
  },
  {
    key: 'personSeenPosition',
    label: 'Person seen position',
    render: (c) => c.personSeenPosition?.trim() || '-',
  },
  {
    key: 'contactFullName',
    label: 'Contact name',
    render: (c) => c.contactFullName?.trim() || '-',
  },
  {
    key: 'contactImage',
    label: 'Contact image',
    render: (c) => {
      if (c.contactImage?.trim()) return renderPhotoCell(c.contactImage);
      const firstImageUrl = c.media?.find((u) => u?.startsWith('http') && isImageUrl(u));
      if (firstImageUrl) return renderPhotoCell(firstImageUrl);
      const firstUrl = c.media?.find((u) => u?.startsWith('http'));
      if (c.media?.length && firstUrl) {
        const label = c.media.length === 1 ? 'View file' : `${c.media.length} files`;
        return (
          <a
            href={firstUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn('text-xs', VISITS_TABLE_LINK_CLASS)}
            onClick={(e) => e.stopPropagation()}
          >
            {label}
          </a>
        );
      }
      if (c.media?.length) return <span className="text-muted-foreground text-xs">{c.media.length} file{c.media.length !== 1 ? 's' : ''}</span>;
      return '-';
    },
  },
  {
    key: 'contactCellPhone',
    label: 'Cell',
    render: (c) =>
      c.contactCellPhone?.trim() ? (
        <a href={buildTelUrl(c.contactCellPhone)} className={VISITS_TABLE_LINK_CLASS} onClick={(e) => e.stopPropagation()}>
          {c.contactCellPhone}
        </a>
      ) : '-',
  },
  {
    key: 'contactLandline',
    label: 'Landline',
    render: (c) =>
      c.contactLandline?.trim() ? (
        <a href={buildTelUrl(c.contactLandline)} className={VISITS_TABLE_LINK_CLASS} onClick={(e) => e.stopPropagation()}>
          {c.contactLandline}
        </a>
      ) : '-',
  },
  {
    key: 'contactEmail',
    label: 'Contact email',
    render: (c) =>
      c.contactEmail?.trim() ? (
        <a href={`mailto:${c.contactEmail}`} target="_blank" rel="noopener noreferrer" className={VISITS_TABLE_LINK_CLASS} onClick={(e) => e.stopPropagation()}>
          {c.contactEmail}
        </a>
      ) : '-',
  },
  {
    key: 'contactAddress',
    label: 'Contact address',
    render: (c) => {
      const addr = formatContactAddress(c.contactAddress);
      if (!addr?.trim() || addr === '-') return '-';
      return (
        <a
          href={buildMapsUrl(addr)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(VISITS_TABLE_LINK_CLASS, 'block truncate max-w-[10rem]')}
          title={addr}
          onClick={(e) => e.stopPropagation()}
        >
          {addr}
        </a>
      );
    },
  },
  {
    key: 'meetingLink',
    label: 'Meeting link',
    render: (c) =>
      c.meetingLink?.trim() ? (
        <a href={c.meetingLink} target="_blank" rel="noopener noreferrer" className={VISITS_TABLE_LINK_CLASS} onClick={(e) => e.stopPropagation()}>
          Open link
        </a>
      ) : '-',
  },
  {
    key: 'notes',
    label: 'Notes',
    width: 'double',
    render: (c) => c.notes || '-',
  },
  {
    key: 'resolution',
    label: 'Resolution',
    width: 'double',
    render: (c) => c.resolution?.trim() || '-',
  },
  {
    key: 'followUp',
    label: 'Follow Up',
    render: (c) => (c.followUp?.trim() || '-'),
  },
  {
    key: 'quoteNumber',
    label: 'Quote Number',
    render: (c) => c.quotationNumber || '-',
  },
  {
    key: 'quotationStatus',
    label: 'Quotation status',
    render: (c) => (c.quotationStatus ? String(c.quotationStatus).replace(/_/g, ' ') : '-'),
  },
  {
    key: 'value',
    label: 'Value - ex-VAT',
    render: (c) =>
      c.salesValue != null
        ? formatSalesValue(c.salesValue, (c as { salesCurrency?: string }).salesCurrency)
        : '-',
  },
  {
    key: 'lead',
    label: 'Lead',
    render: (c) => c.lead?.name?.trim() || '-',
  },
  {
    key: 'client',
    label: 'Client',
    render: (c) => c.client?.name?.trim() || '-',
  },
  {
    key: 'branch',
    label: 'Branch',
    render: (c) => c.branch?.name?.trim() || '-',
  },
];

/** Columns for the nested visit table (all except Sales Person). */
const VISITS_TABLE_COLUMNS = VISITS_DISPLAY_COLUMNS.filter((col) => col.key !== 'salesPerson');

export interface GroupedByOwner {
  ownerKey: string;
  owner: VisitExportItem['owner'];
  visits: VisitExportItem[];
}

/** Stable key for grouping visits by sales person (owner has no uid). */
function getOwnerKey(owner: VisitExportItem['owner']): string {
  if (!owner) return '__unknown__';
  const email = (owner.email ?? '').trim();
  const name = (owner.name ?? '').trim();
  const surname = (owner.surname ?? '').trim();
  return [email, name, surname].join('|') || '__unknown__';
}

/** Group check-ins by owner; sort groups by visit count (most first), visits within group by date (newest first). */
function groupCheckInsByOwner(checkIns: VisitExportItem[]): GroupedByOwner[] {
  const map = new Map<string, VisitExportItem[]>();
  for (const c of checkIns) {
    const key = getOwnerKey(c.owner);
    const list = map.get(key) ?? [];
    list.push(c);
    map.set(key, list);
  }
  const grouped: GroupedByOwner[] = [];
  map.forEach((visits, ownerKey) => {
    const sorted = [...visits].sort((a, b) => {
      const aTime = new Date(a.createdAt ?? a.checkInTime).getTime();
      const bTime = new Date(b.createdAt ?? b.checkInTime).getTime();
      return bTime - aTime;
    });
    grouped.push({
      ownerKey,
      owner: visits[0]?.owner,
      visits: sorted,
    });
  });
  grouped.sort((a, b) => b.visits.length - a.visits.length);
  return grouped;
}

function visitToEditForm(visit: VisitExportItem): Partial<UpdateVisitDetailsPayload> {
  const clientUid = (visit.client as { uid?: number } | undefined)?.uid;
  return {
    checkInId: visit.uid,
    client: clientUid != null ? { uid: clientUid } : undefined,
    notes: visit.notes ?? undefined,
    resolution: visit.resolution ?? undefined,
    followUp: visit.followUp ?? undefined,
    contactFullName: visit.contactFullName ?? undefined,
    contactCellPhone: visit.contactCellPhone ?? undefined,
    contactLandline: visit.contactLandline ?? undefined,
    contactEmail: visit.contactEmail ?? undefined,
    contactAddress: visit.contactAddress ?? undefined,
    companyName: visit.companyName ?? undefined,
    businessType: visit.businessType ?? undefined,
    personSeenPosition: visit.personSeenPosition ?? undefined,
    meetingLink: visit.meetingLink ?? undefined,
    salesValue: visit.salesValue ?? undefined,
    salesCurrency: (visit as { salesCurrency?: string }).salesCurrency ?? undefined,
    quotationNumber: visit.quotationNumber ?? undefined,
    quotationStatus: visit.quotationStatus ?? undefined,
    methodOfContact: visit.methodOfContact ?? undefined,
    buildingType: visit.buildingType ?? undefined,
    contactMade: visit.contactMade ?? undefined,
    media: visit.media ?? undefined,
  };
}

/** Maps a visit to initial form values for the Create Lead modal (convert visit to lead). Uses visit date as lastContactDate without validation. */
function visitToLeadInitialValues(visit: VisitExportItem): CreateLeadModalInitialValues {
  const notesParts = [
    visit.notes?.trim(),
    visit.resolution?.trim(),
    formatContactAddress(visit.contactAddress) !== '-' ? formatContactAddress(visit.contactAddress) : null,
  ].filter(Boolean);
  const notes = notesParts.length > 0 ? notesParts.join('\n\n') : undefined;
  const phone = (visit.contactCellPhone?.trim() || visit.contactLandline?.trim()) || undefined;
  const visitDate = visit.checkOutTime ?? visit.checkInTime;
  return {
    name: visit.contactFullName?.trim() || undefined,
    companyName: visit.companyName?.trim() || undefined,
    email: visit.contactEmail?.trim() || undefined,
    phone: phone || undefined,
    notes: notes || undefined,
    source: 'OTHER',
    branchUid: visit.branch?.uid ?? undefined,
    jobTitle: visit.personSeenPosition?.trim() || undefined,
    estimatedValue: visit.salesValue ?? undefined,
    lastContactDate: visitDate || undefined,
  };
}

/** Normalize empty string to undefined for comparison. */
function norm(v: unknown): unknown {
  if (v === '' || v === null) return undefined;
  return v;
}

/** Deep equality for address-like objects. */
function addressesEqual(
  a: Record<string, unknown> | undefined,
  b: Record<string, unknown> | undefined
): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const va = norm((a as Record<string, unknown>)[k]);
    const vb = norm((b as Record<string, unknown>)[k]);
    if (va !== vb) return false;
  }
  return true;
}

/** Returns only fields that differ between original and current. Excludes checkInId. */
function getChangedFields(
  original: Partial<UpdateVisitDetailsPayload>,
  current: Partial<UpdateVisitDetailsPayload>
): Partial<UpdateVisitDetailsPayload> {
  const changed: Partial<UpdateVisitDetailsPayload> = {};
  const keys: (keyof UpdateVisitDetailsPayload)[] = [
    'client',
    'notes',
    'resolution',
    'followUp',
    'contactFullName',
    'contactCellPhone',
    'contactLandline',
    'contactEmail',
    'contactAddress',
    'companyName',
    'businessType',
    'personSeenPosition',
    'meetingLink',
    'salesValue',
    'salesCurrency',
    'quotationNumber',
    'quotationStatus',
    'methodOfContact',
    'buildingType',
    'contactMade',
    'media',
  ];
  for (const k of keys) {
    const orig = original[k];
    const curr = current[k];
    if (k === 'contactAddress') {
      if (!addressesEqual(orig as Record<string, unknown> | undefined, curr as Record<string, unknown> | undefined)) {
        (changed as Record<string, unknown>)[k] = curr;
      }
    } else if (k === 'client') {
      const origUid = (orig as { uid?: number } | undefined)?.uid;
      const currUid = (curr as { uid?: number } | undefined)?.uid;
      if (origUid !== currUid) {
        (changed as Record<string, unknown>)[k] = curr;
      }
    } else if (k === 'companyName' || k === 'quotationNumber') {
      const o = (orig ?? '') as string;
      const c = (curr ?? '') as string;
      if (o.trim() !== c.trim()) {
        (changed as Record<string, unknown>)[k] = (c.trim() || undefined) as never;
      }
    } else if (k === 'media') {
      const oa = (orig as string[] | undefined) ?? [];
      const ca = (curr as string[] | undefined) ?? [];
      if (oa.length !== ca.length || oa.some((v, i) => v !== ca[i])) {
        (changed as Record<string, unknown>)[k] = curr;
      }
    } else {
      const no = norm(orig);
      const nc = norm(curr);
      if (no !== nc) {
        (changed as Record<string, unknown>)[k] = curr;
      }
    }
  }
  return changed;
}

function VisitDetailDialog({
  visit,
  open,
  onOpenChange,
  onVisitUpdated,
}: {
  visit: VisitExportItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVisitUpdated?: () => void;
}) {
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UpdateVisitDetailsPayload>>({});
  const [followUpPickerOpen, setFollowUpPickerOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientListItem | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [createLeadModalOpen, setCreateLeadModalOpen] = useState(false);
  const updateMutation = useUpdateVisitDetailsMutation();
  const clientsInfinite = useClientsInfinite({
    enabled: open && isEditing,
  });
  const clientsData = clientsInfinite.data ?? [];
  const clientsList = useMemo(() => {
    if (!selectedClient) return clientsData;
    const inList = clientsData.some((c) => c.uid === selectedClient.uid);
    return inList ? clientsData : [selectedClient, ...clientsData];
  }, [clientsData, selectedClient]);

  const isEndedVisit = !!visit?.checkOutTime;

  useEffect(() => {
    if (!visit || !open) return;
    setEditForm(visitToEditForm(visit));
    setIsEditing(false);
    setFieldErrors({});
  }, [visit?.uid, open]);

  useEffect(() => {
    if (!visit || !open) return;
    const c = visit.client as { uid?: number } | undefined;
    if (c?.uid) {
      const client = clientsList.find((cl) => cl.uid === c.uid);
      setSelectedClient(client ?? null);
    } else {
      setSelectedClient(null);
    }
  }, [visit?.uid, open, clientsList]);

  const leadInitialValues = useMemo(
    () => (visit ? visitToLeadInitialValues(visit) : undefined),
    [visit?.uid]
  );

  const handleCancelEdit = () => {
    if (visit) setEditForm(visitToEditForm(visit));
    setIsEditing(false);
    setFieldErrors({});
  };

  const handleSaveEdit = async () => {
    if (!visit) return;
    const original = visitToEditForm(visit);
    const changed = getChangedFields(original, editForm);
    if (Object.keys(changed).length === 0) {
      toast.success('No changes to save');
      setIsEditing(false);
      return;
    }
    const { fieldErrors: errs, firstMessage } = validateEditVisitFormChangedFields(changed as Record<string, unknown>);
    if (firstMessage) {
      setFieldErrors(errs);
      toast.error(firstMessage);
      return;
    }
    const payload: UpdateVisitDetailsPayload = {
      checkInId: visit.uid,
      ...changed,
    };
    try {
      await updateMutation.mutateAsync(payload);
      toast.success('Visit updated');
      setIsEditing(false);
      setFieldErrors({});
      onVisitUpdated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update visit');
    }
  };

  if (!visit) return null;
  const ownerFullName = visit.owner ? [visit.owner.name, visit.owner.surname].filter(Boolean).join(' ').trim() : '-';
  const inAddr = formatAddressForDisplay(visit.fullAddress, visit.checkInLocation || '-');
  const outAddr = formatAddressForDisplay(visit.checkOutFullAddress, visit.checkOutLocation || '-');
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[calc(100%-3rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6 pt-12 pr-14"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            {isEndedVisit && !isEditing && (
              <>
                {!visit.lead?.uid && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-green-600 text-green-700 hover:bg-green-50 hover:text-green-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCreateLeadModalOpen(true);
                    }}
                  >
                    <UserPlus className="size-4" />
                    Convert to Lead
                  </Button>
                )}
                <Button
                  size="sm"
                  className="gap-1.5 bg-purple-600 text-white hover:bg-purple-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                >
                  <Pencil className="size-4" />
                  Edit
                </Button>
              </>
            )}
            <DialogClose asChild>
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-full border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Close"
              >
                <XIcon className="size-5" />
              </button>
            </DialogClose>
          </div>
          <DialogHeader className="pr-24">
            <DialogTitle>Visit Details – #{visit.uid}</DialogTitle>
            <DialogDescription>
              {ownerFullName} · {format(new Date(visit.checkInTime), 'MMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Timing</h4>
              <div className="space-y-1 text-muted-foreground">
                <p>Check-in: {format(new Date(visit.checkInTime), 'MMM d, yyyy – h:mm a')}</p>
                {visit.checkOutTime && (
                  <p>Check-out: {format(new Date(visit.checkOutTime), 'MMM d, yyyy – h:mm a')}</p>
                )}
                {visit.duration && <p>Duration: {normalizeDurationDisplay(visit.duration)}</p>}
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold mb-2">Location</h4>
              <div className="flex flex-col gap-1">
                <span>
                  In:{' '}
                  {inAddr !== '#' ? (
                    <a
                      href={buildMapsUrl(visit.checkInLocation || inAddr)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={VISITS_TABLE_LINK_CLASS}
                    >
                      {inAddr}
                    </a>
                  ) : (
                    inAddr
                  )}
                </span>
                {(visit.checkOutLocation || outAddr !== '-') && (
                  <span>
                    Out:{' '}
                    {outAddr !== '-' && outAddr !== '#' ? (
                      <a
                        href={buildMapsUrl(visit.checkOutLocation || outAddr)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={VISITS_TABLE_LINK_CLASS}
                      >
                        {outAddr}
                      </a>
                    ) : (
                      outAddr
                    )}
                  </span>
                )}
              </div>
            </div>
            {(visit.methodOfContact === 'Physical' || !visit.methodOfContact) &&
            (visit.checkInPhoto || visit.checkOutPhoto || visit.contactImage) ? (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Photos</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {visit.checkInPhoto ? (
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Check-in photo</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedImageUrl(visit.checkInPhoto ?? null);
                          }}
                          className="block w-full rounded-lg border overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="View check-in photo full size"
                        >
                          <img
                            src={visit.checkInPhoto}
                            alt="Check-in"
                            className="w-full max-h-48 object-cover cursor-pointer"
                            onError={(e) => {
                              e.currentTarget.src = VISIT_IMAGE_FALLBACK_URL;
                            }}
                          />
                        </button>
                      </div>
                    ) : null}
                    {visit.checkOutPhoto ? (
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Check-out photo</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedImageUrl(visit.checkOutPhoto ?? null);
                          }}
                          className="block w-full rounded-lg border overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="View check-out photo full size"
                        >
                          <img
                            src={visit.checkOutPhoto}
                            alt="Check-out"
                            className="w-full max-h-48 object-cover cursor-pointer"
                            onError={(e) => {
                              e.currentTarget.src = VISIT_IMAGE_FALLBACK_URL;
                            }}
                          />
                        </button>
                      </div>
                    ) : null}
                    {visit.contactImage ? (
                      <div className="sm:col-span-2">
                        <p className="text-muted-foreground text-xs mb-1">Contact image</p>
                        <img
                          src={visit.contactImage}
                          alt="Contact"
                          className="w-full max-h-48 object-cover rounded-lg border"
                          onError={(e) => {
                            e.currentTarget.src = VISIT_IMAGE_FALLBACK_URL;
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
                <Separator />
              </>
            ) : null}
            {visit.media && visit.media.length > 0 ? (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Media</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {visit.media.map((item, i) => {
                      const isImage = item.startsWith('http') && isImageUrl(item);
                      const isDocument = item.startsWith('http') && isDocumentUrl(item);
                      const isNonUrlDoc = !item.startsWith('http') && DOCUMENT_EXTENSIONS.test(item);
                      const isNonUrlImage = !item.startsWith('http') && IMAGE_EXTENSIONS.test(item);
                      const filename = getFilenameFromUrl(item);

                      if (isImage) {
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedImageUrl(item);
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
                        const Icon =
                          iconType === 'pdf' ? PdfIcon : iconType === 'word' ? WordIcon : FileIcon;
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
                              key={i}
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
                            key={i}
                            className="flex flex-col items-center justify-center gap-1 h-24 rounded-lg border p-2 text-sm text-muted-foreground"
                          >
                            <FileIcon className="shrink-0 size-10 text-muted-foreground" />
                            <span className="truncate text-xs">{filename}</span>
                          </span>
                        );
                      }

                      if (isNonUrlImage) {
                        return (
                          <span
                            key={i}
                            className="flex flex-col items-center justify-center gap-1 h-24 rounded-lg border p-2 text-sm text-muted-foreground"
                          >
                            <FileIcon className="shrink-0 size-10 text-muted-foreground" />
                            <span className="truncate text-xs">{filename}</span>
                          </span>
                        );
                      }

                      return (
                        <span
                          key={i}
                          className="flex flex-col items-center justify-center gap-1 h-24 rounded-lg border p-2 text-sm text-muted-foreground"
                        >
                          <FileIcon className="shrink-0 size-10 text-muted-foreground" />
                          <span className="truncate text-xs">{item}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : null}
            <div>
              <h4 className="font-semibold mb-2">Details</h4>
              {isEditing ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Select
                      value={selectedClient ? String(selectedClient.uid) : '_none'}
                      onValueChange={(value) => {
                        if (value === '_none') {
                          setSelectedClient(null);
                          setEditForm((f) => ({ ...f, client: undefined }));
                          return;
                        }
                        const uid = Number(value);
                        const c = clientsList.find((cl) => cl.uid === uid);
                        if (!c) return;
                        setSelectedClient(c);
                        const addr = c.address;
                        setEditForm((f) => ({
                          ...f,
                          client: { uid: c.uid },
                          companyName: c.name ?? f.companyName,
                          contactFullName: c.contactPerson ?? f.contactFullName,
                          contactEmail: c.email ?? f.contactEmail,
                          contactCellPhone: (c.phone as string) ?? f.contactCellPhone,
                          contactLandline: (c.alternativePhone as string) ?? f.contactLandline,
                          ...(addr && {
                            contactAddress: {
                              street: (addr.street ?? '') as string,
                              suburb: (addr.suburb ?? '') as string,
                              city: (addr.city ?? '') as string,
                              province: (addr.state ?? '') as string,
                              state: (addr.state ?? '') as string,
                              country: (addr.country ?? '') as string,
                              postalCode: (addr.postalCode ?? '') as string,
                            },
                          }),
                        }));
                      }}
                    >
                      <SelectTrigger className="w-full justify-between font-normal border-input h-9 rounded-xl border px-3 py-2 text-sm shadow-xs gap-2">
                        <span className="flex items-center gap-2 min-w-0 flex-1">
                          <Users className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                          <SelectValue placeholder="No client" />
                        </span>
                      </SelectTrigger>
                      <SelectContent className="z-[10001] max-h-[min(320px,50vh)]" position="popper">
                        <SelectItem value="_none">No client</SelectItem>
                        {clientsInfinite.isLoading && (
                          <SelectItem value="_loading" disabled className="pointer-events-none">
                            Loading…
                          </SelectItem>
                        )}
                        {clientsList.length === 0 && !clientsInfinite.isLoading && (
                          <SelectItem value="_empty" disabled className="pointer-events-none">
                            No clients found
                          </SelectItem>
                        )}
                        {clientsList.map((c) => {
                          const nameTrim = (c.name ?? '').trim();
                          const contactTrim = (c.contactPerson ?? '').trim();
                          const displayLabel =
                            contactTrim && contactTrim !== nameTrim
                              ? `${toSentenceCase(nameTrim)} · ${toSentenceCase(contactTrim)}`
                              : toSentenceCase(nameTrim) || '—';
                          return (
                            <SelectItem key={c.uid} value={String(c.uid)}>
                              {displayLabel}
                            </SelectItem>
                          );
                        })}
                        {(clientsInfinite.hasNextPage ?? false) && (
                          <div className="flex items-center justify-center border-t border-border py-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-full text-muted-foreground hover:text-foreground"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                clientsInfinite.fetchNextPage();
                              }}
                              disabled={clientsInfinite.isFetchingNextPage ?? false}
                            >
                              {clientsInfinite.isFetchingNextPage ? (
                                <Loader2Icon className="size-4 animate-spin" />
                              ) : (
                                'Load more'
                              )}
                            </Button>
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={editForm.notes ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                      maxLength={NOTES_MAX_LENGTH}
                      rows={4}
                      className="resize-y"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getWordCount(editForm.notes).toLocaleString()} / {NOTES_MAX_WORDS.toLocaleString()} words
                    </p>
                  </div>
                  <div>
                    <Label>Resolution</Label>
                    <Input
                      value={editForm.resolution ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, resolution: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Contact name</Label>
                    <Input
                      value={editForm.contactFullName ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, contactFullName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Company</Label>
                    <Input
                      value={editForm.companyName ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, companyName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Cell</Label>
                    <Input
                      value={editForm.contactCellPhone ?? ''}
                      onChange={(e) => {
                        setEditForm((f) => ({ ...f, contactCellPhone: e.target.value }));
                        if (fieldErrors.contactCellPhone) setFieldErrors((prev) => ({ ...prev, contactCellPhone: '' }));
                      }}
                      aria-invalid={!!fieldErrors.contactCellPhone}
                      className={fieldErrors.contactCellPhone ? 'border-destructive' : ''}
                    />
                    {fieldErrors.contactCellPhone && (
                      <p className="text-xs text-destructive mt-1">{fieldErrors.contactCellPhone}</p>
                    )}
                  </div>
                  <div>
                    <Label>Landline</Label>
                    <Input
                      value={editForm.contactLandline ?? ''}
                      onChange={(e) => {
                        setEditForm((f) => ({ ...f, contactLandline: e.target.value }));
                        if (fieldErrors.contactLandline) setFieldErrors((prev) => ({ ...prev, contactLandline: '' }));
                      }}
                      aria-invalid={!!fieldErrors.contactLandline}
                      className={fieldErrors.contactLandline ? 'border-destructive' : ''}
                    />
                    {fieldErrors.contactLandline && (
                      <p className="text-xs text-destructive mt-1">{fieldErrors.contactLandline}</p>
                    )}
                  </div>
                  <div>
                    <Label>Contact email</Label>
                    <Input
                      type="email"
                      value={editForm.contactEmail ?? ''}
                      onChange={(e) => {
                        setEditForm((f) => ({ ...f, contactEmail: e.target.value }));
                        if (fieldErrors.contactEmail) setFieldErrors((prev) => ({ ...prev, contactEmail: '' }));
                      }}
                      aria-invalid={!!fieldErrors.contactEmail}
                      className={fieldErrors.contactEmail ? 'border-destructive' : ''}
                    />
                    {fieldErrors.contactEmail && (
                      <p className="text-xs text-destructive mt-1">{fieldErrors.contactEmail}</p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Address</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                      <Input
                        placeholder="Street"
                        value={editForm.contactAddress?.street ?? ''}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            contactAddress: { ...f.contactAddress, street: e.target.value },
                          }))
                        }
                      />
                      <Input
                        placeholder="Suburb"
                        value={editForm.contactAddress?.suburb ?? ''}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            contactAddress: { ...f.contactAddress, suburb: e.target.value },
                          }))
                        }
                      />
                      <Input
                        placeholder="City"
                        value={editForm.contactAddress?.city ?? ''}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            contactAddress: { ...f.contactAddress, city: e.target.value },
                          }))
                        }
                      />
                      <Input
                        placeholder="Province / State"
                        value={editForm.contactAddress?.state ?? ''}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            contactAddress: { ...f.contactAddress, state: e.target.value, province: e.target.value },
                          }))
                        }
                      />
                      <Input
                        placeholder="Country"
                        value={editForm.contactAddress?.country ?? ''}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            contactAddress: { ...f.contactAddress, country: e.target.value },
                          }))
                        }
                      />
                      <Input
                        placeholder="Postal code"
                        value={editForm.contactAddress?.postalCode ?? ''}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            contactAddress: { ...f.contactAddress, postalCode: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Person seen position</Label>
                    <Select
                      value={editForm.personSeenPosition ?? '_none'}
                      onValueChange={(v) => setEditForm((f) => ({ ...f, personSeenPosition: v === '_none' ? undefined : v }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="z-[10001]">
                        <SelectItem value="_none">Select</SelectItem>
                        {PERSON_POSITION_OPTIONS.map((o) => {
                          const Icon = o.icon;
                          return (
                            <SelectItem key={o.value} value={o.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="size-4 shrink-0" />
                                {o.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Follow-up</Label>
                    <Popover open={followUpPickerOpen} onOpenChange={setFollowUpPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start',
                            !editForm.followUp && 'text-muted-foreground',
                            fieldErrors.followUp && 'border-destructive'
                          )}
                          aria-invalid={!!fieldErrors.followUp}
                        >
                          <CalendarIcon className="mr-2 size-4" />
                          {editForm.followUp && /^\d{4}-\d{2}-\d{2}/.test(editForm.followUp)
                            ? format(new Date(editForm.followUp), 'MMM d, yyyy')
                            : 'Pick date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="z-[10001]">
                        <Calendar
                          mode="single"
                          selected={editForm.followUp && /^\d{4}-\d{2}-\d{2}/.test(editForm.followUp) ? new Date(editForm.followUp) : undefined}
                          onSelect={(d) => {
                            setEditForm((f) => ({ ...f, followUp: d ? format(d, 'yyyy-MM-dd') : undefined }));
                            if (fieldErrors.followUp) setFieldErrors((prev) => ({ ...prev, followUp: '' }));
                            setFollowUpPickerOpen(false);
                          }}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        />
                      </PopoverContent>
                    </Popover>
                    {fieldErrors.followUp && (
                      <p className="text-xs text-destructive mt-1">{fieldErrors.followUp}</p>
                    )}
                  </div>
                  <div>
                    <Label>Quotation number</Label>
                    <Input
                      value={editForm.quotationNumber ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, quotationNumber: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Quotation status</Label>
                    <Select
                      value={editForm.quotationStatus ?? '_none'}
                      onValueChange={(v) => setEditForm((f) => ({ ...f, quotationStatus: v === '_none' ? undefined : v }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="z-[10001]">
                        {QUOTATION_STATUS_OPTIONS.map((o) => {
                          const Icon = o.icon;
                          return (
                            <SelectItem key={o.value} value={o.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="size-4 shrink-0" />
                                {o.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Sales value</Label>
                    <div className="flex gap-2">
                      <Select
                        value={editForm.salesCurrency ?? 'ZAR'}
                        onValueChange={(v) => setEditForm((f) => ({ ...f, salesCurrency: v }))}
                      >
                        <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                        <SelectContent className="z-[10001]">
                          {CURRENCY_OPTIONS.map((o) => {
                            const Icon = o.icon;
                            return (
                              <SelectItem key={o.value} value={o.value}>
                                <div className="flex items-center gap-2">
                                  <Icon className="size-4 shrink-0" />
                                  {o.label}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        className="flex-1"
                        value={editForm.salesValue ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, salesValue: e.target.value ? Number(e.target.value) : undefined }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Method of contact</Label>
                    <Select
                      value={editForm.methodOfContact ?? '_none'}
                      onValueChange={(v) => setEditForm((f) => ({ ...f, methodOfContact: v === '_none' ? undefined : v }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="z-[10001]">
                        <SelectItem value="_none">Select</SelectItem>
                        {METHOD_OPTIONS.map((o) => {
                          const Icon = o.icon;
                          return (
                            <SelectItem key={o.value} value={o.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="size-4 shrink-0" />
                                {o.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Meeting link</Label>
                    <Input
                      value={editForm.meetingLink ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, meetingLink: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Building type</Label>
                    <Select
                      value={editForm.buildingType ?? '_none'}
                      onValueChange={(v) => setEditForm((f) => ({ ...f, buildingType: v === '_none' ? undefined : v }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="z-[10001]">
                        <SelectItem value="_none">Select</SelectItem>
                        {SITE_TYPE_OPTIONS.map((o) => {
                          const Icon = o.icon;
                          return (
                            <SelectItem key={o.value} value={o.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="size-4 shrink-0" />
                                {o.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Business type</Label>
                    <Select
                      value={editForm.businessType ?? '_none'}
                      onValueChange={(v) => setEditForm((f) => ({ ...f, businessType: v === '_none' ? undefined : v }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="z-[10001]">
                        <SelectItem value="_none">Select</SelectItem>
                        {TYPE_OF_BUSINESS_OPTIONS.map((o) => {
                          const Icon = o.icon;
                          return (
                            <SelectItem key={o.value} value={o.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="size-4 shrink-0" />
                                {o.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-between rounded-lg border p-4">
                    <Label>Contact made</Label>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="edit-contact-made"
                        checked={editForm.contactMade ?? true}
                        onCheckedChange={(c) => setEditForm((f) => ({ ...f, contactMade: !!c }))}
                      />
                      <label htmlFor="edit-contact-made" className="text-sm cursor-pointer">
                        {editForm.contactMade ?? true ? 'Yes' : 'No'}
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-x-4 gap-y-1 text-muted-foreground text-sm sm:grid-cols-2">
                  <p><span className="font-medium text-foreground">Notes:</span> {visit.notes?.trim() || '-'}</p>
                  <p><span className="font-medium text-foreground">Resolution:</span> {visit.resolution?.trim() || '-'}</p>
                  <p><span className="font-medium text-foreground">Contact:</span> {visit.contactFullName?.trim() || '-'}</p>
                  <p><span className="font-medium text-foreground">Company:</span> {visit.companyName?.trim() || '-'}</p>
                  <p><span className="font-medium text-foreground">Method:</span> {visit.methodOfContact ? formatMethodOfContact(visit.methodOfContact) : '-'}</p>
                  <p><span className="font-medium text-foreground">Building type:</span> {visit.buildingType ? String(visit.buildingType).replace(/_/g, ' ') : '-'}</p>
                  <p><span className="font-medium text-foreground">Contact made:</span> {formatContactMade(visit.contactMade)}</p>
                  <p><span className="font-medium text-foreground">Business type:</span> {visit.businessType ? String(visit.businessType).replace(/_/g, ' ') : '-'}</p>
                  <p><span className="font-medium text-foreground">Person seen position:</span> {visit.personSeenPosition?.trim() || '-'}</p>
                  <p><span className="font-medium text-foreground">Cell:</span> {visit.contactCellPhone?.trim() ? (
                    <a href={buildTelUrl(visit.contactCellPhone)} className={VISITS_TABLE_LINK_CLASS} onClick={(e) => e.stopPropagation()}>{visit.contactCellPhone}</a>
                  ) : '-'}</p>
                  <p><span className="font-medium text-foreground">Landline:</span> {visit.contactLandline?.trim() ? (
                    <a href={buildTelUrl(visit.contactLandline)} className={VISITS_TABLE_LINK_CLASS} onClick={(e) => e.stopPropagation()}>{visit.contactLandline}</a>
                  ) : '-'}</p>
                  <p><span className="font-medium text-foreground">Contact email:</span> {visit.contactEmail?.trim() ? (
                    <a href={`mailto:${visit.contactEmail}`} target="_blank" rel="noopener noreferrer" className={VISITS_TABLE_LINK_CLASS} onClick={(e) => e.stopPropagation()}>{visit.contactEmail}</a>
                  ) : '-'}</p>
                  <p className="sm:col-span-2"><span className="font-medium text-foreground">Contact address:</span> {formatContactAddress(visit.contactAddress)}</p>
                  <p><span className="font-medium text-foreground">Meeting link:</span> {visit.meetingLink?.trim() ? (
                    <a href={visit.meetingLink} target="_blank" rel="noopener noreferrer" className={VISITS_TABLE_LINK_CLASS} onClick={(e) => e.stopPropagation()}>Open link</a>
                  ) : '-'}</p>
                  <p><span className="font-medium text-foreground">Follow-up:</span> {visit.followUp?.trim() || '-'}</p>
                  <p><span className="font-medium text-foreground">Quote number:</span> {visit.quotationNumber?.trim() || '-'}</p>
                  <p><span className="font-medium text-foreground">Quotation status:</span> {visit.quotationStatus ? String(visit.quotationStatus).replace(/_/g, ' ') : '-'}</p>
                  <p><span className="font-medium text-foreground">Value (ex-VAT):</span> {formatSalesValue(visit.salesValue, (visit as { salesCurrency?: string }).salesCurrency)}</p>
                  <p><span className="font-medium text-foreground">Lead:</span> {visit.lead?.name?.trim() || '-'}</p>
                  <p><span className="font-medium text-foreground">Client:</span> {visit.client?.name?.trim() || '-'}</p>
                  <p><span className="font-medium text-foreground">Branch:</span> {visit.branch?.name?.trim() || '-'}</p>
                </div>
              )}
            </div>
          </div>
          {isEditing && (
            <DialogFooter className="gap-3">
              <Button variant="cancel" onClick={handleCancelEdit} disabled={updateMutation.isPending}>
                Cancel
              </Button>
              <Button variant="success" onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2Icon className="size-4 animate-spin mr-2" />}
                Save
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
      {expandedImageUrl && (
        <Dialog open={!!expandedImageUrl} onOpenChange={() => setExpandedImageUrl(null)}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden">
            <img
              src={expandedImageUrl}
              alt="Expanded"
              className="w-full h-auto max-h-[90vh] object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
      <CreateLeadModal
        open={createLeadModalOpen}
        onOpenChange={setCreateLeadModalOpen}
        initialValues={leadInitialValues}
        onSuccess={(createdLead) => {
          if (createdLead?.uid && visit?.uid) {
            updateMutation
              .mutateAsync({ checkInId: visit.uid, leadUid: createdLead.uid })
              .then(() => {
                onVisitUpdated?.();
              })
              .catch((e) => {
                toast.error(e instanceof Error ? e.message : 'Failed to link lead to visit');
              });
          } else {
            onVisitUpdated?.();
          }
        }}
      />
    </>
  );
}

export interface VisitsTableProps {
  checkIns: VisitExportItem[];
  isLoading?: boolean;
  emptyMessage?: string;
  onVisitUpdated?: () => void;
}

export function VisitsTable({ checkIns, isLoading, emptyMessage = 'No visits yet. Start a visit to see it here.', onVisitUpdated }: VisitsTableProps) {
  const [selectedVisit, setSelectedVisit] = useState<VisitExportItem | null>(null);
  const [visitDetailOpen, setVisitDetailOpen] = useState(false);
  const [expandedOwnerKey, setExpandedOwnerKey] = useState<string | null>(null);

  const groupedByOwner = useMemo(() => groupCheckInsByOwner(checkIns), [checkIns]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2Icon className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (checkIns.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        {emptyMessage}
      </p>
    );
  }

  const salesPersonColumn = VISITS_DISPLAY_COLUMNS.find((col) => col.key === 'salesPerson')!;

  return (
    <>
      <div className="rounded border overflow-x-auto bg-white">
        <div className="divide-y divide-border">
          {groupedByOwner.map((group, index) => {
            const isExpanded = expandedOwnerKey === group.ownerKey;
            const contentId = `visits-${group.ownerKey}`;
            return (
              <div
                key={group.ownerKey}
                className={cn('rounded-sm', isExpanded && 'ring-1 ring-green-200')}
              >
                <Collapsible
                  open={isExpanded}
                  onOpenChange={(open) => setExpandedOwnerKey(open ? group.ownerKey : null)}
                >
                  <CollapsibleTrigger
                    asChild
                    className="w-full"
                    aria-expanded={isExpanded}
                    aria-controls={contentId}
                  >
                    <div
                      className={cn(
                        'flex items-center gap-4 px-4 py-3 text-left cursor-pointer hover:bg-muted/50 transition-colors border-0 rounded-none',
                        index % 2 === 1 ? 'bg-gray-50/80' : 'bg-white',
                        isExpanded && 'bg-muted/30'
                      )}
                    >
                    <span className="flex items-start gap-2 whitespace-normal min-w-0 flex-1">
                      {group.ownerKey === '__unknown__' ? (
                        <span className="text-muted-foreground font-medium">Unknown</span>
                      ) : (
                        salesPersonColumn.render(group.visits[0])
                      )}
                    </span>
                    <span className="text-sm text-muted-foreground shrink-0">
                      {group.visits.length} visit{group.visits.length !== 1 ? 's' : ''}
                    </span>
                    <ChevronRight
                      className={cn('size-5 shrink-0 text-muted-foreground transition-transform', isExpanded && 'rotate-90')}
                      aria-hidden
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent id={contentId} className="overflow-hidden">
                  <div className="bg-muted/20 border-t border-border overflow-x-auto">
                    <Table className="min-w-max">
                      <TableHeader>
                        <TableRow>
                          {VISITS_TABLE_COLUMNS.map((col) => (
                            <TableHead
                              key={col.key}
                              className={cn('whitespace-nowrap', visitsColumnWidthClass(col.width))}
                            >
                              {col.label}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody className="[&>tr:nth-child(odd)]:bg-gray-50/80">
                        {group.visits.map((c) => (
                          <TableRow
                            key={c.uid}
                            className="cursor-pointer hover:bg-muted/50 transition-colors border-b-0"
                            onClick={() => {
                              setSelectedVisit(c);
                              setVisitDetailOpen(true);
                            }}
                          >
                            {VISITS_TABLE_COLUMNS.map((col) => (
                              <TableCell
                                key={col.key}
                                className={cn(
                                  'text-sm whitespace-normal align-top min-w-0',
                                  visitsColumnWidthClass(col.width)
                                )}
                              >
                                {col.render(c)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
                </Collapsible>
              </div>
            );
          })}
        </div>
      </div>
      <VisitDetailDialog
        visit={selectedVisit}
        open={visitDetailOpen}
        onOpenChange={setVisitDetailOpen}
        onVisitUpdated={onVisitUpdated}
      />
    </>
  );
}

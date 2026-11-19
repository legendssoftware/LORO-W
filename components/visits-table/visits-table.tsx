'use client';

import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { ReactNode } from 'react';
import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import type { VisitExportItem } from '@/api/types/reports';
import type { UpdateVisitDetailsPayload } from '@/api/types/visits';
import { formatContactAddress } from '@/lib/utils/visits-export';
import { activityMethodLabel } from '@/lib/activity-channel';
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
import { getVisitBranchDisplayName, getVisitBranchUid } from '@/lib/utils/visits-export';
import {
  METHOD_OPTIONS,
  TYPE_OF_BUSINESS_OPTIONS,
  SITE_TYPE_OPTIONS,
  QUOTATION_STATUS_OPTIONS,
  PERSON_POSITION_OPTIONS,
  CURRENCY_OPTIONS,
} from '@/lib/visit-form-utils';
import { validateEditVisitFormChangedFields } from '@/lib/schemas/visit-schemas';
import { FORM_PLACEHOLDERS } from '@/lib/form-placeholders';
import {
  useUpdateVisitDetailsMutation,
  useUpdateCheckInPhotoMutation,
  useUpdateCheckOutPhotoMutation,
  useClientsInfinite,
  useApiClient,
} from '@/api/hooks';
import { uploadVisitFile } from '@/api/endpoints/docs';
import type { ClientListItem } from '@/api/endpoints/clients';
import { VisitDetailMediaSection } from '@/components/visits/visit-detail-media-section';

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
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DetailDialogCloseButton,
  DetailFieldRow,
  DetailSectionHeading,
  DETAIL_DIALOG_CONTENT_CLASS,
  DETAIL_FIELD_GRID_CLASS,
} from '@/components/detail-dialog/detail-dialog-primitives';
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
import {
  Pencil,
  UserPlus,
  ChevronRight,
  Users,
  Clock,
  LogIn,
  LogOut,
  Timer,
  MapPin,
  StickyNote,
  ClipboardList,
  User,
  Building2,
  Mail,
  Phone,
  Briefcase,
  CalendarClock,
  Link2,
  Hash,
  GitBranch,
  Target,
  Banknote,
  UserCircle,
  Smartphone,
  MessageSquare,
  UserCheck,
  Landmark,
} from 'lucide-react';
import { CalendarIcon, ChevronDownIcon, Loader2Icon } from '@/lib/icons';
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

function isImageUrl(url: string): boolean {
  if (!url.startsWith('http')) return false;
  return IMAGE_EXTENSIONS.test(url) || url.includes('image');
}

interface VisitsDisplayColumn {
  key: string;
  label: string;
  render: (c: VisitExportItem) => ReactNode;
  width?: VisitsColumnWidth;
}

function renderPhotoCell(url: string | null | undefined, translate: TFunction): ReactNode {
  if (!url?.trim()) return '-';
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('inline-flex items-center gap-0.5', VISITS_TABLE_LINK_CLASS)}
      onClick={(e) => e.stopPropagation()}
      title={translate('visitsTable.openInNewTab')}
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
        {translate('visitsTable.view')}
      </span>
    </a>
  );
}

export function buildVisitsDisplayColumns(t: TFunction): VisitsDisplayColumn[] {
  return [
  {
    key: 'salesPerson',
    label: t('visitsTable.columns.salesPerson'),
    render: (c) => {
      const o = c.owner;
      if (!o) return '-';
      const fullName = [o.name, o.surname].filter(Boolean).join(' ').trim() || '-';
      const imgSrc = o.photoURL ?? o.avatar ?? undefined;
      const branchName = getVisitBranchDisplayName(c);
      const roleLabel = formatRoleLabel(o.role);
      const metaTooltip = [
        o.phone ? t('visitsTable.phoneLine', { value: o.phone }) : '',
        branchName ? t('visitsTable.branchLine', { value: branchName }) : '',
        roleLabel ? t('visitsTable.roleLine', { value: roleLabel }) : '',
      ]
        .filter(Boolean)
        .join(' · ');
      return (
        <span
          className="flex items-start gap-2 whitespace-normal"
          title={metaTooltip || undefined}
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={imgSrc} alt={fullName} />
            <AvatarFallback className="text-xs">
              {fullName !== '-' ? fullName.slice(0, 2).toUpperCase() : '-'}
            </AvatarFallback>
          </Avatar>
          <span className="space-y-0.5 block min-w-0">
            <span className="block font-medium leading-tight">{fullName}</span>
            {o.email ? (
              <a
                href={`mailto:${o.email}`}
                className={cn('block text-xs truncate text-muted-foreground', VISITS_TABLE_LINK_CLASS)}
                title={o.email}
                onClick={(e) => e.stopPropagation()}
              >
                {o.email}
              </a>
            ) : (
              <span className="block text-xs text-muted-foreground">—</span>
            )}
          </span>
        </span>
      );
    },
  },
  {
    key: 'date',
    label: t('visitsTable.columns.date'),
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
    label: t('visitsTable.columns.location'),
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
              {t('visitsTable.inAddress', { address: inAddr })}
            </a>
          ) : (
            <span className="block truncate max-w-[12rem]" title={inAddr}>{t('visitsTable.inAddress', { address: inAddr })}</span>
          )}
          {outUrl && outUrl !== '#' ? (
            <a href={outUrl} target="_blank" rel="noopener noreferrer" className={locLinkClass} title={outAddr} onClick={(e) => e.stopPropagation()}>
              {t('visitsTable.outAddress', { address: outAddr })}
            </a>
          ) : (
            <span className="block truncate max-w-[12rem]" title={outAddr}>{t('visitsTable.outAddress', { address: outAddr })}</span>
          )}
        </span>
      );
    },
  },
  {
    key: 'method',
    label: t('visitsTable.columns.method'),
    width: 'quarter',
    render: (c) => activityMethodLabel(c),
  },
  {
    key: 'buildingType',
    label: t('visitsTable.columns.buildingType'),
    width: 'quarter',
    render: (c) => (c.buildingType ? String(c.buildingType).replace(/_/g, ' ') : '-'),
  },
  {
    key: 'contactMade',
    label: t('visitsTable.columns.contactMade'),
    width: 'quarter',
    render: (c) => {
      const value = formatContactMade(c.contactMade);
      if (value === 'Yes') return t('actions.yes');
      if (value === 'No') return t('actions.no');
      return value;
    },
  },
  {
    key: 'companyName',
    label: t('visitsTable.columns.companyName'),
    render: (c) => c.companyName?.trim() || '-',
  },
  {
    key: 'businessType',
    label: t('visitsTable.columns.businessType'),
    render: (c) => (c.businessType ? String(c.businessType).replace(/_/g, ' ') : '-'),
  },
  {
    key: 'personSeenPosition',
    label: t('visitsTable.columns.personSeenPosition'),
    render: (c) => c.personSeenPosition?.trim() || '-',
  },
  {
    key: 'contactFullName',
    label: t('visitsTable.columns.contactFullName'),
    render: (c) => c.contactFullName?.trim() || '-',
  },
  {
    key: 'contactImage',
    label: t('visitsTable.columns.contactImage'),
    render: (c) => {
      if (c.contactImage?.trim()) return renderPhotoCell(c.contactImage, t);
      const firstImageUrl = c.media?.find((u) => u?.startsWith('http') && isImageUrl(u));
      if (firstImageUrl) return renderPhotoCell(firstImageUrl, t);
      const firstUrl = c.media?.find((u) => u?.startsWith('http'));
      if (c.media?.length && firstUrl) {
        const label = c.media.length === 1 ? t('visitsTable.viewFile') : t('visitsTable.fileCount', { count: c.media.length });
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
      if (c.media?.length) return <span className="text-muted-foreground text-xs">{c.media.length === 1 ? t('visitsTable.fileCountOne', { count: c.media.length }) : t('visitsTable.fileCount', { count: c.media.length })}</span>;
      return '-';
    },
  },
  {
    key: 'contactCellPhone',
    label: t('visitsTable.columns.contactCellPhone'),
    render: (c) =>
      c.contactCellPhone?.trim() ? (
        <a href={buildTelUrl(c.contactCellPhone)} className={VISITS_TABLE_LINK_CLASS} onClick={(e) => e.stopPropagation()}>
          {c.contactCellPhone}
        </a>
      ) : '-',
  },
  {
    key: 'contactLandline',
    label: t('visitsTable.columns.contactLandline'),
    render: (c) =>
      c.contactLandline?.trim() ? (
        <a href={buildTelUrl(c.contactLandline)} className={VISITS_TABLE_LINK_CLASS} onClick={(e) => e.stopPropagation()}>
          {c.contactLandline}
        </a>
      ) : '-',
  },
  {
    key: 'contactEmail',
    label: t('visitsTable.columns.contactEmail'),
    render: (c) =>
      c.contactEmail?.trim() ? (
        <a href={`mailto:${c.contactEmail}`} target="_blank" rel="noopener noreferrer" className={VISITS_TABLE_LINK_CLASS} onClick={(e) => e.stopPropagation()}>
          {c.contactEmail}
        </a>
      ) : '-',
  },
  {
    key: 'contactAddress',
    label: t('visitsTable.columns.contactAddress'),
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
    label: t('visitsTable.columns.meetingLink'),
    render: (c) =>
      c.meetingLink?.trim() ? (
        <a href={c.meetingLink} target="_blank" rel="noopener noreferrer" className={VISITS_TABLE_LINK_CLASS} onClick={(e) => e.stopPropagation()}>
          {t('visitsTable.openLink')}
        </a>
      ) : '-',
  },
  {
    key: 'notes',
    label: t('visitsTable.columns.notes'),
    width: 'double',
    render: (c) => c.notes || '-',
  },
  {
    key: 'resolution',
    label: t('visitsTable.columns.resolution'),
    width: 'double',
    render: (c) => c.resolution?.trim() || '-',
  },
  {
    key: 'followUp',
    label: t('visitsTable.columns.followUp'),
    render: (c) => (c.followUp?.trim() || '-'),
  },
  {
    key: 'quoteNumber',
    label: t('visitsTable.columns.quoteNumber'),
    render: (c) => c.quotationNumber || '-',
  },
  {
    key: 'quotationStatus',
    label: t('visitsTable.columns.quotationStatus'),
    render: (c) => (c.quotationStatus ? String(c.quotationStatus).replace(/_/g, ' ') : '-'),
  },
  {
    key: 'value',
    label: t('visitsTable.columns.value'),
    render: (c) =>
      c.salesValue != null
        ? formatSalesValue(c.salesValue, (c as { salesCurrency?: string }).salesCurrency)
        : '-',
  },
  {
    key: 'lead',
    label: t('visitsTable.columns.lead'),
    render: (c) => c.lead?.name?.trim() || '-',
  },
  {
    key: 'client',
    label: t('visitsTable.columns.client'),
    render: (c) => c.client?.name?.trim() || '-',
  },
  {
    key: 'branch',
    label: t('visitsTable.columns.branch'),
    render: (c) => getVisitBranchDisplayName(c) || '-',
  },
  ];
}

export function buildVisitsTableColumns(t: TFunction): VisitsDisplayColumn[] {
  return buildVisitsDisplayColumns(t).filter((col) => col.key !== 'salesPerson');
}

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
export function groupCheckInsByOwner(checkIns: VisitExportItem[]): GroupedByOwner[] {
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
      const aRaw = a.createdAt ?? a.checkInTime;
      const bRaw = b.createdAt ?? b.checkInTime;
      const aTime = new Date(aRaw).getTime();
      const bTime = new Date(bRaw).getTime();
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
    branchUid: getVisitBranchUid(visit) ?? undefined,
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
  const { t } = useTranslation('screens');
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UpdateVisitDetailsPayload>>({});
  const [followUpPickerOpen, setFollowUpPickerOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientListItem | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [createLeadModalOpen, setCreateLeadModalOpen] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [checkInPhotoFile, setCheckInPhotoFile] = useState<File | null>(null);
  const [checkOutPhotoFile, setCheckOutPhotoFile] = useState<File | null>(null);
  const [checkInPhotoPreview, setCheckInPhotoPreview] = useState<string | null>(null);
  const [checkOutPhotoPreview, setCheckOutPhotoPreview] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const apiClient = useApiClient();
  const updateMutation = useUpdateVisitDetailsMutation();
  const updateCheckInPhotoMutation = useUpdateCheckInPhotoMutation();
  const updateCheckOutPhotoMutation = useUpdateCheckOutPhotoMutation();
  const isSaving =
    updateMutation.isPending ||
    isUploadingMedia ||
    updateCheckInPhotoMutation.isPending ||
    updateCheckOutPhotoMutation.isPending;
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

  function resetMediaEditState() {
    setMediaFiles([]);
    setCheckInPhotoFile(null);
    setCheckOutPhotoFile(null);
    setCheckInPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCheckOutPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setIsUploadingMedia(false);
  }

  useEffect(() => {
    if (!visit || !open) return;
    setEditForm(visitToEditForm(visit));
    setIsEditing(false);
    setFieldErrors({});
    resetMediaEditState();
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
    resetMediaEditState();
  };

  const handleSaveEdit = async () => {
    if (!visit) return;
    const original = visitToEditForm(visit);
    const hasPendingMedia = mediaFiles.length > 0;
    const hasProofPhotoChange = !!checkInPhotoFile || !!checkOutPhotoFile;
    const changedBeforeUpload = getChangedFields(original, editForm);
    if (
      Object.keys(changedBeforeUpload).length === 0 &&
      !hasPendingMedia &&
      !hasProofPhotoChange
    ) {
      toast.success(t('visitsTable.noChanges'));
      setIsEditing(false);
      resetMediaEditState();
      return;
    }
    const { fieldErrors: errs, firstMessage } = validateEditVisitFormChangedFields(
      changedBeforeUpload as Record<string, unknown>
    );
    if (firstMessage) {
      setFieldErrors(errs);
      toast.error(firstMessage);
      return;
    }
    try {
      setIsUploadingMedia(true);
      const nextMedia = [...(editForm.media ?? [])];
      for (const file of mediaFiles) {
        nextMedia.push(await uploadVisitFile(apiClient, file));
      }
      if (checkInPhotoFile) {
        const photoUrl = await uploadVisitFile(apiClient, checkInPhotoFile);
        await updateCheckInPhotoMutation.mutateAsync({ checkInId: visit.uid, photoUrl });
      }
      if (checkOutPhotoFile) {
        const photoUrl = await uploadVisitFile(apiClient, checkOutPhotoFile);
        await updateCheckOutPhotoMutation.mutateAsync({ checkInId: visit.uid, photoUrl });
      }
      const changed = getChangedFields(original, { ...editForm, media: nextMedia });
      if (Object.keys(changed).length > 0) {
        const payload: UpdateVisitDetailsPayload = {
          checkInId: visit.uid,
          ...changed,
        };
        await updateMutation.mutateAsync(payload);
      }
      toast.success(t('visitsTable.visitUpdated'));
      setIsEditing(false);
      setFieldErrors({});
      resetMediaEditState();
      onVisitUpdated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('visitsTable.failedToUpdate'));
    } finally {
      setIsUploadingMedia(false);
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
          className={DETAIL_DIALOG_CONTENT_CLASS}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            {isEndedVisit && !isEditing && (
              <>
                {!visit.lead?.uid && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 rounded-full border-green-600 text-green-700 hover:bg-green-50 hover:text-green-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCreateLeadModalOpen(true);
                    }}
                  >
                    <UserPlus className="size-4" />{t('visitsTable.convertToLead')}</Button>
                )}
                <Button
                  size="sm"
                  className="gap-1.5 rounded-full bg-purple-600 text-white hover:bg-purple-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                >
                  <Pencil className="size-4" />{t('actions.edit')}</Button>
              </>
            )}
            <DetailDialogCloseButton />
          </div>
          <DialogHeader className="pr-24">
            <DialogTitle>{t('visitsTable.visitDetails', { uid: visit.uid })}</DialogTitle>
            <DialogDescription>
              {ownerFullName} · {format(new Date(visit.checkInTime), 'MMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <DetailSectionHeading title={t('visitsTable.timing')} icon={Clock} />
              <dl className={DETAIL_FIELD_GRID_CLASS}>
                <DetailFieldRow
                  label={t('visitsTable.checkIn')}
                  icon={LogIn}
                  value={format(new Date(visit.checkInTime), 'MMM d, yyyy – h:mm a')}
                />
                <DetailFieldRow
                  label={t('visitsTable.checkOut')}
                  icon={LogOut}
                  value={
                    visit.checkOutTime
                      ? format(new Date(visit.checkOutTime), 'MMM d, yyyy – h:mm a')
                      : '-'
                  }
                />
                <DetailFieldRow
                  label={t('visitsTable.duration')}
                  icon={Timer}
                  value={
                    visit.duration ? normalizeDurationDisplay(visit.duration) : '-'
                  }
                />
              </dl>
            </div>
            <Separator />
            <div>
              <DetailSectionHeading title={t('visitsTable.location')} icon={MapPin} />
              <dl className={DETAIL_FIELD_GRID_CLASS}>
                <DetailFieldRow
                  label={t('visitsTable.in')}
                  icon={MapPin}
                  value={
                    inAddr !== '#' ? (
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
                    )
                  }
                />
                <DetailFieldRow
                  label={t('visitsTable.out')}
                  icon={MapPin}
                  value={
                    visit.checkOutLocation || outAddr !== '-'
                      ? outAddr !== '-' && outAddr !== '#'
                        ? (
                            <a
                              href={buildMapsUrl(visit.checkOutLocation || outAddr)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={VISITS_TABLE_LINK_CLASS}
                            >
                              {outAddr}
                            </a>
                          )
                        : (
                            outAddr
                          )
                      : '-'
                  }
                />
              </dl>
            </div>
            <Separator />
            <VisitDetailMediaSection
              visit={visit}
              isEditing={isEditing}
              canEdit={isEndedVisit}
              mediaFiles={mediaFiles}
              mediaUrls={editForm.media ?? []}
              onFilesAdd={(added) => setMediaFiles((prev) => [...prev, ...added])}
              onFileRemove={(index) => setMediaFiles((prev) => prev.filter((_, i) => i !== index))}
              onUrlAdd={(url) =>
                setEditForm((f) => ({ ...f, media: [...(f.media ?? []), url] }))
              }
              onUrlRemove={(index) =>
                setEditForm((f) => ({
                  ...f,
                  media: (f.media ?? []).filter((_, i) => i !== index),
                }))
              }
              checkInPhotoPreview={checkInPhotoPreview}
              checkOutPhotoPreview={checkOutPhotoPreview}
              onCheckInPhotoSelect={(file) => {
                setCheckInPhotoFile(file);
                setCheckInPhotoPreview((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return URL.createObjectURL(file);
                });
              }}
              onCheckOutPhotoSelect={(file) => {
                setCheckOutPhotoFile(file);
                setCheckOutPhotoPreview((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return URL.createObjectURL(file);
                });
              }}
              onCheckInPhotoClear={() => {
                setCheckInPhotoFile(null);
                setCheckInPhotoPreview((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return null;
                });
              }}
              onCheckOutPhotoClear={() => {
                setCheckOutPhotoFile(null);
                setCheckOutPhotoPreview((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return null;
                });
              }}
              onExpandImage={(url) => setExpandedImageUrl(url)}
              disabled={isSaving}
            />
            <Separator />
            <div>
              <DetailSectionHeading title={t('visitsTable.details')} icon={ClipboardList} />
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
                          <SelectValue placeholder={t('visitsTable.noClient')} />
                        </span>
                      </SelectTrigger>
                      <SelectContent className="z-[10001] max-h-[min(320px,50vh)]" position="popper">
                        <SelectItem value="_none">{t('visitsTable.noClient')}</SelectItem>
                        {clientsInfinite.isLoading && (
                          <SelectItem value="_loading" disabled className="pointer-events-none">{t('actions.loading')}</SelectItem>
                        )}
                        {clientsList.length === 0 && !clientsInfinite.isLoading && (
                          <SelectItem value="_empty" disabled className="pointer-events-none">{t('visitsTable.noClientsFound')}</SelectItem>
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
                                t('actions.loadMore')
                              )}
                            </Button>
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>{t('visitsTable.notes')}</Label>
                    <Textarea
                      value={editForm.notes ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                      maxLength={NOTES_MAX_LENGTH}
                      rows={4}
                      className="resize-y"
                      placeholder={t('visitsTable.addNotes')}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('visitsTable.wordCount', { count: getWordCount(editForm.notes).toLocaleString(), max: NOTES_MAX_WORDS.toLocaleString() })}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>{t('visitsTable.resolution')}</Label>
                    <Textarea
                      value={editForm.resolution ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, resolution: e.target.value }))}
                      maxLength={NOTES_MAX_LENGTH}
                      rows={10}
                      className="min-h-[200px] resize-y"
                      placeholder={t('visitsTable.outcome')}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('visitsTable.wordCount', { count: getWordCount(editForm.resolution).toLocaleString(), max: NOTES_MAX_WORDS.toLocaleString() })}
                    </p>
                  </div>
                  <div>
                    <Label>{t('visitsTable.contactName')}</Label>
                    <Input
                      value={editForm.contactFullName ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, contactFullName: e.target.value }))}
                      placeholder={t('visitsTable.personContacted')}
                    />
                  </div>
                  <div>
                    <Label>{t('visitsTable.company')}</Label>
                    <Input
                      value={editForm.companyName ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, companyName: e.target.value }))}
                      placeholder={t('visitsTable.company')}
                    />
                  </div>
                  <div>
                    <Label>{t('visitsTable.cell')}</Label>
                    <Input
                      value={editForm.contactCellPhone ?? ''}
                      onChange={(e) => {
                        setEditForm((f) => ({ ...f, contactCellPhone: e.target.value }));
                        if (fieldErrors.contactCellPhone) setFieldErrors((prev) => ({ ...prev, contactCellPhone: '' }));
                      }}
                      aria-invalid={!!fieldErrors.contactCellPhone}
                      className={fieldErrors.contactCellPhone ? 'border-destructive' : ''}
                      placeholder={FORM_PLACEHOLDERS.phone}
                    />
                    {fieldErrors.contactCellPhone && (
                      <p className="text-xs text-destructive mt-1">{fieldErrors.contactCellPhone}</p>
                    )}
                  </div>
                  <div>
                    <Label>{t('visitsTable.landline')}</Label>
                    <Input
                      value={editForm.contactLandline ?? ''}
                      onChange={(e) => {
                        setEditForm((f) => ({ ...f, contactLandline: e.target.value }));
                        if (fieldErrors.contactLandline) setFieldErrors((prev) => ({ ...prev, contactLandline: '' }));
                      }}
                      aria-invalid={!!fieldErrors.contactLandline}
                      className={fieldErrors.contactLandline ? 'border-destructive' : ''}
                      placeholder={FORM_PLACEHOLDERS.landline}
                    />
                    {fieldErrors.contactLandline && (
                      <p className="text-xs text-destructive mt-1">{fieldErrors.contactLandline}</p>
                    )}
                  </div>
                  <div>
                    <Label>{t('visitsTable.contactEmail')}</Label>
                    <Input
                      type="email"
                      value={editForm.contactEmail ?? ''}
                      onChange={(e) => {
                        setEditForm((f) => ({ ...f, contactEmail: e.target.value }));
                        if (fieldErrors.contactEmail) setFieldErrors((prev) => ({ ...prev, contactEmail: '' }));
                      }}
                      aria-invalid={!!fieldErrors.contactEmail}
                      className={fieldErrors.contactEmail ? 'border-destructive' : ''}
                      placeholder={FORM_PLACEHOLDERS.email}
                    />
                    {fieldErrors.contactEmail && (
                      <p className="text-xs text-destructive mt-1">{fieldErrors.contactEmail}</p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <Label>{t('visitsTable.address')}</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                      <Input
                        placeholder={t('visitsTable.street')}
                        value={editForm.contactAddress?.street ?? ''}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            contactAddress: { ...f.contactAddress, street: e.target.value },
                          }))
                        }
                      />
                      <Input
                        placeholder={t('visitsTable.suburb')}
                        value={editForm.contactAddress?.suburb ?? ''}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            contactAddress: { ...f.contactAddress, suburb: e.target.value },
                          }))
                        }
                      />
                      <Input
                        placeholder={t('visitsTable.city')}
                        value={editForm.contactAddress?.city ?? ''}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            contactAddress: { ...f.contactAddress, city: e.target.value },
                          }))
                        }
                      />
                      <Input
                        placeholder={t('visitsTable.province')}
                        value={editForm.contactAddress?.state ?? ''}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            contactAddress: { ...f.contactAddress, state: e.target.value, province: e.target.value },
                          }))
                        }
                      />
                      <Input
                        placeholder={t('visitsTable.country')}
                        value={editForm.contactAddress?.country ?? ''}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            contactAddress: { ...f.contactAddress, country: e.target.value },
                          }))
                        }
                      />
                      <Input
                        placeholder={t('visitsTable.postalCode')}
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
                    <Label>{t('visitsTable.personSeenPosition')}</Label>
                    <Select
                      value={editForm.personSeenPosition ?? '_none'}
                      onValueChange={(v) => setEditForm((f) => ({ ...f, personSeenPosition: v === '_none' ? undefined : v }))}
                    >
                      <SelectTrigger><SelectValue placeholder={t('visitsTable.select')} /></SelectTrigger>
                      <SelectContent className="z-[10001]">
                        <SelectItem value="_none">{t('visitsTable.select')}</SelectItem>
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
                    <Label>{t('visitsTable.followUp')}</Label>
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
                    <Label>{t('visitsTable.quotationNumber')}</Label>
                    <Input
                      value={editForm.quotationNumber ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, quotationNumber: e.target.value }))}
                      placeholder={t('visitsTable.optional')}
                    />
                  </div>
                  <div>
                    <Label>{t('visitsTable.quotationStatus')}</Label>
                    <Select
                      value={editForm.quotationStatus ?? '_none'}
                      onValueChange={(v) => setEditForm((f) => ({ ...f, quotationStatus: v === '_none' ? undefined : v }))}
                    >
                      <SelectTrigger><SelectValue placeholder={t('visitsTable.select')} /></SelectTrigger>
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
                    <Label>{t('visitsTable.salesValue')}</Label>
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
                        placeholder={FORM_PLACEHOLDERS.zero}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>{t('visitsTable.methodOfContact')}</Label>
                    <Select
                      value={editForm.methodOfContact ?? '_none'}
                      onValueChange={(v) => setEditForm((f) => ({ ...f, methodOfContact: v === '_none' ? undefined : v }))}
                    >
                      <SelectTrigger><SelectValue placeholder={t('visitsTable.select')} /></SelectTrigger>
                      <SelectContent className="z-[10001]">
                        <SelectItem value="_none">{t('visitsTable.select')}</SelectItem>
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
                    <Label>{t('visitsTable.meetingLink')}</Label>
                    <Input
                      value={editForm.meetingLink ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, meetingLink: e.target.value }))}
                      placeholder={FORM_PLACEHOLDERS.website}
                    />
                  </div>
                  <div>
                    <Label>{t('visitsTable.buildingType')}</Label>
                    <Select
                      value={editForm.buildingType ?? '_none'}
                      onValueChange={(v) => setEditForm((f) => ({ ...f, buildingType: v === '_none' ? undefined : v }))}
                    >
                      <SelectTrigger><SelectValue placeholder={t('visitsTable.select')} /></SelectTrigger>
                      <SelectContent className="z-[10001]">
                        <SelectItem value="_none">{t('visitsTable.select')}</SelectItem>
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
                    <Label>{t('visitsTable.businessType')}</Label>
                    <Select
                      value={editForm.businessType ?? '_none'}
                      onValueChange={(v) => setEditForm((f) => ({ ...f, businessType: v === '_none' ? undefined : v }))}
                    >
                      <SelectTrigger><SelectValue placeholder={t('visitsTable.select')} /></SelectTrigger>
                      <SelectContent className="z-[10001]">
                        <SelectItem value="_none">{t('visitsTable.select')}</SelectItem>
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
                    <Label>{t('visitsTable.contactMade')}</Label>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="edit-contact-made"
                        checked={editForm.contactMade ?? true}
                        onCheckedChange={(c) => setEditForm((f) => ({ ...f, contactMade: !!c }))}
                      />
                      <label htmlFor="edit-contact-made" className="text-sm cursor-pointer">
                        {editForm.contactMade ?? true ? t('actions.yes') : t('actions.no')}
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <dl className={DETAIL_FIELD_GRID_CLASS}>
                  <DetailFieldRow label={t('visitsTable.notes')} icon={StickyNote} value={visit.notes?.trim() || '-'} />
                  <DetailFieldRow label={t('visitsTable.resolution')} icon={ClipboardList} value={visit.resolution?.trim() || '-'} />
                  <DetailFieldRow label={t('visitsTable.contact')} icon={User} value={visit.contactFullName?.trim() || '-'} />
                  <DetailFieldRow label={t('visitsTable.company')} icon={Building2} value={visit.companyName?.trim() || '-'} />
                  <DetailFieldRow
                    label={t('visitsTable.method')}
                    icon={MessageSquare}
                    value={activityMethodLabel(visit)}
                  />
                  <DetailFieldRow
                    label={t('visitsTable.buildingType')}
                    icon={Landmark}
                    value={visit.buildingType ? String(visit.buildingType).replace(/_/g, ' ') : '-'}
                  />
                  <DetailFieldRow label={t('visitsTable.contactMade')} icon={UserCheck} value={(() => { const value = formatContactMade(visit.contactMade); if (value === 'Yes') return t('actions.yes'); if (value === 'No') return t('actions.no'); return value; })()} />
                  <DetailFieldRow
                    label={t('visitsTable.businessType')}
                    icon={Briefcase}
                    value={visit.businessType ? String(visit.businessType).replace(/_/g, ' ') : '-'}
                  />
                  <DetailFieldRow
                    label={t('visitsTable.personSeenPosition')}
                    icon={UserCircle}
                    value={visit.personSeenPosition?.trim() || '-'}
                  />
                  <DetailFieldRow
                    label={t('visitsTable.cell')}
                    icon={Smartphone}
                    value={
                      visit.contactCellPhone?.trim() ? (
                        <a href={buildTelUrl(visit.contactCellPhone)} className={VISITS_TABLE_LINK_CLASS} onClick={(e) => e.stopPropagation()}>{visit.contactCellPhone}</a>
                      ) : (
                        '-'
                      )
                    }
                  />
                  <DetailFieldRow
                    label={t('visitsTable.landline')}
                    icon={Phone}
                    value={
                      visit.contactLandline?.trim() ? (
                        <a href={buildTelUrl(visit.contactLandline)} className={VISITS_TABLE_LINK_CLASS} onClick={(e) => e.stopPropagation()}>{visit.contactLandline}</a>
                      ) : (
                        '-'
                      )
                    }
                  />
                  <DetailFieldRow
                    label={t('visitsTable.contactEmail')}
                    icon={Mail}
                    value={
                      visit.contactEmail?.trim() ? (
                        <a href={`mailto:${visit.contactEmail}`} target="_blank" rel="noopener noreferrer" className={VISITS_TABLE_LINK_CLASS} onClick={(e) => e.stopPropagation()}>{visit.contactEmail}</a>
                      ) : (
                        '-'
                      )
                    }
                  />
                  <DetailFieldRow
                    label={t('visitsTable.contactAddress')}
                    icon={MapPin}
                    value={formatContactAddress(visit.contactAddress)}
                  />
                  <DetailFieldRow
                    label={t('visitsTable.meetingLink')}
                    icon={Link2}
                    value={
                      visit.meetingLink?.trim() ? (
                        <a href={visit.meetingLink} target="_blank" rel="noopener noreferrer" className={VISITS_TABLE_LINK_CLASS} onClick={(e) => e.stopPropagation()}>{t('visitsTable.openLink')}</a>
                      ) : (
                        '-'
                      )
                    }
                  />
                  <DetailFieldRow label={t('visitsTable.followUp')} icon={CalendarClock} value={visit.followUp?.trim() || '-'} />
                  {visit.followUp?.trim() ? (
                    <p className="text-xs text-muted-foreground -mt-1">
                      {t('visitsTable.followUpHint')}
                    </p>
                  ) : null}
                  <DetailFieldRow label={t('visitsTable.quoteNumber')} icon={Hash} value={visit.quotationNumber?.trim() || '-'} />
                  <DetailFieldRow
                    label={t('visitsTable.quotationStatus')}
                    icon={ClipboardList}
                    value={visit.quotationStatus ? String(visit.quotationStatus).replace(/_/g, ' ') : '-'}
                  />
                  <DetailFieldRow
                    label={t('visitsTable.valueExVat')}
                    icon={Banknote}
                    value={formatSalesValue(visit.salesValue, (visit as { salesCurrency?: string }).salesCurrency)}
                  />
                  <DetailFieldRow label={t('visitsTable.lead')} icon={Target} value={visit.lead?.name?.trim() || '-'} />
                  <DetailFieldRow label={t('visitsTable.client')} icon={Users} value={visit.client?.name?.trim() || '-'} />
                  <DetailFieldRow label={t('visitsTable.branch')} icon={GitBranch} value={getVisitBranchDisplayName(visit) || '-'} />
                </dl>
              )}
            </div>
          </div>
          {isEditing && (
            <DialogFooter className="gap-3">
              <Button
                variant="cancel"
                className="rounded-full"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >{t('actions.cancel')}</Button>
              <Button
                variant="success"
                className="rounded-full"
                onClick={handleSaveEdit}
                disabled={isSaving}
              >
                {isSaving && <Loader2Icon className="size-4 animate-spin mr-2" />}
                {t('actions.save')}
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
              alt={t('visitsTable.expanded')}
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
                toast.error(e instanceof Error ? e.message : t('visitsTable.failedToLinkLead'));
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

export function VisitsTable({ checkIns, isLoading, emptyMessage, onVisitUpdated }: VisitsTableProps) {
  const { t } = useTranslation('screens');
  const [selectedVisit, setSelectedVisit] = useState<VisitExportItem | null>(null);
  const [visitDetailOpen, setVisitDetailOpen] = useState(false);
  const [expandedOwnerKey, setExpandedOwnerKey] = useState<string | null>(null);

  const displayColumns = useMemo(() => buildVisitsDisplayColumns(t), [t]);
  const tableColumns = useMemo(
    () => displayColumns.filter((col) => col.key !== 'salesPerson'),
    [displayColumns],
  );
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
        {emptyMessage ?? t('visitsTable.emptyDefault')}
      </p>
    );
  }

  const salesPersonColumn = displayColumns.find((col) => col.key === 'salesPerson')!;

  return (
    <>
      <div className="overflow-x-auto bg-card p-1.5">
        <div className="flex flex-col gap-1.5">
          {groupedByOwner.map((group, index) => {
            const isExpanded = expandedOwnerKey === group.ownerKey;
            const contentId = `visits-${group.ownerKey}`;
            return (
              <div
                key={group.ownerKey}
                className={cn(
                  'overflow-hidden rounded-lg border border-border bg-card/50',
                  isExpanded && 'ring-1 ring-green-200'
                )}
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
                        'flex cursor-pointer items-center gap-4 rounded-none border-0 px-2.5 py-2 text-left transition-colors hover:bg-muted/50 sm:px-3',
                        isExpanded && 'bg-muted/30'
                      )}
                    >
                    <span className="flex items-start gap-2 whitespace-normal min-w-0 flex-1">
                      {group.ownerKey === '__unknown__' ? (
                        <span className="text-muted-foreground font-medium">{t('visitsTable.unknown')}</span>
                      ) : (
                        salesPersonColumn.render(group.visits[0])
                      )}
                    </span>
                    <span className="text-sm text-muted-foreground shrink-0">
                      {group.visits.length === 1 ? t('visitsTable.visitCountOne', { count: group.visits.length }) : t('visitsTable.visitCount', { count: group.visits.length })}
                    </span>
                    <ChevronRight
                      className={cn('size-5 shrink-0 text-muted-foreground transition-transform', isExpanded && 'rotate-90')}
                      aria-hidden
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent id={contentId} className="overflow-hidden">
                  <div className="bg-muted/20 border-t border-border overflow-x-auto">
                    <Table className="min-w-max border-separate border-spacing-y-1">
                      <TableHeader>
                        <TableRow>
                          {tableColumns.map((col) => (
                            <TableHead
                              key={col.key}
                              className={cn(
                                'whitespace-nowrap py-2',
                                visitsColumnWidthClass(col.width)
                              )}
                            >
                              {col.label}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.visits.map((c) => (
                          <TableRow
                            key={c.uid}
                            className="cursor-pointer border-b-0 bg-transparent transition-colors hover:bg-muted/50"
                            onClick={() => {
                              setSelectedVisit(c);
                              setVisitDetailOpen(true);
                            }}
                          >
                            {tableColumns.map((col) => (
                              <TableCell
                                key={col.key}
                                className={cn(
                                  'min-w-0 whitespace-normal py-2 align-top text-sm',
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

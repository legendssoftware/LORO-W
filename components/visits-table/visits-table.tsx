'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { format } from 'date-fns';
import type { VisitExportItem } from '@/api/types/reports';
import {
  formatContactAddress,
  formatMethodOfContact,
} from '@/lib/utils/visits-export';
import {
  buildMapsUrl,
  buildTelUrl,
  formatAddressForDisplay,
  formatContactMade,
  normalizeDurationDisplay,
  visitsColumnWidthClass,
  VISITS_TABLE_LINK_CLASS,
  type VisitsColumnWidth,
} from './visits-table-utils';

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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Loader2Icon } from '@/lib/icons';
import { cn } from '@/lib/utils';

const VISIT_IMAGE_FALLBACK_URL =
  'https://images.pexels.com/photos/163194/old-retro-antique-vintage-163194.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';

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

const VISITS_DISPLAY_COLUMNS: VisitsDisplayColumn[] = [
  {
    key: 'salesPerson',
    label: 'Sales Person',
    render: (c) => {
      const o = c.owner;
      if (!o) return '-';
      const fullName = [o.name, o.surname].filter(Boolean).join(' ').trim() || '-';
      const imgSrc = o.photoURL ?? o.avatar ?? undefined;
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
            {o.phone && (
              <a
                href={buildTelUrl(o.phone)}
                className={cn('block text-xs', VISITS_TABLE_LINK_CLASS)}
                onClick={(e) => e.stopPropagation()}
              >
                {o.phone}
              </a>
            )}
            {!o.email && !o.phone && (
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
    label: 'Method',
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
      const first = c.media?.[0];
      if (first?.startsWith('http')) return renderPhotoCell(first);
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
        ? `R ${Number(c.salesValue).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

function VisitDetailDialog({
  visit,
  open,
  onOpenChange,
}: {
  visit: VisitExportItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
  if (!visit) return null;
  const ownerFullName = visit.owner ? [visit.owner.name, visit.owner.surname].filter(Boolean).join(' ').trim() : '-';
  const inAddr = formatAddressForDisplay(visit.fullAddress, visit.checkInLocation || '-');
  const outAddr = formatAddressForDisplay(visit.checkOutFullAddress, visit.checkOutLocation || '-');
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-w-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
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
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {visit.media.map((item, i) => (
                      <li key={i}>
                        {item.startsWith('http') ? (
                          <a
                            href={item}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={VISITS_TABLE_LINK_CLASS}
                            onClick={(e) => e.stopPropagation()}
                          >
                            View file
                          </a>
                        ) : (
                          <span>{item}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : null}
            <div>
              <h4 className="font-semibold mb-2">Details</h4>
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
                <p><span className="font-medium text-foreground">Value (ex-VAT):</span> {visit.salesValue != null ? `R ${Number(visit.salesValue).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</p>
                <p><span className="font-medium text-foreground">Lead:</span> {visit.lead?.name?.trim() || '-'}</p>
                <p><span className="font-medium text-foreground">Client:</span> {visit.client?.name?.trim() || '-'}</p>
                <p><span className="font-medium text-foreground">Branch:</span> {visit.branch?.name?.trim() || '-'}</p>
              </div>
            </div>
          </div>
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
    </>
  );
}

export interface VisitsTableProps {
  checkIns: VisitExportItem[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export function VisitsTable({ checkIns, isLoading, emptyMessage = 'No visits yet. Start a visit to see it here.' }: VisitsTableProps) {
  const [selectedVisit, setSelectedVisit] = useState<VisitExportItem | null>(null);
  const [visitDetailOpen, setVisitDetailOpen] = useState(false);

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

  return (
    <>
      <div className="rounded border overflow-x-auto">
        <Table className="min-w-max">
          <TableHeader>
            <TableRow>
              {VISITS_DISPLAY_COLUMNS.map((col) => (
                <TableHead key={col.key} className={cn('whitespace-nowrap', visitsColumnWidthClass(col.width))}>
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {checkIns.map((c) => (
              <TableRow
                key={c.uid}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  setSelectedVisit(c);
                  setVisitDetailOpen(true);
                }}
              >
                {VISITS_DISPLAY_COLUMNS.map((col) => (
                  <TableCell
                    key={col.key}
                    className={cn('text-sm whitespace-normal align-top min-w-0', visitsColumnWidthClass(col.width))}
                  >
                    {col.render(c)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <VisitDetailDialog
        visit={selectedVisit}
        open={visitDetailOpen}
        onOpenChange={setVisitDetailOpen}
      />
    </>
  );
}

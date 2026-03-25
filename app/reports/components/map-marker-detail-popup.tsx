'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  Briefcase,
  ClipboardList,
  Clock,
  MapPin,
  Timer,
  User,
} from 'lucide-react';
import type { MapMarkerBase } from '@/api/types/map';
import { markerTypeLabel } from './map-report-constants';

const SKIP_TOP_LEVEL = new Set([
  'position',
  'latitude',
  'longitude',
  'markerType',
  'id',
  'name',
]);

const SECTION_TITLES: Record<string, string> = {
  leadData: 'Lead',
  attendanceData: 'Attendance',
  checkInData: 'Check-in',
  taskData: 'Task',
  claimData: 'Claim',
  journalData: 'Journal',
  location: 'Location',
  owner: 'Owner',
  client: 'Client',
  creator: 'Creator',
  geofencing: 'Geofencing',
  schedule: 'Schedule',
  activity: 'Activity',
};

const MAX_DEPTH = 4;
const MAX_STRING = 400;

/** Hide internal ids and avatar/photo URL fields in nested data. */
function shouldHideKey(key: string): boolean {
  const k = key.toLowerCase();
  if (k === 'uid') return true;
  if (k === 'photourl') return true;
  if (k.includes('photo') && k.includes('url')) return true;
  return false;
}

function shouldHideKeyStrict(key: string): boolean {
  if (shouldHideKey(key)) return true;
  const k = key.toLowerCase();
  if (k === 'image' || k === 'avatar') return true;
  return false;
}

function isIsoDateString(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s);
}

function formatDateish(v: unknown): string {
  if (v == null || v === '') return '—';
  if (typeof v === 'string' && isIsoDateString(v)) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString();
  }
  return formatPrimitive(v);
}

function formatPrimitive(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  if (typeof v === 'string') {
    if (isIsoDateString(v)) {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return d.toLocaleString();
    }
    return v.length > MAX_STRING ? `${v.slice(0, MAX_STRING)}…` : v;
  }
  return String(v);
}

function renderValue(v: unknown, depth: number, strict = false): ReactNode {
  const hide = strict ? shouldHideKeyStrict : shouldHideKey;
  if (v == null) return null;
  if (depth > MAX_DEPTH) {
    return (
      <pre className="text-[10px] whitespace-pre-wrap break-all max-h-24 overflow-auto rounded bg-muted/50 p-1 mt-1">
        {typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}
      </pre>
    );
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return null;
    return (
      <ul className="list-disc pl-4 text-xs space-y-0.5 mt-1">
        {v.slice(0, 50).map((item, i) => (
          <li key={i}>
            {typeof item === 'object' && item != null
              ? renderValue(item, depth + 1, strict)
              : formatPrimitive(item)}
          </li>
        ))}
        {v.length > 50 ? <li className="text-muted-foreground">…</li> : null}
      </ul>
    );
  }
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const keys = Object.keys(o).filter(
      (k) => !hide(k) && o[k] != null && o[k] !== ''
    );
    if (keys.length === 0) return null;
    return (
      <dl className="grid gap-x-2 gap-y-1 text-xs border-l pl-2 ml-0.5 border-border/80 mt-1">
        {keys.map((k) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground col-span-1 shrink-0 capitalize">{humanKey(k)}</dt>
            <dd className="min-w-0 break-words">{renderValue(o[k], depth + 1, strict)}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return <span className="text-xs break-words">{formatPrimitive(v)}</span>;
}

function humanKey(k: string): string {
  return k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
}

function sectionShell(children: ReactNode) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 px-2.5 py-2">{children}</div>
  );
}

function sectionHeading(label: string, Icon?: LucideIcon) {
  return (
    <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1.5">
      {Icon ? (
        <Icon className="size-3.5 shrink-0 opacity-80" strokeWidth={2} aria-hidden focusable={false} />
      ) : null}
      <span>{label}</span>
    </h4>
  );
}

/** Definition-list label with leading icon (times, duration, location, etc.). */
function DtIcon({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <dt className="text-muted-foreground shrink-0">
      <span className="inline-flex items-center gap-1.5">
        <Icon className="size-3.5 shrink-0 text-muted-foreground/90" strokeWidth={2} aria-hidden focusable={false} />
        {children}
      </span>
    </dt>
  );
}

function iconForSectionLabel(label: string): LucideIcon | undefined {
  const key = label.toLowerCase();
  if (key === 'user' || key === 'owner' || key === 'creator') return User;
  if (key === 'branch' || key === 'client') return Building2;
  if (key === 'location') return MapPin;
  if (key === 'check-in') return ClipboardList;
  if (key === 'attendance') return Clock;
  if (key === 'shift') return Clock;
  if (key === 'lead') return Briefcase;
  if (key === 'details') return ClipboardList;
  if (key === 'task' || key === 'journal' || key === 'claim') return ClipboardList;
  if (key === 'geofencing') return MapPin;
  if (key === 'schedule' || key === 'activity') return Timer;
  return undefined;
}

function readAttendance(marker: MapMarkerBase): Record<string, unknown> | undefined {
  const ad = marker.attendanceData;
  if (ad && typeof ad === 'object' && !Array.isArray(ad)) return ad as Record<string, unknown>;
  return undefined;
}

/** Prefer ERP alias over legal name (matches API BranchService.getDisplayName / map payload). */
function branchDisplayLabel(branch: { alias?: unknown; name?: unknown } | null | undefined): string | undefined {
  if (!branch || typeof branch !== 'object') return undefined;
  const alias = branch.alias;
  if (typeof alias === 'string' && alias.trim()) return alias.trim();
  const name = branch.name;
  if (typeof name === 'string' && name.trim()) return name.trim();
  return undefined;
}

function readBranchName(marker: MapMarkerBase): string | undefined {
  const ad = readAttendance(marker);
  return branchDisplayLabel(ad?.branch as { alias?: unknown; name?: unknown } | null | undefined);
}

function CheckInVisitPopupBody({ marker }: { marker: MapMarkerBase }) {
  const ci = marker.checkInData as
    | {
        checkInTime?: unknown;
        checkOutTime?: unknown;
        duration?: unknown;
        checkInAddressDisplay?: string;
        checkOutAddressDisplay?: string;
        branch?: { uid?: number; name?: string; alias?: string | null } | null;
      }
    | undefined;
  const owner = marker.owner as { name?: string; surname?: string } | undefined;
  const ownerName = owner
    ? [owner.name, owner.surname].filter(Boolean).join(' ').trim() || '—'
    : '—';

  const checkInAddr = ci?.checkInAddressDisplay ?? '—';
  const checkOutAddr = ci?.checkOutAddressDisplay ?? '—';
  const branchName = branchDisplayLabel(ci?.branch ?? null);

  return (
    <div className="space-y-3">
      {sectionShell(
        <>
          {sectionHeading('Check-in', ClipboardList)}
          <dl className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 gap-y-1.5 text-xs">
            <DtIcon icon={Clock}>Check-in time</DtIcon>
            <dd className="min-w-0 font-medium text-foreground">
              {formatDateish(ci?.checkInTime)}
            </dd>
            <DtIcon icon={Clock}>Check-out time</DtIcon>
            <dd className="min-w-0 font-medium text-foreground">
              {formatDateish(ci?.checkOutTime)}
            </dd>
            <DtIcon icon={Timer}>Duration</DtIcon>
            <dd className="min-w-0 font-medium text-foreground">
              {formatPrimitive(ci?.duration) || '—'}
            </dd>
            <DtIcon icon={MapPin}>Check-in location</DtIcon>
            <dd className="min-w-0 font-medium text-foreground leading-snug">{checkInAddr}</dd>
            <DtIcon icon={MapPin}>Check-out location</DtIcon>
            <dd className="min-w-0 font-medium text-foreground leading-snug">{checkOutAddr}</dd>
          </dl>
        </>
      )}
      {branchName
        ? sectionShell(
            <>
              {sectionHeading('Branch', Building2)}
              <p className="text-xs font-medium text-foreground leading-snug">{branchName}</p>
            </>
          )
        : null}
      {sectionShell(
        <>
          {sectionHeading('User', User)}
          <p className="text-xs font-medium text-foreground leading-snug">{ownerName}</p>
        </>
      )}
    </div>
  );
}

function ShiftEndPopupBody({ marker }: { marker: MapMarkerBase }) {
  const ad = readAttendance(marker);
  const duration = (ad?.duration ?? marker.duration) as unknown;
  const checkIn = ad?.checkInTime ?? ad?.checkIn;
  const checkOut = ad?.checkOutTime ?? ad?.checkOut ?? marker.timestamp;
  const branchName = readBranchName(marker);

  return (
    <div className="space-y-3">
      {sectionShell(
        <>
          {sectionHeading('Shift', Clock)}
          <dl className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 gap-y-1.5 text-xs">
            <DtIcon icon={Clock}>Shift start</DtIcon>
            <dd className="min-w-0 font-medium text-foreground">{formatDateish(checkIn)}</dd>
            <DtIcon icon={Clock}>Shift end</DtIcon>
            <dd className="min-w-0 font-medium text-foreground">{formatDateish(checkOut)}</dd>
            <DtIcon icon={Timer}>Duration</DtIcon>
            <dd className="min-w-0 font-medium text-foreground">{formatPrimitive(duration) || '—'}</dd>
          </dl>
        </>
      )}
      {branchName
        ? sectionShell(
            <>
              {sectionHeading('Branch', Building2)}
              <p className="text-xs font-medium text-foreground leading-snug">{branchName}</p>
            </>
          )
        : null}
    </div>
  );
}

function ShiftStartPopupBody({ marker }: { marker: MapMarkerBase }) {
  const ad = readAttendance(marker);
  const started = ad?.checkInTime ?? ad?.checkIn ?? marker.timestamp;
  const branchName = readBranchName(marker);

  return (
    <div className="space-y-3">
      {sectionShell(
        <>
          {sectionHeading('Shift', Clock)}
          <dl className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 gap-y-1.5 text-xs">
            <DtIcon icon={Clock}>Shift start</DtIcon>
            <dd className="min-w-0 font-medium text-foreground">{formatDateish(started)}</dd>
          </dl>
        </>
      )}
      {branchName
        ? sectionShell(
            <>
              {sectionHeading('Branch', Building2)}
              <p className="text-xs font-medium text-foreground leading-snug">{branchName}</p>
            </>
          )
        : null}
    </div>
  );
}

export interface MapMarkerDetailPopupProps {
  marker: MapMarkerBase;
}

export function MapMarkerDetailPopup({ marker }: MapMarkerDetailPopupProps) {
  const mt = String(marker.markerType ?? 'point');
  const title = String(marker.name ?? marker.id ?? mt);

  const header = (
    <div className="border-b border-border/60 pb-2 mb-3">
      <p className="font-semibold leading-snug pr-6">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{markerTypeLabel(mt)}</p>
    </div>
  );

  if (mt === 'shift-end') {
    return (
      <div className="font-sans text-sm min-w-[240px] max-w-[min(92vw,360px)] max-h-[min(70vh,420px)] overflow-y-auto pr-0.5">
        {header}
        <ShiftEndPopupBody marker={marker} />
      </div>
    );
  }

  if (mt === 'check-in-visit') {
    return (
      <div className="font-sans text-sm min-w-[240px] max-w-[min(92vw,360px)] max-h-[min(70vh,420px)] overflow-y-auto pr-0.5">
        {header}
        <CheckInVisitPopupBody marker={marker} />
      </div>
    );
  }

  if (mt === 'shift-start') {
    return (
      <div className="font-sans text-sm min-w-[240px] max-w-[min(92vw,360px)] max-h-[min(70vh,420px)] overflow-y-auto pr-0.5">
        {header}
        <ShiftStartPopupBody marker={marker} />
      </div>
    );
  }

  const topKeys = Object.keys(marker).filter(
    (k) => !SKIP_TOP_LEVEL.has(k) && marker[k] != null && marker[k] !== ''
  );

  const primitiveRows: Array<{ key: string; value: unknown }> = [];
  const objectSections: Array<{ key: string; label: string; value: unknown }> = [];

  for (const k of topKeys) {
    if (shouldHideKeyStrict(k)) continue;
    const val = marker[k];
    if (typeof val === 'object' && val != null && !Array.isArray(val)) {
      if (k === 'owner' || k === 'creator') {
        const name = (val as { name?: unknown }).name;
        if (typeof name === 'string' && name.trim()) {
          objectSections.push({
            key: k,
            label: k === 'owner' ? 'User' : SECTION_TITLES[k] ?? humanKey(k),
            value: name,
          });
        }
        continue;
      }
      objectSections.push({
        key: k,
        label: SECTION_TITLES[k] ?? humanKey(k),
        value: val,
      });
    } else if (typeof val !== 'object' || Array.isArray(val)) {
      primitiveRows.push({ key: k, value: val });
    }
  }

  return (
    <div className="font-sans text-sm min-w-[240px] max-w-[min(92vw,380px)] max-h-[min(70vh,420px)] overflow-y-auto pr-0.5">
      {header}

      {primitiveRows.length > 0 ? (
        <div className="mb-3">
          {sectionShell(
            <>
              {sectionHeading('Details', ClipboardList)}
              <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1.5 text-xs">
                {primitiveRows.map(({ key, value }) => (
                  <div key={key} className="contents">
                    <dt className="text-muted-foreground shrink-0">{humanKey(key)}</dt>
                    <dd className="min-w-0">{renderValue(value, 0, true)}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </div>
      ) : null}

      {objectSections.map(({ key, label, value }) => (
        <section key={key} className="mb-3 last:mb-0">
          {typeof value === 'string' ? (
            <>
              {sectionShell(
                <>
                  {sectionHeading(label, iconForSectionLabel(label))}
                  <p className="text-xs font-medium text-foreground">{value}</p>
                </>
              )}
            </>
          ) : (
            <>
              {sectionShell(
                <>
                  {sectionHeading(label, iconForSectionLabel(label))}
                  {renderValue(value, 0, true)}
                </>
              )}
            </>
          )}
        </section>
      ))}
    </div>
  );
}

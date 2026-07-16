'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  Briefcase,
  ClipboardList,
  Clock,
  Globe,
  Mail,
  MapPin,
  Phone,
  Timer,
  User,
  Banknote,
} from 'lucide-react';
import type { MapMarkerBase } from '@/api/types/map';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDisplayName, formatEmailDisplay, orgSiteInitials } from '@/lib/client-display';
import { formatZar } from '@/lib/client-portal-utils';
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
    <div className="rounded-md border border-border/60 bg-muted/20 px-4 py-3">{children}</div>
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
        <Icon className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden focusable={false} />
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

function resolveOrgSiteLogoUrl(marker: MapMarkerBase): string | undefined {
  const raw =
    marker.logoUrl?.trim() ||
    (typeof marker.logo === 'string' ? marker.logo.trim() : undefined);
  return raw || undefined;
}

function dedupeAddressSegments(line: string): string {
  const parts = line.split(',').map((p) => p.trim()).filter(Boolean);
  const deduped: string[] = [];
  for (const part of parts) {
    const prev = deduped[deduped.length - 1];
    if (prev !== undefined && prev.toLowerCase() === part.toLowerCase()) continue;
    deduped.push(part);
  }
  return deduped.join(', ');
}

function formatMarkerAddress(address: unknown): string | undefined {
  if (address == null) return undefined;
  if (typeof address === 'string') {
    const t = dedupeAddressSegments(address.trim());
    return t || undefined;
  }
  if (typeof address === 'object' && !Array.isArray(address)) {
    const o = address as Record<string, unknown>;
    const parts = ['street', 'suburb', 'city', 'state', 'postalCode', 'country']
      .map((k) => o[k])
      .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
      .map((s) => s.trim());
    if (parts.length > 0) return dedupeAddressSegments(parts.join(', '));
  }
  return undefined;
}

function buildTelHref(phone: string): string {
  const trimmed = phone.trim();
  const core = trimmed.replace(/[^\d+]/g, '');
  return core ? `tel:${core}` : `tel:${encodeURIComponent(trimmed)}`;
}

function buildWebsiteHref(url: string): string {
  const trimmed = url.trim();
  return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
}

function readMarkerString(marker: MapMarkerBase, ...keys: string[]): string {
  for (const key of keys) {
    const value = marker[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function readStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string' && item.trim() !== '')
      .map((item) => item.trim());
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function readNumericField(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function PopupValue({ children }: { children: ReactNode }) {
  return (
    <dd className="min-w-0 font-medium text-foreground leading-snug break-words">{children}</dd>
  );
}

function PopupLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className="font-medium text-primary underline-offset-2 hover:underline break-all"
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noreferrer' : undefined}
    >
      {children}
    </a>
  );
}

function StringListSection({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      <ul className="list-disc pl-4 text-xs text-foreground space-y-0.5">
        {items.slice(0, 20).map((item, index) => (
          <li key={`${label}-${index}`}>{item}</li>
        ))}
        {items.length > 20 ? <li className="text-muted-foreground">…</li> : null}
      </ul>
    </div>
  );
}

function OrgSiteHeader({
  marker,
  title,
  mt,
}: {
  marker: MapMarkerBase;
  title: string;
  mt: string;
}) {
  const isClient = mt === 'client';
  const logoUrl = isClient ? undefined : resolveOrgSiteLogoUrl(marker);
  const [logoFailed, setLogoFailed] = useState(false);
  useEffect(() => {
    setLogoFailed(false);
  }, [logoUrl, marker.id]);
  const showLogo = Boolean(logoUrl) && !logoFailed;
  const initials = orgSiteInitials(title);
  const displayTitle = formatDisplayName(title) || title;
  const ringColor =
    typeof marker.markerColor === 'string' && marker.markerColor.trim()
      ? marker.markerColor.trim()
      : undefined;

  return (
    <div className="border-b border-border/60 pb-2 mb-3">
      <div className="flex gap-3 pr-6">
        {showLogo && logoUrl ? (
          <span
            className="size-10 shrink-0 overflow-hidden rounded-full border-2 border-border bg-white"
            style={ringColor ? { borderColor: ringColor } : undefined}
            aria-hidden
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- external competitor/branch logo URLs */}
            <img
              src={logoUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="size-full object-contain p-0.5"
              onError={() => setLogoFailed(true)}
            />
          </span>
        ) : (
          <Avatar size="lg" className="shrink-0">
            <AvatarFallback
              className={
                isClient
                  ? 'bg-[#16a34a] text-white text-xs font-semibold'
                  : undefined
              }
            >
              {initials}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug text-foreground">{displayTitle}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{markerTypeLabel(mt)}</p>
        </div>
      </div>
    </div>
  );
}

function OrgSitePopupBody({ marker }: { marker: MapMarkerBase }) {
  const address = formatMarkerAddress(marker.address);
  const contactPerson =
    (typeof marker.contactPerson === 'string' && marker.contactPerson.trim()) ||
    (typeof marker.contactName === 'string' && marker.contactName.trim()) ||
    '';
  const phonePrimary =
    (typeof marker.phone === 'string' && marker.phone.trim()) ||
    (typeof marker.contactPhone === 'string' && marker.contactPhone.trim()) ||
    '';
  const phoneAlt =
    typeof marker.alternativePhone === 'string' ? marker.alternativePhone.trim() : '';
  const email =
    (typeof marker.email === 'string' && marker.email.trim()) ||
    (typeof marker.contactEmail === 'string' && marker.contactEmail.trim()) ||
    '';

  const hasContactBlock =
    Boolean(contactPerson) || Boolean(phonePrimary) || Boolean(phoneAlt) || Boolean(email);

  return (
    <div className="space-y-3">
      {address ? (
        <div className="flex items-center gap-2">
          <MapPin
            className="size-3.5 shrink-0 text-muted-foreground"
            strokeWidth={2}
            aria-hidden
            focusable={false}
          />
          <p className="text-xs text-foreground font-medium leading-snug min-w-0 flex-1">{address}</p>
        </div>
      ) : null}

      {hasContactBlock ? (
        <dl className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 gap-y-2 text-xs">
          {contactPerson ? (
            <>
              <DtIcon icon={User}>Contact</DtIcon>
              <PopupValue>{contactPerson}</PopupValue>
            </>
          ) : null}
          {phonePrimary ? (
            <>
              <DtIcon icon={Phone}>Phone</DtIcon>
              <dd className="min-w-0">
                <PopupLink href={buildTelHref(phonePrimary)}>{phonePrimary}</PopupLink>
              </dd>
            </>
          ) : null}
          {phoneAlt ? (
            <>
              <DtIcon icon={Phone}>Alt phone</DtIcon>
              <dd className="min-w-0">
                <PopupLink href={buildTelHref(phoneAlt)}>{phoneAlt}</PopupLink>
              </dd>
            </>
          ) : null}
          {email ? (
            <>
              <DtIcon icon={Mail}>Email</DtIcon>
              <dd className="min-w-0">
                <PopupLink href={`mailto:${email}`}>{formatEmailDisplay(email)}</PopupLink>
              </dd>
            </>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}

function BranchPopupBody({ marker }: { marker: MapMarkerBase }) {
  const address = formatMarkerAddress(marker.address) ?? '—';
  const contactPerson = readMarkerString(marker, 'contactPerson', 'contactName') || '—';
  const cell = readMarkerString(marker, 'phone') || '—';
  const email = readMarkerString(marker, 'email') || '—';

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <MapPin
          className="size-3.5 shrink-0 text-muted-foreground mt-0.5"
          strokeWidth={2}
          aria-hidden
          focusable={false}
        />
        <p className="text-xs text-foreground font-medium leading-snug min-w-0 flex-1">{address}</p>
      </div>

      <dl className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 gap-y-2 text-xs">
        <DtIcon icon={User}>Contact</DtIcon>
        <PopupValue>{contactPerson}</PopupValue>

        <DtIcon icon={Phone}>Cell</DtIcon>
        <dd className="min-w-0">
          {cell !== '—' ? (
            <PopupLink href={buildTelHref(cell)}>{cell}</PopupLink>
          ) : (
            <span className="font-medium text-foreground">—</span>
          )}
        </dd>

        <DtIcon icon={Mail}>Email</DtIcon>
        <dd className="min-w-0">
          {email !== '—' ? (
            <PopupLink href={`mailto:${email}`}>{formatEmailDisplay(email)}</PopupLink>
          ) : (
            <span className="font-medium text-foreground">—</span>
          )}
        </dd>
      </dl>
    </div>
  );
}

function CompetitorBadges({ marker }: { marker: MapMarkerBase }) {
  const status = readMarkerString(marker, 'status');
  const industry = readMarkerString(marker, 'industry');
  const hardwareBrand = readMarkerString(marker, 'hardwareBrand');
  const threatLevel = readNumericField(marker.threatLevel);
  const isDirect = marker.isDirect;

  const badges: ReactNode[] = [];
  if (status) {
    badges.push(
      <Badge key="status" variant="secondary" className="capitalize text-foreground">
        {status}
      </Badge>
    );
  }
  if (threatLevel != null && threatLevel > 0) {
    badges.push(
      <Badge key="threat" variant="outline" className="text-foreground">
        Threat {threatLevel}/5
      </Badge>
    );
  }
  if (isDirect === true) {
    badges.push(
      <Badge key="direct" variant="outline" className="text-foreground">
        Direct
      </Badge>
    );
  } else if (isDirect === false) {
    badges.push(
      <Badge key="indirect" variant="outline" className="text-foreground">
        Indirect
      </Badge>
    );
  }
  if (industry) {
    badges.push(
      <Badge key="industry" variant="outline" className="text-foreground">
        {industry}
      </Badge>
    );
  }
  if (hardwareBrand) {
    badges.push(
      <Badge key="brand" variant="outline" className="text-foreground">
        {hardwareBrand}
      </Badge>
    );
  }

  if (badges.length === 0) return null;
  return <div className="flex flex-wrap gap-1.5 mb-3">{badges}</div>;
}

function CompetitorPopupBody({ marker }: { marker: MapMarkerBase }) {
  const address = formatMarkerAddress(marker.address);
  const contactPerson =
    readMarkerString(marker, 'contactPerson', 'contactName');
  const phonePrimary = readMarkerString(marker, 'phone', 'contactPhone');
  const phoneAlt = readMarkerString(marker, 'alternativePhone');
  const email = readMarkerString(marker, 'email', 'contactEmail');
  const website = readMarkerString(marker, 'website');
  const competitorRef = readMarkerString(marker, 'competitorRef');
  const accountName = readMarkerString(marker, 'accountName');
  const legalEntity = readMarkerString(marker, 'LegalEntity');
  const description = readMarkerString(marker, 'description');
  const annualRevenue = readNumericField(marker.estimatedAnnualRevenue);
  const keyProducts = readStringArray(marker.keyProducts);
  const keyStrengths = readStringArray(marker.keyStrengths);
  const keyWeaknesses = readStringArray(marker.keyWeaknesses);
  const businessStrategy = readMarkerString(marker, 'businessStrategy');
  const marketingStrategy = readMarkerString(marker, 'marketingStrategy');
  const pricingData = marker.pricingData;
  const socialMedia = marker.socialMedia;

  const hasContact =
    Boolean(contactPerson) ||
    Boolean(phonePrimary) ||
    Boolean(phoneAlt) ||
    Boolean(email) ||
    Boolean(website);
  const hasBusiness =
    Boolean(competitorRef) ||
    Boolean(accountName) ||
    Boolean(legalEntity) ||
    Boolean(description);
  const hasRevenue = annualRevenue != null;
  const hasIntelligence =
    keyProducts.length > 0 || keyStrengths.length > 0 || keyWeaknesses.length > 0;
  const hasStrategy =
    Boolean(businessStrategy) ||
    Boolean(marketingStrategy) ||
    (pricingData != null && typeof pricingData === 'object');
  const hasSocial =
    socialMedia != null &&
    typeof socialMedia === 'object' &&
    !Array.isArray(socialMedia) &&
    Object.values(socialMedia as Record<string, unknown>).some(
      (v) => typeof v === 'string' && v.trim() !== ''
    );

  return (
    <div className="space-y-3">
      <CompetitorBadges marker={marker} />

      {address
        ? sectionShell(
            <>
              {sectionHeading('Location', MapPin)}
              <p className="text-xs font-medium text-foreground leading-snug">{address}</p>
            </>
          )
        : null}

      {hasContact
        ? sectionShell(
            <>
              {sectionHeading('Contact', Phone)}
              <dl className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 gap-y-2 text-xs">
                {contactPerson ? (
                  <>
                    <DtIcon icon={User}>Contact</DtIcon>
                    <PopupValue>{contactPerson}</PopupValue>
                  </>
                ) : null}
                {phonePrimary ? (
                  <>
                    <DtIcon icon={Phone}>Phone</DtIcon>
                    <dd className="min-w-0">
                      <PopupLink href={buildTelHref(phonePrimary)}>{phonePrimary}</PopupLink>
                    </dd>
                  </>
                ) : null}
                {phoneAlt ? (
                  <>
                    <DtIcon icon={Phone}>Alt phone</DtIcon>
                    <dd className="min-w-0">
                      <PopupLink href={buildTelHref(phoneAlt)}>{phoneAlt}</PopupLink>
                    </dd>
                  </>
                ) : null}
                {email ? (
                  <>
                    <DtIcon icon={Mail}>Email</DtIcon>
                    <dd className="min-w-0">
                      <PopupLink href={`mailto:${email}`}>{formatEmailDisplay(email)}</PopupLink>
                    </dd>
                  </>
                ) : null}
                {website ? (
                  <>
                    <DtIcon icon={Globe}>Website</DtIcon>
                    <dd className="min-w-0">
                      <PopupLink href={buildWebsiteHref(website)}>{website}</PopupLink>
                    </dd>
                  </>
                ) : null}
              </dl>
            </>
          )
        : null}

      {hasRevenue
        ? sectionShell(
            <>
              {sectionHeading('Revenue', Banknote)}
              <dl className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 gap-y-2 text-xs">
                <dt className="text-muted-foreground shrink-0">Annual</dt>
                <PopupValue>{formatZar(annualRevenue)}</PopupValue>
                <dt className="text-muted-foreground shrink-0">Monthly</dt>
                <PopupValue>{formatZar(annualRevenue / 12)}</PopupValue>
              </dl>
            </>
          )
        : null}

      {hasBusiness
        ? sectionShell(
            <>
              {sectionHeading('Business', Briefcase)}
              <dl className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 gap-y-2 text-xs">
                {competitorRef ? (
                  <>
                    <dt className="text-muted-foreground shrink-0">Reference</dt>
                    <PopupValue>{competitorRef}</PopupValue>
                  </>
                ) : null}
                {accountName ? (
                  <>
                    <dt className="text-muted-foreground shrink-0">Account</dt>
                    <PopupValue>{formatDisplayName(accountName) || accountName}</PopupValue>
                  </>
                ) : null}
                {legalEntity ? (
                  <>
                    <dt className="text-muted-foreground shrink-0">Legal entity</dt>
                    <PopupValue>{legalEntity}</PopupValue>
                  </>
                ) : null}
              </dl>
              {description ? (
                <p className="mt-2 whitespace-pre-wrap text-xs font-medium text-foreground leading-snug">
                  {description}
                </p>
              ) : null}
            </>
          )
        : null}

      {hasIntelligence
        ? sectionShell(
            <>
              {sectionHeading('Intelligence', ClipboardList)}
              <div className="space-y-2">
                <StringListSection label="Products" items={keyProducts} />
                <StringListSection label="Strengths" items={keyStrengths} />
                <StringListSection label="Weaknesses" items={keyWeaknesses} />
              </div>
            </>
          )
        : null}

      {hasStrategy
        ? sectionShell(
            <>
              {sectionHeading('Strategy', Briefcase)}
              {businessStrategy ? (
                <p className="text-xs font-medium text-foreground leading-snug mb-2 whitespace-pre-wrap">
                  {businessStrategy}
                </p>
              ) : null}
              {marketingStrategy ? (
                <p className="text-xs font-medium text-foreground leading-snug mb-2 whitespace-pre-wrap">
                  {marketingStrategy}
                </p>
              ) : null}
              {pricingData != null ? renderValue(pricingData, 0, true) : null}
            </>
          )
        : null}

      {hasSocial
        ? sectionShell(
            <>
              {sectionHeading('Social', Globe)}
              <dl className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 gap-y-2 text-xs">
                {Object.entries(socialMedia as Record<string, unknown>)
                  .filter(([, v]) => typeof v === 'string' && v.trim() !== '')
                  .map(([key, value]) => {
                    const url = String(value).trim();
                    return (
                      <div key={key} className="contents">
                        <dt className="text-muted-foreground shrink-0 capitalize">{humanKey(key)}</dt>
                        <dd className="min-w-0">
                          <PopupLink href={buildWebsiteHref(url)}>{url}</PopupLink>
                        </dd>
                      </div>
                    );
                  })}
              </dl>
            </>
          )
        : null}
    </div>
  );
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
      <div className="font-sans text-sm min-w-[240px] max-w-[min(92vw,360px)] max-h-[min(70vh,420px)] overflow-y-auto px-3">
        {header}
        <ShiftEndPopupBody marker={marker} />
      </div>
    );
  }

  if (mt === 'check-in-visit') {
    return (
      <div className="font-sans text-sm min-w-[240px] max-w-[min(92vw,360px)] max-h-[min(70vh,420px)] overflow-y-auto px-3">
        {header}
        <CheckInVisitPopupBody marker={marker} />
      </div>
    );
  }

  if (mt === 'shift-start') {
    return (
      <div className="font-sans text-sm min-w-[240px] max-w-[min(92vw,360px)] max-h-[min(70vh,420px)] overflow-y-auto px-3">
        {header}
        <ShiftStartPopupBody marker={marker} />
      </div>
    );
  }

  if (mt === 'competitor') {
    return (
      <div className="font-sans text-sm min-w-[240px] max-w-[min(92vw,380px)] max-h-[min(70vh,420px)] overflow-y-auto px-3">
        <OrgSiteHeader marker={marker} title={title} mt={mt} />
        <CompetitorPopupBody marker={marker} />
      </div>
    );
  }

  if (mt === 'org') {
    return (
      <div className="font-sans text-sm min-w-[240px] max-w-[min(92vw,380px)] max-h-[min(70vh,420px)] overflow-y-auto px-3">
        <OrgSiteHeader marker={marker} title={title} mt={mt} />
        <OrgSitePopupBody marker={marker} />
      </div>
    );
  }

  if (mt === 'branch') {
    return (
      <div className="font-sans text-sm min-w-[240px] max-w-[min(92vw,380px)] max-h-[min(70vh,420px)] overflow-y-auto px-3">
        <OrgSiteHeader marker={marker} title={title} mt={mt} />
        <BranchPopupBody marker={marker} />
      </div>
    );
  }

  if (mt === 'client') {
    return (
      <div className="font-sans text-sm min-w-[240px] max-w-[min(92vw,380px)] max-h-[min(70vh,420px)] overflow-y-auto px-3">
        <OrgSiteHeader marker={marker} title={title} mt={mt} />
        <OrgSitePopupBody marker={marker} />
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
    <div className="font-sans text-sm min-w-[240px] max-w-[min(92vw,380px)] max-h-[min(70vh,420px)] overflow-y-auto px-3">
      {header}

      {primitiveRows.length > 0 ? (
        <div className="mb-3">
          {sectionShell(
            <>
              {sectionHeading('Details', ClipboardList)}
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
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

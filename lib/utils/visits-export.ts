/**
 * Visits (check-ins) export: columns aligned with reports table (Sales Person, Date and time, merged location, method, contact fields, notes, quote, value, relations).
 * Row order must be the same as API (checkInTime DESC); do not re-sort.
 */

import { format } from 'date-fns';
import type { BranchListItem } from '@/api/types/branch';
import type { VisitExportItem, CheckInContactAddress } from '@/api/types/reports';
import { formatSalesValue } from '@/components/visits-table/visits-table-utils';
import type { VisitListItem } from '@/api/types/visits';
import { exportToCsv, exportToExcel, exportToPdf } from './report-export';

/** Minimal branch ref from API (visit, owner, or user list). `name` is display label (alias preferred when resolving). */
export type VisitBranchRef = { uid?: number; name?: string; alias?: string | null };

/**
 * Merges visit.branch and owner.branch: display name prefers alias, then legal name (visit fields first), uid from visit.branch when set else owner.branch.
 * Avoids `visit.branch ?? owner.branch` when visit is a stub without name but owner has the display name.
 */
export function resolveVisitBranch(v: VisitListItem | VisitExportItem): VisitBranchRef | null {
  const visitB = (v as { branch?: VisitBranchRef | null }).branch;
  const ownerB = (v as { owner?: { branch?: VisitBranchRef | null } }).owner?.branch;

  const visitAlias = visitB?.alias?.trim();
  const ownerAlias = ownerB?.alias?.trim();
  const visitName = visitB?.name?.trim();
  const ownerName = ownerB?.name?.trim();
  const name = (visitAlias || ownerAlias || visitName || ownerName || '').trim();
  const aliasFromApi = visitAlias || ownerAlias || undefined;

  const uid = visitB?.uid != null ? visitB.uid : ownerB?.uid;

  if (!name && uid == null) return null;
  const out: VisitBranchRef = {};
  if (uid != null) out.uid = uid;
  if (name) out.name = name;
  if (aliasFromApi) out.alias = aliasFromApi;
  return Object.keys(out).length ? out : null;
}

/** Trimmed branch display label for tables, charts, and export (empty if unknown). */
export function getVisitBranchDisplayName(c: VisitListItem | VisitExportItem): string {
  return resolveVisitBranch(c)?.name?.trim() ?? '';
}

/** Resolved branch uid for filters (visit snapshot uid preferred over owner). */
export function getVisitBranchUid(c: VisitListItem | VisitExportItem): number | undefined {
  const r = resolveVisitBranch(c);
  return r?.uid;
}

export type UserBranchLookup = {
  uid: number;
  email?: string;
  branch?: { uid?: number; name?: string; alias?: string | null } | null;
};

function applyVisitBranchResolved(
  v: VisitExportItem,
  resolved: VisitBranchRef
): VisitExportItem {
  const ob = (v.owner as { branch?: VisitBranchRef | null } | undefined)?.branch;
  const withUserBranch = {
    ...v,
    branch: resolved,
    owner: v.owner
      ? {
          ...v.owner,
          branch: {
            uid: resolved.uid ?? ob?.uid,
            name: resolved.name ?? ob?.name,
            alias: resolved.alias ?? ob?.alias,
          },
        }
      : v.owner,
  } as VisitExportItem;

  const folded = resolveVisitBranch(withUserBranch as VisitListItem);
  if (!folded) return withUserBranch;

  const ob2 = (withUserBranch.owner as { branch?: VisitBranchRef | null } | undefined)?.branch;
  return {
    ...withUserBranch,
    branch: folded,
    owner: withUserBranch.owner
      ? {
          ...withUserBranch.owner,
          branch: {
            uid: folded.uid ?? ob2?.uid,
            name: folded.name ?? ob2?.name,
            alias: folded.alias ?? ob2?.alias,
          },
        }
      : withUserBranch.owner,
  } as VisitExportItem;
}

/**
 * Canonical branch label for charts (org list first, then visit snapshot name).
 */
export function resolveBranchChartLabel(
  c: VisitListItem | VisitExportItem,
  branches: BranchListItem[]
): string {
  const uid = getVisitBranchUid(c);
  if (uid != null) {
    const b = branches.find((br) => br.uid === uid);
    const n = (b?.alias?.trim() || b?.name?.trim());
    if (n) return n;
    const fromVisit = getVisitBranchDisplayName(c);
    if (fromVisit) return fromVisit;
    return `Branch ${uid}`;
  }
  return getVisitBranchDisplayName(c) || 'Not set';
}

/**
 * When check-in payloads omit branch name, fill from org branches list and/or user list.
 * Never replaces a persisted branch UID with the owner’s current branch when UIDs differ.
 */
export function enrichVisitsWithUserBranches(
  visits: VisitExportItem[],
  users: UserBranchLookup[],
  branches?: BranchListItem[]
): VisitExportItem[] {
  if (!users.length && !branches?.length) return visits;

  const byUid = new Map(users.map((u) => [u.uid, u]));
  const byEmail = new Map(
    users
      .filter((u) => (u.email ?? '').trim())
      .map((u) => [String(u.email).trim().toLowerCase(), u])
  );

  const branchNameByUid = new Map<number, string>();
  for (const b of branches ?? []) {
    const n = (b.alias?.trim() || b.name?.trim());
    if (n) branchNameByUid.set(b.uid, n);
  }

  return visits.map((v) => {
    if (getVisitBranchDisplayName(v)) return v;

    const snapshotUid = getVisitBranchUid(v);
    const owner = v.owner as { uid?: number; email?: string } | undefined;
    const u =
      (owner?.uid != null ? byUid.get(owner.uid) : undefined) ??
      (owner?.email ? byEmail.get(owner.email.trim().toLowerCase()) : undefined);
    const ub = u?.branch;

    if (snapshotUid != null) {
      const nameFromOrg = branchNameByUid.get(snapshotUid);
      const nameFromUser =
        ub?.uid === snapshotUid
          ? (ub.alias?.trim() || ub.name?.trim())
          : undefined;
      const name =
        (nameFromOrg && nameFromOrg.length > 0 ? nameFromOrg : undefined) ?? nameFromUser;
      if (name) {
        const aliasFromUser =
          ub?.uid === snapshotUid ? ub.alias?.trim() : undefined;
        return applyVisitBranchResolved(v, {
          uid: snapshotUid,
          name,
          ...(aliasFromUser ? { alias: aliasFromUser } : {}),
        });
      }
      return v;
    }

    const userDisplay = ub ? (ub.alias?.trim() || ub.name?.trim()) : '';
    if (!ub || (!userDisplay && ub.uid == null)) return v;

    const branchFromUser: VisitBranchRef = {
      ...(ub.uid != null ? { uid: ub.uid } : {}),
      ...(userDisplay ? { name: userDisplay } : {}),
      ...(ub.alias?.trim() ? { alias: ub.alias.trim() } : {}),
    };
    if (!branchFromUser.name && branchFromUser.uid == null) return v;

    return applyVisitBranchResolved(v, branchFromUser);
  });
}

export function mapCheckInsFromApi(
  checkIns: VisitListItem[],
  users?: UserBranchLookup[],
  branches?: BranchListItem[]
): VisitExportItem[] {
  const mapped = checkIns.map(visitListItemToExportItem);
  if (!users?.length && !branches?.length) return mapped;
  return enrichVisitsWithUserBranches(mapped, users ?? [], branches);
}

/**
 * Maps VisitListItem to VisitExportItem, normalizing optional fields (e.g. checkInLocation) to required strings.
 * Coalesces visit.branch and owner.branch (alias-first) and mirrors onto owner.branch for consistent UI.
 */
export function visitListItemToExportItem(v: VisitListItem): VisitExportItem {
  const resolved = resolveVisitBranch(v);
  const owner = v.owner as VisitExportItem['owner'] | undefined;
  const ownerPatched =
    owner && resolved
      ? {
          ...owner,
          branch: {
            uid: resolved.uid ?? owner.branch?.uid,
            name: resolved.name ?? owner.branch?.name,
            alias: resolved.alias ?? owner.branch?.alias,
          },
        }
      : owner;

  return {
    ...v,
    checkInLocation: v.checkInLocation ?? '-',
    checkOutLocation: v.checkOutLocation ?? null,
    branch: resolved,
    owner: ownerPatched,
  } as VisitExportItem;
}

export const VISITS_EXPORT_HEADERS = [
  'Sales Person',
  'Date and time',
  'Check-in / Check-out location',
  'Method',
  'Building type',
  'Contact made',
  'Company',
  'Business type',
  'Person seen position',
  'Contact name',
  'Contact image',
  'Cell',
  'Landline',
  'Contact email',
  'Contact address',
  'Meeting link',
  'Notes',
  'Resolution',
  'Follow Up',
  'Quote Number',
  'Quotation status',
  'Value - ex-VAT',
  'Lead',
  'Client',
  'Branch',
] as const;

/** Method of contact display labels; new enum values (Physical, Telephone, Email, Whatsapp) pass through; legacy values mapped for backward compatibility. */
const METHOD_OF_CONTACT_LABELS: Record<string, string> = {
  Physical: 'Physical',
  Telephone: 'Telephone',
  Email: 'Email',
  Whatsapp: 'Whatsapp',
  'in-person': 'Physical',
  'phone-call': 'Telephone',
  email: 'Email',
  whatsapp: 'Whatsapp',
};

function parseDurationToMinutes(duration: string | null | undefined): number {
  if (!duration || typeof duration !== 'string') return 0;
  const hoursMatch = duration.match(/(\d+)h/);
  const minutesMatch = duration.match(/(\d+)m/);
  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
  return hours * 60 + minutes;
}

/** Format minutes for display: always "Xh Ym" (e.g. "0h 9m"). */
function formatDurationDisplay(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

function normalizeDurationDisplay(duration: string | null | undefined): string {
  if (duration == null || duration === '') return '-';
  return formatDurationDisplay(parseDurationToMinutes(duration));
}

function getMethodDisplay(c: VisitExportItem): string {
  if (c.methodOfContact) return formatMethodOfContact(c.methodOfContact);
  const hasLocation =
    (c.checkInLocation && c.checkInLocation !== '-') ||
    (c.checkOutLocation && c.checkOutLocation !== '-');
  return hasLocation ? 'Physical' : '-';
}

export function formatContactAddress(address: CheckInContactAddress | null | undefined): string {
  if (!address) return '-';
  if (typeof address === 'string') return address;
  if (address.formattedAddress) return address.formattedAddress;
  const parts = [
    address.streetNumber,
    address.street,
    address.suburb,
    address.city,
    address.state,
    address.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '-';
}

/**
 * Extract region string from a visit (for region filter and grouping).
 * Uses fullAddress, checkOutFullAddress, or contactAddress.
 */
export function extractRegionFromVisit(c: VisitExportItem): string {
  const addr: CheckInContactAddress | null | undefined =
    c.fullAddress ?? c.checkOutFullAddress ?? c.contactAddress;
  if (!addr) return 'Not set';
  const cityOrRegion = (addr.city ?? addr.state ?? '').trim();
  const postalCode = addr.postalCode?.trim() ?? '';
  const country = (addr.country ?? '').trim();
  const fromStructured = [cityOrRegion, postalCode, country].filter(Boolean).join(', ');
  if (fromStructured) return fromStructured;
  const formatted = (addr.formattedAddress ?? '').trim();
  if (!formatted) return 'Not set';
  const parts = formatted.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return 'Not set';
  const secondLast = parts[parts.length - 2];
  const codePart = /^\d{4,5}$/.test(secondLast) ? secondLast : '';
  const cityPart = codePart ? parts[parts.length - 3] ?? '' : secondLast;
  const countryPart = parts[parts.length - 1];
  return [cityPart, codePart, countryPart].filter(Boolean).join(', ') || 'Not set';
}

/**
 * Region group key for filter dropdown: "City, State, Country" (no postal code).
 * Same city/area codes collapse into one option; multi-country is clear (e.g. "Benoni, Gauteng, South Africa", "Gaborone, Botswana").
 */
export function getRegionGroupKey(c: VisitExportItem): string {
  const addr: CheckInContactAddress | null | undefined =
    c.fullAddress ?? c.checkOutFullAddress ?? c.contactAddress;
  if (!addr) return 'Not set';

  const cityLabel = (addr.city ?? addr.state ?? '').trim();
  const stateLabel = (addr.state ?? '').trim();
  const countryLabel = (addr.country ?? '').trim();
  if (cityLabel || stateLabel || countryLabel) {
    const parts = [cityLabel, stateLabel, countryLabel].filter(Boolean);
    if (parts.length > 1 && parts[0] === parts[1]) parts.splice(1, 1);
    return parts.join(', ') || 'Not set';
  }

  const formatted = (addr.formattedAddress ?? '').trim();
  if (!formatted) return 'Not set';
  const parts = formatted.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return 'Not set';
  const secondLast = parts[parts.length - 2];
  const codePart = /^\d{4,5}$/.test(secondLast) ? secondLast : '';
  const cityPart = (codePart ? parts[parts.length - 3] ?? '' : secondLast).trim();
  const countryPart = (parts[parts.length - 1] ?? '').trim();
  const out = [cityPart, countryPart].filter(Boolean).join(', ');
  return out || 'Not set';
}

export function formatMethodOfContact(methodOfContact?: string | null): string {
  if (!methodOfContact) return '-';
  return METHOD_OF_CONTACT_LABELS[methodOfContact] ?? methodOfContact.replace(/_/g, ' ');
}

function formatSalesPerson(c: VisitExportItem): string {
  const o = c.owner;
  if (!o) return '-';
  const fullName = [o.name, o.surname].filter(Boolean).join(' ').trim() || '-';
  const parts = [fullName];
  if (o.email) parts.push(o.email);
  if (o.phone) parts.push(o.phone);
  return parts.length > 1 ? parts.join(' | ') : fullName;
}

/**
 * Prefer reverse-geocoded address for export; fall back to coordinates when address is missing.
 */
function addressForExport(
  address: CheckInContactAddress | null | undefined,
  coordinatesFallback: string | null | undefined
): string {
  const formatted = formatContactAddress(address);
  if (formatted && formatted !== '-') return formatted;
  return coordinatesFallback && coordinatesFallback !== '-' ? coordinatesFallback : '-';
}

function formatContactMade(value: boolean | string | null | undefined): string {
  if (value === true || value === 'YES') return 'Yes';
  if (value === false || value === 'NO') return 'No';
  return '-';
}

/**
 * Build a single row for export; column order matches VISITS_EXPORT_HEADERS (same as reports table).
 */
export function visitToExportRow(c: VisitExportItem): string[] {
  const dateLine = format(new Date(c.checkInTime), 'MMM d, yyyy,');
  const inTime = format(new Date(c.checkInTime), 'HH:mm');
  const outTime = c.checkOutTime ? format(new Date(c.checkOutTime), 'HH:mm') : '-';
  const timeLine = `${inTime} – ${outTime}`;
  const durationLine = normalizeDurationDisplay(c.duration);
  const dateAndTime = `${dateLine} ${timeLine} ${durationLine}`;

  const inAddr = addressForExport(c.fullAddress, c.checkInLocation);
  const outAddr = addressForExport(c.checkOutFullAddress, c.checkOutLocation);
  const locationMerged = `In: ${inAddr} | Out: ${outAddr}`;

  const valueExVat =
    c.salesValue != null
      ? formatSalesValue(c.salesValue, (c as { salesCurrency?: string }).salesCurrency)
      : '-';

  const followUpText = c.followUp?.trim() || '-';

  return [
    formatSalesPerson(c),
    dateAndTime,
    locationMerged,
    getMethodDisplay(c),
    c.buildingType ? String(c.buildingType).replace(/_/g, ' ') : '-',
    formatContactMade(c.contactMade),
    c.companyName?.trim() || '-',
    c.businessType ? String(c.businessType).replace(/_/g, ' ') : '-',
    c.personSeenPosition?.trim() || '-',
    c.contactFullName?.trim() || '-',
    c.contactImage?.trim() || '-',
    c.contactCellPhone?.trim() || '-',
    c.contactLandline?.trim() || '-',
    c.contactEmail?.trim() || '-',
    formatContactAddress(c.contactAddress),
    c.meetingLink?.trim() || '-',
    c.notes || '-',
    c.resolution || '-',
    followUpText,
    c.quotationNumber || '-',
    c.quotationStatus ? String(c.quotationStatus).replace(/_/g, ' ') : '-',
    valueExVat,
    c.lead?.name?.trim() || '-',
    c.client?.name?.trim() || '-',
    getVisitBranchDisplayName(c) || '-',
  ];
}

/**
 * Export visits to CSV/Excel/PDF. Uses list in given order (do not re-sort).
 */
export function exportVisits(
  checkIns: VisitExportItem[],
  exportFormat: 'csv' | 'excel' | 'pdf',
  baseName: string
): void {
  const rows = checkIns.map(visitToExportRow);
  const headers = [...VISITS_EXPORT_HEADERS];
  if (exportFormat === 'csv') exportToCsv(headers, rows, baseName);
  else if (exportFormat === 'excel') exportToExcel(headers, rows, baseName);
  else exportToPdf(headers, rows, baseName);
}

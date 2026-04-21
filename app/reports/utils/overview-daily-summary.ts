import type { UserListItem } from '@/api/endpoints/user';
import type { SyncProfile } from '@/api/types/auth';
import type { BranchListItem } from '@/api/types/branch';
import { getBranchDisplayLabel } from '@/api/types/branch';
import type { TargetsProgressUserSummary } from '@/api/types/targets-progress';
import type { VisitListItem } from '@/api/types/visits';

export type OverviewTimeframe = 'day' | 'month';

function parseUtcYmd(s: string): Date {
  const [y, m, d] = s.split('-').map((x) => parseInt(x, 10));
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatUtcYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function utcToday(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

function getUtcMonthRange(ref: Date): { from: string; to: string } {
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1));
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const end = new Date(Date.UTC(y, m, lastDay));
  return { from: formatUtcYmd(start), to: formatUtcYmd(end) };
}

/**
 * Summary date for Overview dialog: selected day in day mode; in month mode, today (UTC) if inside the visible month, else first day of that month.
 */
export function getOverviewSummaryUtcDay(
  timeframe: OverviewTimeframe,
  selectedDay: Date,
  monthAnchor: Date
): Date {
  if (timeframe === 'day') return selectedDay;
  const { from, to } = getUtcMonthRange(monthAnchor);
  const start = parseUtcYmd(from);
  const end = parseUtcYmd(to);
  const today = utcToday();
  if (today.getTime() >= start.getTime() && today.getTime() <= end.getTime()) {
    return today;
  }
  return start;
}

/** Matches server `leadOwnerDisplayName` join for merging GET /leads/report `byUser` keys. */
export function normalizeOwnerDisplayLabel(name: string, surname: string): string {
  return [name, surname].filter(Boolean).join(' ').trim();
}

/**
 * Count check-ins per owner uid (all contact methods). Rows without owner.uid are skipped.
 */
export function countVisitsByOwnerUid(checkIns: VisitListItem[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const c of checkIns) {
    const uid = c.owner?.uid;
    if (uid == null || !Number.isFinite(Number(uid))) continue;
    const n = Number(uid);
    m.set(n, (m.get(n) ?? 0) + 1);
  }
  return m;
}

/**
 * Map from GET /leads/report `byUser` (keys are owner display names, not uids — duplicate names can collide).
 */
export function mapLeadsByUserFromReport(
  byUser: { name: string; value: number }[] | undefined
): Map<string, number> {
  const m = new Map<string, number>();
  for (const row of byUser ?? []) {
    m.set(row.name.trim(), row.value);
  }
  return m;
}

export interface OverviewDailySummaryRow {
  uid: number;
  fullName: string;
  branchLabel: string;
  contacts: string;
  visits: number;
  visitsTarget: number;
  leads: number;
  leadsTarget: number;
}

function branchLabelForUser(
  u: UserListItem,
  branchesByUid: Map<number, BranchListItem>
): string {
  const raw = u as { branchUid?: number; branch?: { uid?: number; name?: string; alias?: string | null } };
  const embedded = raw.branch;
  if (embedded?.uid != null) {
    const full = branchesByUid.get(embedded.uid);
    return getBranchDisplayLabel(full ?? (embedded as BranchListItem));
  }
  if (typeof raw.branchUid === 'number') {
    const b = branchesByUid.get(raw.branchUid);
    return b ? getBranchDisplayLabel(b) : '—';
  }
  return '—';
}

function contactsLine(u: UserListItem): string {
  const phone = typeof (u as { phone?: string | null }).phone === 'string'
    ? (u as { phone?: string }).phone?.trim()
    : '';
  const email = typeof u.email === 'string' ? u.email.trim() : '';
  const parts = [
    phone ? `Phone: ${phone}` : null,
    email ? `Email: ${email}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : '—';
}

function compareUserSort(a: UserListItem, b: UserListItem): number {
  const s = a.surname.localeCompare(b.surname);
  if (s !== 0) return s;
  return a.name.localeCompare(b.name);
}

export function buildOverviewDailySummaryRows(
  users: UserListItem[],
  visitsByUid: Map<number, number>,
  leadByDisplayName: Map<string, number>,
  branchesByUid: Map<number, BranchListItem>,
  targetsByUid: Map<number, TargetsProgressUserSummary>
): OverviewDailySummaryRow[] {
  const sorted = [...users].sort(compareUserSort);
  return sorted.map((u) => {
    const nameKey = normalizeOwnerDisplayLabel(u.name, u.surname);
    const fullName = nameKey || u.email || `User ${u.uid}`;
    const leads =
      (nameKey ? leadByDisplayName.get(nameKey) : undefined) ??
      (u.email ? leadByDisplayName.get(u.email.trim()) ?? 0 : 0);
    return {
      uid: u.uid,
      fullName,
      branchLabel: branchLabelForUser(u, branchesByUid),
      contacts: contactsLine(u),
      visits: visitsByUid.get(u.uid) ?? 0,
      visitsTarget: targetsByUid.get(u.uid)?.cumulativeTargetVisitsEnd ?? 0,
      leads,
      leadsTarget: targetsByUid.get(u.uid)?.cumulativeTargetLeadsEnd ?? 0,
    };
  });
}

export function buildSelfOverviewDailySummaryRow(
  profile: SyncProfile,
  visitsByUid: Map<number, number>,
  leadByDisplayName: Map<string, number>,
  branchesByUid: Map<number, BranchListItem>,
  targetsByUid: Map<number, TargetsProgressUserSummary>
): OverviewDailySummaryRow {
  const fullName = normalizeOwnerDisplayLabel(
    profile.name ?? '',
    profile.surname ?? ''
  );
  const display = fullName || profile.email || `User ${profile.uid}`;
  const branch =
    profile.branchUid != null ? branchesByUid.get(profile.branchUid) : undefined;
  const branchLabel = profile.branch
    ? getBranchDisplayLabel(profile.branch as BranchListItem)
    : branch
      ? getBranchDisplayLabel(branch)
      : '—';
  const phone = profile.phone?.trim();
  const email = profile.email?.trim();
  const contacts = [
    phone ? `Phone: ${phone}` : null,
    email ? `Email: ${email}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const leads =
    (fullName ? leadByDisplayName.get(fullName) : undefined) ??
    (profile.email ? leadByDisplayName.get(profile.email) ?? 0 : 0);
  return {
    uid: profile.uid,
    fullName: display,
    branchLabel,
    contacts: contacts || '—',
    visits: visitsByUid.get(profile.uid) ?? 0,
    visitsTarget: targetsByUid.get(profile.uid)?.cumulativeTargetVisitsEnd ?? 0,
    leads,
    leadsTarget: targetsByUid.get(profile.uid)?.cumulativeTargetLeadsEnd ?? 0,
  };
}

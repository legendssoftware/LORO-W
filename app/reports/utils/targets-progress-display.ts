import type { TargetsProgressUserSummary } from '@/api/types/targets-progress';
import { exportToCsv } from '@/lib/utils/report-export';

export function achievedActivityTotal(u: TargetsProgressUserSummary): number {
  return u.achievedCallsInRange + u.achievedVisitsInRange;
}

/** End-of-API-range behind check (matches cumulative fields from targets-progress for the requested window). */
export function userBehindForSelectedRange(u: TargetsProgressUserSummary): boolean {
  const combined = achievedActivityTotal(u);
  const behindActivity =
    u.periodTargetVisits > 0 && combined < u.cumulativeTargetVisitsEnd;
  const behindLeads =
    u.periodTargetLeads > 0 && u.belowCumulativeLeads;
  return behindActivity || behindLeads;
}

export function downloadTargetsProgressCsv(
  users: TargetsProgressUserSummary[],
  dateFrom: string,
  dateTo: string,
  onlyBehind: boolean
): void {
  const filtered = onlyBehind
    ? users.filter(userBehindForSelectedRange)
    : users;
  const rangeLabel =
    dateFrom === dateTo ? dateFrom : `${dateFrom}_${dateTo}`;
  const headers = [
    'UID',
    'Name',
    'Surname',
    'Date range (UTC)',
    'Target activity',
    'Achieved activity',
    'Shortfall activity',
    'Target leads',
    'Achieved leads',
    'Shortfall leads',
    'Behind on targets',
  ];
  const rows = filtered.map((u) => {
    const achievedAct = achievedActivityTotal(u);
    const ta = u.cumulativeTargetVisitsEnd;
    const tl = u.cumulativeTargetLeadsEnd;
    const sa =
      u.periodTargetVisits > 0
        ? Math.max(0, u.cumulativeTargetVisitsEnd - achievedAct)
        : null;
    const sl = u.periodTargetLeads > 0 ? u.shortfallLeads : null;
    return [
      String(u.uid),
      u.name,
      u.surname,
      `${dateFrom} – ${dateTo}`,
      u.periodTargetVisits > 0 ? String(ta) : '',
      String(achievedAct),
      sa != null ? String(sa) : '',
      u.periodTargetLeads > 0 ? String(tl) : '',
      String(u.achievedLeadsInRange),
      sl != null ? String(sl) : '',
      userBehindForSelectedRange(u) ? 'yes' : 'no',
    ];
  });
  exportToCsv(headers, rows, `targets-progress-${rangeLabel}`);
}

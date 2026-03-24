import type { VisitExportItem } from '@/api/types/reports';
import { getRegionGroupKey, visitToExportRow } from '@/lib/utils/visits-export';

export interface VisitHistoryFilterInput {
  selectedRegion: string;
  selectedBusinessType: string;
  searchQuery: string;
}

/**
 * Applies Visit History region, business type, and search filters (same rules as /visits).
 */
export function filterVisitCheckIns(
  checkIns: VisitExportItem[],
  filters: VisitHistoryFilterInput
): VisitExportItem[] {
  let list = checkIns;
  if (filters.selectedRegion) {
    list = list.filter((c) => getRegionGroupKey(c) === filters.selectedRegion);
  }
  if (filters.selectedBusinessType) {
    list = list.filter((c) => {
      const bt = c.businessType ?? 'Not set';
      return bt === filters.selectedBusinessType;
    });
  }
  const q = filters.searchQuery.trim().toLowerCase();
  if (!q) return list;
  return list.filter((c) => {
    const ownerName = c.owner
      ? [c.owner.name, (c.owner as { surname?: string }).surname].filter(Boolean).join(' ')
      : '';
    const searchable = [
      ownerName,
      c.owner?.email,
      c.owner?.phone,
      c.contactFullName,
      c.companyName,
      c.notes,
      c.resolution,
      c.contactCellPhone,
      c.contactLandline,
      c.contactEmail,
      c.businessType,
      c.personSeenPosition,
      c.quotationNumber,
      c.followUp,
      c.lead?.name,
      c.client?.name,
      c.branch?.name,
      c.organisation?.name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const rowText = visitToExportRow(c).join(' ').toLowerCase();
    return searchable.includes(q) || rowText.includes(q);
  });
}

export function getSortedUniqueRegions(checkIns: VisitExportItem[]): string[] {
  const set = new Set<string>();
  for (const c of checkIns) {
    set.add(getRegionGroupKey(c));
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function getSortedUniqueBusinessTypes(checkIns: VisitExportItem[]): string[] {
  const set = new Set<string>();
  for (const c of checkIns) {
    set.add(c.businessType ?? 'Not set');
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

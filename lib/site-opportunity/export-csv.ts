import type {
  BranchCatchmentOpportunity,
  GreenfieldOpportunityZone,
  SiteOpportunityZone,
} from '@/api/types/site-opportunity';

function formatZar(n: number): string {
  if (n >= 1_000_000) return `R ${(n / 1_000_000).toFixed(2)}m`;
  if (n >= 1_000) return `R ${(n / 1_000).toFixed(0)}k`;
  return `R ${Math.round(n)}`;
}

function timelineSummary(zone: SiteOpportunityZone): string {
  const last = zone.captureTimeline[zone.captureTimeline.length - 1];
  if (!last) return '';
  return `m${last.month} mid ${formatZar(last.revenueMidZAR)}`;
}

function zoneRow(zone: SiteOpportunityZone): string[] {
  const base = [
    String(zone.rank),
    zone.kind,
    zone.kind === 'catchment' ? zone.branchName : zone.label,
    zone.lat.toFixed(5),
    zone.lng.toFixed(5),
    String(zone.clientCount),
    String(zone.competitorCount),
    formatZar(zone.addressablePoolZAR),
    formatZar(zone.potentialLowZAR),
    formatZar(zone.potentialHighZAR),
    String(Math.round(zone.opportunityScore)),
    zone.monthsToTargetMid != null ? String(zone.monthsToTargetMid) : '',
    timelineSummary(zone),
  ];

  const brands = zone.byBrand.map((b) => `${b.brand}:${b.count}`).join('; ');

  if (zone.kind === 'catchment') {
    base.push(
      zone.actualRevenueZAR != null ? formatZar(zone.actualRevenueZAR) : '',
      zone.revenueGapZAR != null ? formatZar(zone.revenueGapZAR) : '',
      brands,
    );
  } else {
    base.push(
      zone.nearestBranchKm != null ? zone.nearestBranchKm.toFixed(1) : '',
      '',
      brands,
    );
  }

  return base;
}

export function exportOpportunitiesCsv(
  catchments: BranchCatchmentOpportunity[],
  greenfield: GreenfieldOpportunityZone[]
): string {
  const headers = [
    'Rank',
    'Type',
    'Name',
    'Latitude',
    'Longitude',
    'Clients in radius',
    'Competitors in radius',
    'Addressable pool',
    'Potential low',
    'Potential high',
    'Opportunity score',
    'Months to 55% mid potential',
    'Timeline end (mid)',
    'Actual revenue / Nearest branch km',
    'Revenue gap / spare',
    'Brands in radius',
  ];

  const rows = [...catchments, ...greenfield].map(zoneRow);
  const escape = (v: string) => {
    if (v.includes(',') || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  return [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
}

export function downloadOpportunitiesCsv(
  catchments: BranchCatchmentOpportunity[],
  greenfield: GreenfieldOpportunityZone[],
  filename = 'site-opportunities.csv'
): void {
  const csv = exportOpportunitiesCsv(catchments, greenfield);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

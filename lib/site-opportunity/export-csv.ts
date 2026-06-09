import type {
  BranchCatchmentOpportunity,
  GreenfieldOpportunityZone,
  SiteOpportunitySettings,
  SiteOpportunityZone,
} from '@/api/types/site-opportunity';

function zarRaw(n: number): string {
  return String(Math.round(n));
}

function timelineSummary(zone: SiteOpportunityZone): string {
  const last = zone.captureTimeline[zone.captureTimeline.length - 1];
  if (!last) return '';
  return `month ${last.month}: ${zarRaw(last.revenueMidZAR)} ZAR (mid scenario)`;
}

function brandsColumn(zone: SiteOpportunityZone): string {
  return zone.byBrand.map((b) => `${b.brand}×${b.count}`).join('; ');
}

function catchmentRow(
  zone: BranchCatchmentOpportunity,
  settings: SiteOpportunitySettings,
): string[] {
  return [
    String(zone.rank),
    'Branch catchment',
    zone.branchName,
    zone.lat.toFixed(5),
    zone.lng.toFixed(5),
    String(settings.radiusMeters / 1000),
    String(zone.clientCount),
    String(zone.competitorCount),
    zarRaw(zone.addressablePoolZAR),
    zarRaw(zone.potentialLowZAR),
    zarRaw(zone.potentialHighZAR),
    String(Math.round(settings.captureLowPct * 100)),
    String(Math.round(settings.captureHighPct * 100)),
    zone.actualRevenueZAR != null ? zarRaw(zone.actualRevenueZAR) : '',
    zone.revenueGapZAR != null ? zarRaw(zone.revenueGapZAR) : '',
    '',
    zone.monthsToTargetMid != null ? String(zone.monthsToTargetMid) : '',
    timelineSummary(zone),
    brandsColumn(zone),
  ];
}

function greenfieldRow(
  zone: GreenfieldOpportunityZone,
  settings: SiteOpportunitySettings,
): string[] {
  return [
    String(zone.rank),
    'New site',
    zone.label,
    zone.lat.toFixed(5),
    zone.lng.toFixed(5),
    String(settings.radiusMeters / 1000),
    String(zone.clientCount),
    String(zone.competitorCount),
    zarRaw(zone.addressablePoolZAR),
    zarRaw(zone.potentialLowZAR),
    zarRaw(zone.potentialHighZAR),
    String(Math.round(settings.captureLowPct * 100)),
    String(Math.round(settings.captureHighPct * 100)),
    '',
    '',
    zone.nearestBranchKm != null ? zone.nearestBranchKm.toFixed(1) : '',
    zone.monthsToTargetMid != null ? String(zone.monthsToTargetMid) : '',
    timelineSummary(zone),
    brandsColumn(zone),
  ];
}

const HEADERS = [
  'Rank',
  'Type',
  'Name',
  'Latitude',
  'Longitude',
  'Radius km',
  'Clients in radius',
  'Competitors in radius',
  'Addressable pool ZAR',
  'Potential low ZAR',
  'Potential high ZAR',
  'Capture low %',
  'Capture high %',
  'Actual revenue ZAR',
  'Revenue gap ZAR',
  'Nearest branch km',
  'Months to 55% mid potential',
  'Timeline end (mid scenario)',
  'Brands in radius',
];

export function exportOpportunitiesCsv(
  catchments: BranchCatchmentOpportunity[],
  greenfield: GreenfieldOpportunityZone[],
  settings: SiteOpportunitySettings,
): string {
  const escape = (v: string) => {
    if (v.includes(',') || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const meta = [
    '# Site opportunity export',
    '# Method: haversine radius (not drive time). Overlapping catchments may double-count nationally.',
    `# Radius: ${settings.radiusMeters / 1000} km | Capture: ${Math.round(settings.captureLowPct * 100)}–${Math.round(settings.captureHighPct * 100)}% | New sites placed at competitor cluster centroid`,
  ];

  const rows = [
    ...catchments.map((z) => catchmentRow(z, settings)),
    ...greenfield.map((z) => greenfieldRow(z, settings)),
  ];

  return [
    ...meta,
    HEADERS.map(escape).join(','),
    ...rows.map((r) => r.map(escape).join(',')),
  ].join('\n');
}

export function downloadOpportunitiesCsv(
  catchments: BranchCatchmentOpportunity[],
  greenfield: GreenfieldOpportunityZone[],
  settings: SiteOpportunitySettings,
  filename = 'site-opportunities.csv',
): void {
  const csv = exportOpportunitiesCsv(catchments, greenfield, settings);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

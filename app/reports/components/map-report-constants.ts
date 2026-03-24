/** Palette for map marker rings, influence spheres, and legend (aligned with reports visualiser). */
export const MARKER_COLORS: Record<string, string> = {
  'check-in': '#2563eb',
  'shift-start': '#0d9488',
  'shift-end': '#ea580c',
  'break-start': '#a855f7',
  'break-end': '#7c3aed',
  client: '#16a34a',
  competitor: '#dc2626',
  lead: '#9333ea',
  'check-in-visit': '#0891b2',
  branch: '#854d0e',
  task: '#ca8a04',
  journal: '#64748b',
  quotation: '#db2777',
  claim: '#b45309',
};

export const MARKER_TYPE_LABELS: Record<string, string> = {
  'check-in': 'Active check-in',
  'shift-start': 'Shift start',
  'shift-end': 'Shift end',
  'break-start': 'Break start',
  'break-end': 'Break end',
  client: 'Client',
  competitor: 'Competitor',
  lead: 'Lead',
  'check-in-visit': 'Visit (check-in)',
  branch: 'Branch',
  task: 'Task',
  journal: 'Journal',
  quotation: 'Quotation (sales)',
  claim: 'Claim',
};

export function markerTypeLabel(markerType: string): string {
  return MARKER_TYPE_LABELS[markerType] ?? markerType;
}

export function influenceColorForKind(kind: string): string {
  return MARKER_COLORS[kind] ?? '#64748b';
}

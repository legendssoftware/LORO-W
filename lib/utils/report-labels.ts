/**
 * Display helpers for analytics / report charts (enum-like keys, owner names).
 */

/** e.g. SOCIAL_MEDIA → "Social Media", Unknown → "Unknown" */
export function humanizeReportLabel(raw: string): string {
  const t = raw.trim();
  if (!t) return 'Unknown';
  const lower = t.toLowerCase();
  if (lower === 'unknown' || lower === 'unassigned') {
    return lower === 'unknown' ? 'Unknown' : 'Unassigned';
  }
  return t
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** "Lynette Banda" → "L Banda"; single token unchanged; Unassigned unchanged */
export function formatOwnerChartName(fullName: string): string {
  const t = fullName.trim();
  if (!t) return fullName;
  if (t.toLowerCase() === 'unassigned') return t;
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return t;
  const first = parts[0];
  const last = parts[parts.length - 1];
  return `${first.charAt(0)} ${last}`;
}

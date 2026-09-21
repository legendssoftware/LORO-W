/** Default Google Maps search terms scoped to BitDrywall construction materials. */
export const DEFAULT_BITDRYWALL_SEARCH_TERMS = [
  'drywall',
  'plasterboard',
  'ceiling boards',
  'building materials',
] as const;

/** Extra BitDrywall-related terms the user can add if slots remain. */
export const EXTRA_BITDRYWALL_SEARCH_TERMS = [
  'gypsum',
  'partition systems',
] as const;

export function defaultBitdrywallSearchText(): string {
  return DEFAULT_BITDRYWALL_SEARCH_TERMS.join('\n');
}

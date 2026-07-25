/**
 * Resolve map pin logos from `web/public/competitor/*.png`.
 * Branches + HQ use bitdrywall; competitors match brand slug to filename.
 */

export const COMPETITOR_LOGO_SLUGS = [
  'bitdrywall',
  'buco',
  'builders',
  'buildit',
  'builtmart',
  'capco',
  'cashbuild',
  'cds',
  'lstafrica',
  'pelicansystems',
  'powerbuild',
  'solid',
  'supertec',
  'ubs',
] as const;

export type CompetitorLogoSlug = (typeof COMPETITOR_LOGO_SLUGS)[number];

/** Branch + HQ pin. */
export const BRANCH_HQ_LOGO_SLUG: CompetitorLogoSlug = 'bitdrywall';

const SLUG_ALIASES: Record<string, CompetitorLogoSlug> = {
  bitdrywall: 'bitdrywall',
  'bit drywall': 'bitdrywall',
  'bit_drywall': 'bitdrywall',
  buco: 'buco',
  builders: 'builders',
  buildit: 'buildit',
  'build it': 'buildit',
  'build-it': 'buildit',
  builtmart: 'builtmart',
  'built mart': 'builtmart',
  capco: 'capco',
  cashbuild: 'cashbuild',
  'cash build': 'cashbuild',
  cds: 'cds',
  lstafrica: 'lstafrica',
  'lst africa': 'lstafrica',
  'lst-africa': 'lstafrica',
  pelicansystems: 'pelicansystems',
  'pelican systems': 'pelicansystems',
  'pelican-systems': 'pelicansystems',
  powerbuild: 'powerbuild',
  'power build': 'powerbuild',
  solid: 'solid',
  supertec: 'supertec',
  ubs: 'ubs',
};

export function competitorLogoPublicPath(slug: CompetitorLogoSlug): string {
  return `/competitor/${slug}.png`;
}

function normalizeBrandKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Match a competitor display name / LegalEntity / accountName to a public logo slug.
 */
export function resolveCompetitorLogoSlug(
  name?: string | null,
  extras?: { accountName?: string | null; legalEntity?: string | null; tradingName?: string | null }
): CompetitorLogoSlug | null {
  const candidates = [name, extras?.accountName, extras?.legalEntity, extras?.tradingName]
    .map((v) => (v ?? '').trim())
    .filter(Boolean);

  for (const raw of candidates) {
    const key = normalizeBrandKey(raw);
    if (SLUG_ALIASES[key]) return SLUG_ALIASES[key];

    for (const [alias, slug] of Object.entries(SLUG_ALIASES)) {
      if (key === alias || key.startsWith(`${alias} `) || key.includes(` ${alias} `)) {
        return slug;
      }
    }

    for (const slug of COMPETITOR_LOGO_SLUGS) {
      if (slug === 'bitdrywall') continue;
      if (key.includes(slug) || key.replace(/\s/g, '') === slug) return slug;
    }
  }

  return null;
}

export function resolveCompetitorLogoUrl(
  name?: string | null,
  extras?: { accountName?: string | null; legalEntity?: string | null; tradingName?: string | null }
): string | null {
  const slug = resolveCompetitorLogoSlug(name, extras);
  return slug ? competitorLogoPublicPath(slug) : null;
}

export function branchOrHqLogoUrl(): string {
  return competitorLogoPublicPath(BRANCH_HQ_LOGO_SLUG);
}

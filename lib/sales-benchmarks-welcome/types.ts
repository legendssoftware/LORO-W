export type SalesBenchmarksLocale =
  | 'en'
  | 'af'
  | 'xh'
  | 'pt'
  | 'fr'
  | 'zu'
  | 'nso'
  | 'st'
  | 'sn'
  | 'tn';

export type NoticeSection = {
  title?: string;
  intro?: string;
  bullets?: readonly string[];
  paragraphs?: readonly string[];
};

export type SalesBenchmarksContent = {
  noticeTitle: string;
  noticeSubtitle: string;
  effectiveDate?: string;
  greeting: string;
  introParagraphs: readonly string[];
  emphasisIntro: string;
  emphasisBullets: readonly string[];
  minimumDailyHeading?: string;
  table?: { headers: readonly string[]; rows: readonly (readonly string[])[] };
  sections: readonly NoticeSection[];
  closingParagraphs: readonly string[];
  acknowledgeLabel: string;
  closingSignature: string;
};

export const SALES_BENCHMARKS_LOCALE_OPTIONS: readonly {
  id: SalesBenchmarksLocale;
  label: string;
}[] = [
  { id: 'en', label: 'English' },
  { id: 'af', label: 'Afrikaans' },
  { id: 'xh', label: 'Xhosa' },
  { id: 'pt', label: 'Portuguese' },
  { id: 'fr', label: 'French' },
  { id: 'zu', label: 'Zulu' },
  { id: 'nso', label: 'Sepedi' },
  { id: 'st', label: 'Sotho' },
  { id: 'sn', label: 'Shona' },
  { id: 'tn', label: 'Setswana' },
];

export const DEFAULT_SALES_BENCHMARKS_LOCALE: SalesBenchmarksLocale = 'en';

export const SALES_BENCHMARKS_LANG_ATTR: Record<SalesBenchmarksLocale, string> = {
  en: 'en',
  af: 'af',
  xh: 'xh',
  pt: 'pt',
  fr: 'fr',
  zu: 'zu',
  nso: 'nso',
  st: 'st',
  sn: 'sn',
  tn: 'tn',
};

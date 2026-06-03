/**
 * @deprecated Import from `@/lib/sales-benchmarks-welcome` instead.
 * Re-exports English copy for any legacy imports.
 */
export {
  DEFAULT_SALES_BENCHMARKS_LOCALE,
  SALES_BENCHMARKS_BY_LOCALE,
  SALES_BENCHMARKS_LOCALE_OPTIONS,
  type NoticeSection,
  type SalesBenchmarksContent,
  type SalesBenchmarksLocale,
} from './sales-benchmarks-welcome';

import { SALES_BENCHMARKS_BY_LOCALE } from './sales-benchmarks-welcome';

const en = SALES_BENCHMARKS_BY_LOCALE.en;

export const NOTICE_TITLE = en.noticeTitle;
export const NOTICE_SUBTITLE = en.noticeSubtitle;
export const NOTICE_EFFECTIVE_DATE = en.effectiveDate;
export const NOTICE_GREETING = en.greeting;
export const NOTICE_INTRO_PARAGRAPHS = en.introParagraphs;
export const NOTICE_EMPHASIS_INTRO = en.emphasisIntro;
export const NOTICE_EMPHASIS_BULLETS = en.emphasisBullets;
export const MINIMUM_DAILY_REQUIREMENTS_HEADING = en.minimumDailyHeading;
export const MINIMUM_DAILY_REQUIREMENTS_TABLE = en.table;
export const NOTICE_SECTIONS = en.sections;
export const NOTICE_CLOSING_PARAGRAPHS = en.closingParagraphs;

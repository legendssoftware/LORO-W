import { salesBenchmarksAf } from './af';
import { salesBenchmarksEn } from './en';
import { salesBenchmarksFr } from './fr';
import { salesBenchmarksNso } from './nso';
import { salesBenchmarksPt } from './pt';
import { salesBenchmarksSn } from './sn';
import { salesBenchmarksSt } from './st';
import { salesBenchmarksTn } from './tn';
import { salesBenchmarksXh } from './xh';
import { salesBenchmarksZu } from './zu';
import {
  DEFAULT_SALES_BENCHMARKS_LOCALE,
  SALES_BENCHMARKS_LANG_ATTR,
  SALES_BENCHMARKS_LOCALE_OPTIONS,
  type SalesBenchmarksContent,
  type SalesBenchmarksLocale,
  type NoticeSection,
} from './types';

export {
  DEFAULT_SALES_BENCHMARKS_LOCALE,
  SALES_BENCHMARKS_LANG_ATTR,
  SALES_BENCHMARKS_LOCALE_OPTIONS,
  type SalesBenchmarksContent,
  type SalesBenchmarksLocale,
  type NoticeSection,
};

export const SALES_BENCHMARKS_BY_LOCALE: Record<SalesBenchmarksLocale, SalesBenchmarksContent> = {
  en: salesBenchmarksEn,
  af: salesBenchmarksAf,
  xh: salesBenchmarksXh,
  pt: salesBenchmarksPt,
  fr: salesBenchmarksFr,
  zu: salesBenchmarksZu,
  nso: salesBenchmarksNso,
  st: salesBenchmarksSt,
  sn: salesBenchmarksSn,
  tn: salesBenchmarksTn,
};

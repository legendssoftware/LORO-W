import type { OrganisationNoticeRecord } from '@/api/types/organisation-notice';
import type { SalesBenchmarksContent, SalesBenchmarksLocale } from '@/lib/sales-benchmarks-welcome/types';
import { SALES_BENCHMARKS_LOCALE_OPTIONS } from '@/lib/sales-benchmarks-welcome/types';

export function buildNoticeContentFromRecord(
  notice: OrganisationNoticeRecord,
  locale: string
): SalesBenchmarksContent {
  const translated = notice.translations?.[locale];
  if (translated) {
    return {
      ...translated,
      noticeTitle: translated.noticeTitle || notice.title,
      noticeSubtitle: translated.noticeSubtitle || notice.subtitle,
    };
  }

  return {
    ...notice.content,
    noticeTitle: notice.content.noticeTitle || notice.title,
    noticeSubtitle: notice.content.noticeSubtitle || notice.subtitle,
  };
}

export function buildNoticeLocaleMap(
  notice: OrganisationNoticeRecord
): Partial<Record<SalesBenchmarksLocale, SalesBenchmarksContent>> {
  const locales = new Set<string>(['en', ...Object.keys(notice.translations ?? {})]);
  const map: Partial<Record<SalesBenchmarksLocale, SalesBenchmarksContent>> = {};

  for (const locale of locales) {
    map[locale as SalesBenchmarksLocale] = buildNoticeContentFromRecord(notice, locale);
  }

  return map;
}

export function getNoticeLocaleOptions(notice: OrganisationNoticeRecord) {
  const localeIds = new Set<string>(['en', ...Object.keys(notice.translations ?? {})]);
  return SALES_BENCHMARKS_LOCALE_OPTIONS.filter((option) => localeIds.has(option.id));
}

export function getNoticeStatus(notice: OrganisationNoticeRecord, now = new Date()): 'disabled' | 'scheduled' | 'active' | 'expired' {
  if (!notice.isEnabled) return 'disabled';
  const from = new Date(notice.showFrom);
  const until = notice.showUntil ? new Date(notice.showUntil) : null;
  if (from > now) return 'scheduled';
  if (until && until < now) return 'expired';
  return 'active';
}

/** Schedule line for notice list cards: until-date vs 3-times default. */
export function getNoticeDisplayScheduleLabel(notice: OrganisationNoticeRecord): string {
  const from = `Show from ${new Date(notice.showFrom).toLocaleString()}`;
  if (notice.showUntil) {
    return `${from} until ${new Date(notice.showUntil).toLocaleString()}`;
  }
  return `${from} · 3 times per user`;
}

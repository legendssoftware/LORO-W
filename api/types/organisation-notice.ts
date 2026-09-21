import type { NoticeSection, SalesBenchmarksContent } from '@/lib/sales-benchmarks-welcome/types';

export const ORGANISATION_NOTICE_THEMES = ['alert', 'policy'] as const;

export type OrganisationNoticeTheme = (typeof ORGANISATION_NOTICE_THEMES)[number];

export const DEFAULT_ORGANISATION_NOTICE_THEME: OrganisationNoticeTheme = 'alert';

export type OrganisationNoticeContent = SalesBenchmarksContent;

export type OrganisationNoticeRecord = {
  uid: number;
  title: string;
  subtitle: string;
  content: OrganisationNoticeContent;
  translations: Record<string, OrganisationNoticeContent> | null;
  showFrom: string;
  showUntil: string | null;
  theme: OrganisationNoticeTheme;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateOrganisationNoticeBody = {
  title: string;
  subtitle: string;
  content: OrganisationNoticeContent;
  translations?: Record<string, OrganisationNoticeContent>;
  showFrom: string;
  showUntil?: string | null;
  theme?: OrganisationNoticeTheme;
  isEnabled?: boolean;
};

export type PatchOrganisationNoticeBody = Partial<CreateOrganisationNoticeBody>;

export type GetOrganisationNoticesResponse = {
  notices: OrganisationNoticeRecord[];
};

export type GetActiveOrganisationNoticeResponse = {
  notice: OrganisationNoticeRecord | null;
};

export type AcknowledgeOrganisationNoticeResponse = {
  viewCount: number;
  maxViews: number;
  capped: boolean;
};

export type NoticeSectionForm = NoticeSection;

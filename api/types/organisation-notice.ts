import type { NoticeSection, SalesBenchmarksContent } from '@/lib/sales-benchmarks-welcome/types';

export type OrganisationNoticeContent = SalesBenchmarksContent;

export type OrganisationNoticeRecord = {
  uid: number;
  title: string;
  subtitle: string;
  content: OrganisationNoticeContent;
  translations: Record<string, OrganisationNoticeContent> | null;
  showFrom: string;
  showUntil: string | null;
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

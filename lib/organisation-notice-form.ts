import type { CreateOrganisationNoticeBody } from '@/api/types/organisation-notice';
import type { NoticeSection } from '@/lib/sales-benchmarks-welcome/types';

export const NOTICE_SECTION_LABELS = [
  'Career impact paragraph',
  'Company investment paragraph',
  'Report misconduct paragraph',
  'Simple message (title + text)',
  'Consequences (intro + bullets)',
  'Closing policy paragraph',
] as const;

export const NOTICE_FORM_PLACEHOLDERS = {
  title: 'Notice title',
  subtitle: 'Notice subtitle',
  greeting: 'Greeting',
  introParagraphs: 'One paragraph per line',
  emphasisIntro: 'Emphasis intro',
  emphasisBullets: 'One bullet per line',
  sectionTitle: 'Section title',
  sectionIntro: 'Section intro',
  sectionParagraphs: 'One paragraph per line',
  sectionBullets: 'One bullet per line',
  closingParagraphs: 'One paragraph per line',
  closingSignature: 'Closing signature',
  acknowledgeLabel: 'Acknowledge button label',
} as const;

export function emptyNoticeBody(): CreateOrganisationNoticeBody {
  const now = new Date();
  const until = new Date(now);
  until.setFullYear(until.getFullYear() + 1);

  return {
    title: '',
    subtitle: '',
    content: {
      noticeTitle: '',
      noticeSubtitle: '',
      greeting: '',
      introParagraphs: [],
      emphasisIntro: '',
      emphasisBullets: [],
      sections: Array.from({ length: 6 }, () => ({})),
      closingParagraphs: [],
      acknowledgeLabel: '',
      closingSignature: '',
    },
    showFrom: now.toISOString(),
    showUntil: until.toISOString(),
    isEnabled: true,
  };
}

export function emptySection(): NoticeSection {
  return {};
}

export function linesToArray(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function arrayToLines(value: readonly string[] | undefined): string {
  return value?.join('\n') ?? '';
}

export function normalizeNoticeFormForSave(
  form: CreateOrganisationNoticeBody
): CreateOrganisationNoticeBody {
  return {
    ...form,
    content: {
      ...form.content,
      noticeTitle: form.title,
      noticeSubtitle: form.subtitle,
    },
  };
}

export function updateSection(
  form: CreateOrganisationNoticeBody,
  index: number,
  patch: Partial<NoticeSection>
): CreateOrganisationNoticeBody {
  const sections = [...form.content.sections];
  sections[index] = { ...sections[index], ...patch };
  return {
    ...form,
    content: { ...form.content, sections },
  };
}

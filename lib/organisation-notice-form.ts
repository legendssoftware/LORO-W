import {
  DEFAULT_ORGANISATION_NOTICE_THEME,
  type CreateOrganisationNoticeBody,
  type OrganisationNoticeContent,
} from '@/api/types/organisation-notice';

export const DEFAULT_NOTICE_ACKNOWLEDGE_LABEL = 'I have read and understood this notice';

export const NOTICE_FORM_PLACEHOLDERS = {
  header: 'First line is the title. Further lines are the subtitle.',
  body: 'Separate paragraphs with a blank line.',
  footer: 'Closing lines. The last line is the signature.',
} as const;

export type NoticeCopyFields = {
  header: string;
  body: string;
  footer: string;
};

export function emptyNoticeBody(): CreateOrganisationNoticeBody {
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
      sections: [],
      closingParagraphs: [],
      acknowledgeLabel: DEFAULT_NOTICE_ACKNOWLEDGE_LABEL,
      closingSignature: '',
    },
    showFrom: new Date().toISOString(),
    showUntil: null,
    theme: DEFAULT_ORGANISATION_NOTICE_THEME,
    isEnabled: true,
  };
}

/** End of today, used when switching a notice into until-date mode. */
export function defaultShowUntilIso(): string {
  const until = new Date();
  until.setHours(23, 59, 0, 0);
  return until.toISOString();
}

export type NoticeDisplayMode = 'three-times' | 'until-date';

export function getNoticeDisplayMode(form: CreateOrganisationNoticeBody): NoticeDisplayMode {
  return form.showUntil ? 'until-date' : 'three-times';
}

export function applyNoticeDisplayMode(
  form: CreateOrganisationNoticeBody,
  mode: NoticeDisplayMode
): CreateOrganisationNoticeBody {
  switch (mode) {
    case 'three-times':
      return { ...form, showUntil: null };
    case 'until-date':
      return { ...form, showUntil: form.showUntil ?? defaultShowUntilIso() };
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

function trimmedOrNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed : null;
}

/** Flatten a stored notice into the three editor fields. */
export function noticeCopyFromForm(form: CreateOrganisationNoticeBody): NoticeCopyFields {
  const title = form.title.trim();
  const subtitle = form.subtitle.trim();
  const header = subtitle && subtitle !== title ? `${title}\n${subtitle}` : title;
  const paragraphs: string[] = [];
  const greeting = trimmedOrNull(form.content.greeting);
  if (greeting) paragraphs.push(greeting);
  for (const paragraph of form.content.introParagraphs) {
    const line = trimmedOrNull(paragraph);
    if (line) paragraphs.push(line);
  }
  const emphasisIntro = trimmedOrNull(form.content.emphasisIntro);
  if (emphasisIntro) paragraphs.push(emphasisIntro);
  for (const bullet of form.content.emphasisBullets) {
    const line = trimmedOrNull(bullet);
    if (line) paragraphs.push(line);
  }
  for (const section of form.content.sections) {
    const sectionTitle = trimmedOrNull(section.title);
    if (sectionTitle) paragraphs.push(sectionTitle);
    const intro = trimmedOrNull(section.intro);
    if (intro) paragraphs.push(intro);
    for (const paragraph of section.paragraphs ?? []) {
      const line = trimmedOrNull(paragraph);
      if (line) paragraphs.push(line);
    }
    for (const bullet of section.bullets ?? []) {
      const line = trimmedOrNull(bullet);
      if (line) paragraphs.push(line);
    }
  }

  const footerLines = form.content.closingParagraphs.map((line) => line.trim()).filter(Boolean);
  const signature = form.content.closingSignature.trim();
  if (signature && footerLines[footerLines.length - 1] !== signature) {
    footerLines.push(signature);
  }

  return {
    header,
    body: paragraphs.join('\n\n'),
    footer: footerLines.join('\n'),
  };
}

/**
 * Write header, body, and footer back onto the notice payload.
 * Emphasis, sections, and table data are cleared because the editor no longer collects them.
 */
export function applyNoticeCopy(
  form: CreateOrganisationNoticeBody,
  copy: NoticeCopyFields,
): CreateOrganisationNoticeBody {
  const headerLines = copy.header
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const title = headerLines[0] ?? '';
  const subtitle = headerLines.slice(1).join('\n');
  const introParagraphs = copy.body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const footerLines = copy.footer
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const closingSignature = footerLines[footerLines.length - 1] ?? ' ';
  const content: OrganisationNoticeContent = {
    noticeTitle: title,
    noticeSubtitle: subtitle,
    greeting: '',
    introParagraphs,
    emphasisIntro: '',
    emphasisBullets: [],
    sections: [],
    closingParagraphs: footerLines,
    acknowledgeLabel: DEFAULT_NOTICE_ACKNOWLEDGE_LABEL,
    closingSignature,
  };

  return {
    ...form,
    title,
    subtitle,
    translations: null,
    content,
  };
}

export function normalizeNoticeFormForSave(
  form: CreateOrganisationNoticeBody,
  copy: NoticeCopyFields,
): CreateOrganisationNoticeBody {
  return applyNoticeCopy(form, copy);
}

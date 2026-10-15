import type { Journal } from '@/api/types/journal';

const DOCUMENT_EXTENSION = /\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip)(\?|#|$)/i;

/** True when a URL should be rendered as a photo rather than a file link. */
export function isMerchandiseImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  return !DOCUMENT_EXTENSION.test(trimmed);
}

function uniqueUrls(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const value of values) {
    const url = value?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

/** Photo URLs from the primary file and any extra attachments. */
export function merchandiseImageUrls(journal: Pick<Journal, 'fileURL' | 'attachments'>): string[] {
  return uniqueUrls([journal.fileURL, ...(journal.attachments ?? [])]).filter(isMerchandiseImageUrl);
}

/** Non-image attachments, kept as download links. */
export function merchandiseFileUrls(journal: Pick<Journal, 'fileURL' | 'attachments'>): string[] {
  return uniqueUrls([journal.fileURL, ...(journal.attachments ?? [])]).filter(
    (url) => !isMerchandiseImageUrl(url)
  );
}

/** Last path segment of a file URL, for link labels. */
export function merchandiseFileLabel(url: string): string {
  try {
    const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
    return name || 'Attachment';
  } catch {
    return 'Attachment';
  }
}

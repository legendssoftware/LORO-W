/** Matches POST /docs/upload MaxFileSizeValidator (size must be strictly under 5 MB). */
export const LEAD_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;

const LEAD_ATTACHMENT_EXTENSION =
  /\.(jpe?g|png|gif|webp|heic|heif|bmp|pdf|docx?|xlsx?|txt|csv)$/i;

const LEAD_ATTACHMENT_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/bmp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]);

/**
 * Whether a lead attachment is a small document or photo. SVG is excluded.
 */
export function isAllowedLeadAttachment(file: File): boolean {
  if (file.size <= 0 || file.size > LEAD_ATTACHMENT_MAX_BYTES) return false;
  if (file.type.toLowerCase() === 'image/svg+xml' || /\.svg$/i.test(file.name)) return false;
  if (!LEAD_ATTACHMENT_EXTENSION.test(file.name)) return false;
  const mime = file.type.toLowerCase();
  if (mime === '' || mime === 'application/octet-stream') return true;
  return LEAD_ATTACHMENT_MIME.has(mime);
}

/**
 * Attachment links are opened in a new tab, so only https URLs are linked.
 */
export function isHttpsAttachmentUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

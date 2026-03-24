export type AttachmentPresentation = 'image' | 'audio' | 'video' | 'file';

/**
 * Infer how to render an interaction attachment from its public URL (path extension).
 */
export function inferAttachmentPresentation(url: string): AttachmentPresentation {
  const trimmed = (url ?? '').trim();
  if (!trimmed) return 'file';
  try {
    const path = new URL(trimmed).pathname.toLowerCase();
    if (/\.(jpe?g|png|gif|webp|svg)$/.test(path)) return 'image';
    if (/\.(mp3|wav|m4a|aac|ogg|flac)$/.test(path)) return 'audio';
    if (/\.(mp4|webm|mov)$/.test(path)) return 'video';
    return 'file';
  } catch {
    const lower = trimmed.toLowerCase();
    if (/\.(jpe?g|png|gif|webp|svg)(\?|#|$)/.test(lower)) return 'image';
    if (/\.(mp3|wav|m4a|aac|ogg|flac)(\?|#|$)/.test(lower)) return 'audio';
    if (/\.(mp4|webm|mov)(\?|#|$)/.test(lower)) return 'video';
    return 'file';
  }
}

export function fileLabelFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const seg = path.split('/').filter(Boolean).pop();
    return seg && seg.length > 0 ? decodeURIComponent(seg) : 'File';
  } catch {
    return 'File';
  }
}

import { describe, expect, it } from 'vitest';
import {
  MAX_VISIT_MEDIA_BYTES,
  formatVisitFileSize,
  isAllowedVisitMediaFile,
  visitMediaFileKind,
} from './visit-media-upload';

describe('visit media helpers', () => {
  it('classifies common file types', () => {
    expect(visitMediaFileKind('meeting-note.pdf', 'application/pdf')).toBe('PDF');
    expect(visitMediaFileKind('brief.docx')).toBe('WORD');
    expect(visitMediaFileKind('clip.mp4', 'video/mp4')).toBe('MP4');
    expect(visitMediaFileKind('photo.png', 'image/png')).toBe('IMG');
    expect(visitMediaFileKind('item.heic')).toBe('IMG');
    expect(visitMediaFileKind('item.heif')).toBe('IMG');
  });

  it('formats file sizes', () => {
    expect(formatVisitFileSize(511)).toBe('511 B');
    expect(formatVisitFileSize(511 * 1024)).toBe('511.0 KB');
    expect(formatVisitFileSize(4.9 * 1024 * 1024)).toBe('4.9 MB');
  });

  it('allows docs-upload types within 5MB', () => {
    expect(MAX_VISIT_MEDIA_BYTES).toBe(5 * 1024 * 1024);
    const jpg = new File(['ok'], 'site.jpg', { type: 'image/jpeg' });
    expect(isAllowedVisitMediaFile(jpg)).toBe(true);
    const pdf = new File(['ok'], 'quote.pdf', { type: 'application/pdf' });
    expect(isAllowedVisitMediaFile(pdf)).toBe(true);
  });

  it('allows HEIC photos from iPhones', () => {
    const heic = new File(['ok'], 'site.heic', { type: 'image/heic' });
    expect(isAllowedVisitMediaFile(heic)).toBe(true);
    const unnamedHeic = new File(['ok'], 'site.heic', { type: '' });
    expect(isAllowedVisitMediaFile(unnamedHeic)).toBe(true);
  });

  it('rejects oversized or unsupported visit files', () => {
    const big = new File([new Uint8Array(MAX_VISIT_MEDIA_BYTES + 1)], 'site.jpg', {
      type: 'image/jpeg',
    });
    expect(isAllowedVisitMediaFile(big)).toBe(false);
    const video = new File(['ok'], 'clip.mp4', { type: 'video/mp4' });
    expect(isAllowedVisitMediaFile(video)).toBe(false);
  });
});

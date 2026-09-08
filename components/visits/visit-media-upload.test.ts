import { describe, expect, it } from 'vitest';
import { formatVisitFileSize, visitMediaFileKind } from './visit-media-upload';

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
});

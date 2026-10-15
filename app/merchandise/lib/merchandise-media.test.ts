import { describe, expect, it } from 'vitest';
import {
  isMerchandiseImageUrl,
  merchandiseFileUrls,
  merchandiseImageUrls,
} from './merchandise-media';

describe('merchandise media urls', () => {
  const journal = {
    fileURL: 'https://cdn.example.com/photo.jpg',
    attachments: [
      'https://res.cloudinary.com/demo/image/upload/v1/shelf',
      'https://cdn.example.com/photo.jpg',
      'https://cdn.example.com/notes.pdf',
    ],
  };

  it('keeps http images, including hosts without a file extension', () => {
    expect(isMerchandiseImageUrl('https://res.cloudinary.com/demo/image/upload/v1/shelf')).toBe(true);
    expect(isMerchandiseImageUrl('https://cdn.example.com/notes.pdf')).toBe(false);
    expect(isMerchandiseImageUrl('not-a-url')).toBe(false);
  });

  it('splits photos from documents and drops duplicates', () => {
    expect(merchandiseImageUrls(journal)).toEqual([
      'https://cdn.example.com/photo.jpg',
      'https://res.cloudinary.com/demo/image/upload/v1/shelf',
    ]);
    expect(merchandiseFileUrls(journal)).toEqual(['https://cdn.example.com/notes.pdf']);
  });
});

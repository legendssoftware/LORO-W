import { describe, expect, it, vi } from 'vitest';
import {
  MERCHANDISE_PHOTO_MAX_BYTES,
  MERCHANDISE_PHOTO_TOO_LARGE,
  compressMerchandisePhoto,
  isMerchandisePhotoFile,
  merchandisePhotoUploadMessage,
} from './compress-merchandise-photo';

describe('compressMerchandisePhoto', () => {
  it('treats image mime types and photo extensions as compressible', () => {
    expect(isMerchandisePhotoFile(new File(['a'], 'shelf.jpg', { type: 'image/jpeg' }))).toBe(true);
    expect(isMerchandisePhotoFile(new File(['a'], 'IMG.HEIC', { type: '' }))).toBe(true);
    expect(isMerchandisePhotoFile(new File(['a'], 'notes.pdf', { type: 'application/pdf' }))).toBe(false);
  });

  it('returns a photo already under 5 MB without encoding', async () => {
    const file = new File([new Uint8Array(100)], 'shelf.jpg', { type: 'image/jpeg' });
    const encode = vi.fn();
    await expect(compressMerchandisePhoto(file, { encode })).resolves.toBe(file);
    expect(encode).not.toHaveBeenCalled();
  });

  it('skips non-images', async () => {
    const file = new File([new Uint8Array(8)], 'notes.pdf', { type: 'application/pdf' });
    const encode = vi.fn();
    await expect(compressMerchandisePhoto(file, { encode })).resolves.toBe(file);
    expect(encode).not.toHaveBeenCalled();
  });

  it('uploads the first encoded blob under 5 MB', async () => {
    const file = new File([new Uint8Array(32)], '1000140806.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: MERCHANDISE_PHOTO_MAX_BYTES + 1 });
    const stillTooBig = new Blob([new Uint8Array(8)]);
    Object.defineProperty(stillTooBig, 'size', { value: MERCHANDISE_PHOTO_MAX_BYTES });
    const smallEnough = new Blob([new Uint8Array(128)], { type: 'image/jpeg' });
    const encode = vi.fn().mockResolvedValueOnce(stillTooBig).mockResolvedValueOnce(smallEnough);

    const result = await compressMerchandisePhoto(file, { encode });
    expect(result.size).toBe(smallEnough.size);
    expect(result.size).toBeLessThan(MERCHANDISE_PHOTO_MAX_BYTES);
    expect(result.type).toBe('image/jpeg');
    expect(result.name).toBe('1000140806.jpg');
    expect(encode).toHaveBeenCalledTimes(2);
    expect(encode).toHaveBeenNthCalledWith(1, file, 1920, 0.82);
  });

  it('throws when every attempt stays at the 5 MB limit', async () => {
    const file = new File([new Uint8Array(8)], 'huge.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: MERCHANDISE_PHOTO_MAX_BYTES + 10 });
    const encode = vi.fn(async () => {
      const blob = new Blob([new Uint8Array(8)]);
      Object.defineProperty(blob, 'size', { value: MERCHANDISE_PHOTO_MAX_BYTES });
      return blob;
    });

    await expect(compressMerchandisePhoto(file, { encode })).rejects.toThrow(MERCHANDISE_PHOTO_TOO_LARGE);
  });

  it('replaces the server size validation message', () => {
    expect(
      merchandisePhotoUploadMessage('Validation failed (expected size is less than 5242880)', 'Could not update merchandise'),
    ).toBe(MERCHANDISE_PHOTO_TOO_LARGE);
    expect(merchandisePhotoUploadMessage('', 'Could not update merchandise')).toBe('Could not update merchandise');
  });
});

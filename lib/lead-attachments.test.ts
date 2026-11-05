import { describe, expect, it } from 'vitest';
import { isAllowedLeadAttachment, isHttpsAttachmentUrl } from './lead-attachments';

describe('lead attachments', () => {
  it('allows a small pdf and rejects html, svg, and oversized files', () => {
    expect(isAllowedLeadAttachment(new File(['a'], 'brief.pdf', { type: 'application/pdf' }))).toBe(
      true,
    );
    expect(isAllowedLeadAttachment(new File(['<html>'], 'note.pdf', { type: 'text/html' }))).toBe(
      false,
    );
    expect(isAllowedLeadAttachment(new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }))).toBe(
      false,
    );
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'brief.pdf', {
      type: 'application/pdf',
    });
    expect(isAllowedLeadAttachment(big)).toBe(false);
  });

  it('only treats https URLs as linkable', () => {
    expect(isHttpsAttachmentUrl('https://cdn.example.com/brief.pdf')).toBe(true);
    expect(isHttpsAttachmentUrl('http://cdn.example.com/brief.pdf')).toBe(false);
    expect(isHttpsAttachmentUrl('javascript:alert(1)')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { visitLooksLikeDeadAir, visitQualityMissingFields } from './visit-quality-hints';

describe('visit quality hints', () => {
  it('only asks for a note on voicemail', () => {
    expect(
      visitQualityMissingFields({
        methodOfContact: 'Telephone',
        notes: 'voice mail',
        contactFullName: '',
        followUp: '',
        quotationNumber: '',
      }),
    ).toEqual([]);
    expect(
      visitQualityMissingFields({
        methodOfContact: 'Telephone',
        notes: '',
        contactFullName: '',
        followUp: '',
      }),
    ).toContain('Notes');
  });

  it('does not demand a quotation on a connected telephone call', () => {
    const missing = visitQualityMissingFields({
      methodOfContact: 'Telephone',
      notes: 'Spoke to buyer, no current job, callback Friday',
      contactFullName: 'Thabo',
      followUp: '2026-09-12',
      quotationNumber: '',
      salesValue: 0,
    });
    expect(missing).toEqual([]);
  });

  it('treats explicit no-contact as dead air', () => {
    expect(
      visitLooksLikeDeadAir({
        methodOfContact: 'Telephone',
        notes: 'Rang twice',
        contactMade: false,
      }),
    ).toBe(true);
  });
});

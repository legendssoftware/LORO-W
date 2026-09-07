import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_NEXT_STEP,
  appendNextStepToResolution,
  isShortCall,
  visitLooksLikeDeadAir,
  visitQualityMissingFields,
} from './visit-quality-hints';

describe('visit quality hints', () => {
  it('requires notes, resolution, contact, and next step on voicemail', () => {
    expect(
      visitQualityMissingFields({
        methodOfContact: 'Telephone',
        notes: 'voice mail',
        contactFullName: '',
        followUp: '',
        quotationNumber: '',
        hasLead: true,
      })
    ).toEqual(['Resolution', 'Contact person', 'Lead next step']);
    expect(
      visitQualityMissingFields({
        methodOfContact: 'Telephone',
        notes: '',
        contactFullName: '',
        followUp: '',
        hasLead: true,
      })
    ).toEqual(['Notes', 'Resolution', 'Contact person', 'Lead next step']);
  });

  it('does not demand a quotation on a connected telephone call', () => {
    const missing = visitQualityMissingFields({
      methodOfContact: 'Telephone',
      notes: 'Spoke to buyer, no current job, callback Friday',
      resolution: 'Callback booked',
      contactFullName: 'Thabo',
      followUp: '2026-09-12',
      quotationNumber: '',
      salesValue: 0,
      nextStep: ACTIVITY_NEXT_STEP.keep,
      hasLead: true,
    });
    expect(missing).toEqual([]);
  });

  it('treats explicit no-contact as dead air', () => {
    expect(
      visitLooksLikeDeadAir({
        methodOfContact: 'Telephone',
        notes: 'Rang twice',
        contactMade: false,
      })
    ).toBe(true);
  });

  it('requires the same key fields for dead-air and connected calls', () => {
    const deadAir = visitQualityMissingFields({
      methodOfContact: 'Telephone',
      notes: 'Left voicemail',
      resolution: 'No answer — try again',
      contactFullName: 'Thabo',
      nextStep: ACTIVITY_NEXT_STEP.discard,
      hasLead: true,
    });
    expect(deadAir).toEqual([]);
  });

  it('requires follow-up when keeping the lead open', () => {
    expect(
      visitQualityMissingFields({
        notes: 'Spoke to buyer',
        resolution: 'Interested in quote',
        contactFullName: 'Thabo',
        nextStep: ACTIVITY_NEXT_STEP.keep,
        followUp: '',
        hasLead: true,
      })
    ).toEqual(['Follow-up date']);
  });

  it('allows discard without a follow-up date', () => {
    expect(
      visitQualityMissingFields({
        notes: 'Not a fit',
        resolution: 'Budget too small',
        contactFullName: 'Thabo',
        nextStep: ACTIVITY_NEXT_STEP.discard,
        followUp: '',
        hasLead: true,
      })
    ).toEqual([]);
  });

  it('requires keep or no further action when there is no lead', () => {
    expect(
      visitQualityMissingFields({
        notes: 'Site visit done',
        resolution: 'Quote to follow',
        contactFullName: 'Thabo',
        nextStep: ACTIVITY_NEXT_STEP.discard,
        hasLead: false,
      })
    ).toEqual(['Next step']);
    expect(
      visitQualityMissingFields({
        notes: 'Site visit done',
        resolution: 'Quote to follow',
        contactFullName: 'Thabo',
        nextStep: ACTIVITY_NEXT_STEP.close,
        hasLead: false,
      })
    ).toEqual([]);
  });

  it('appends a close line to resolution for discard', () => {
    expect(appendNextStepToResolution('Budget too small', 'discard', true)).toBe(
      'Budget too small\n\nLead next step: Discard'
    );
    expect(appendNextStepToResolution('Callback Friday', 'keep', true)).toBe('Callback Friday');
  });

  it('flags telephone check-ins under 30 seconds as short calls', () => {
    const now = Date.parse('2026-09-07T10:00:30.000Z');
    expect(
      isShortCall({
        methodOfContact: 'Telephone',
        checkInTime: '2026-09-07T10:00:01.000Z',
        now,
      })
    ).toBe(true);
    expect(
      isShortCall({
        methodOfContact: 'Telephone',
        checkInTime: '2026-09-07T09:59:00.000Z',
        now,
      })
    ).toBe(false);
    expect(
      isShortCall({
        methodOfContact: 'Physical',
        checkInTime: '2026-09-07T10:00:01.000Z',
        now,
      })
    ).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { ACTIVITY_NEXT_STEP } from '@/lib/visit-quality-hints';
import { validateEndVisitFormWithZodFieldErrors } from './visit-schemas';

describe('end visit form schema', () => {
  it('blocks checkout when key fields are missing', () => {
    const { fieldErrors, firstMessage } = validateEndVisitFormWithZodFieldErrors({
      notes: '',
      resolution: '',
      contactFullName: '',
      hasLead: true,
    });
    expect(firstMessage).toBeTruthy();
    expect(fieldErrors.notes).toBe('Notes are required');
    expect(fieldErrors.resolution).toBe('Resolution is required');
    expect(fieldErrors.contactFullName).toBe('Contact name is required');
    expect(fieldErrors.nextStep).toMatch(/keep working, discard, or delete/i);
  });

  it('requires follow-up when keeping the lead open', () => {
    const { fieldErrors } = validateEndVisitFormWithZodFieldErrors({
      notes: 'Spoke to the buyer',
      resolution: 'Quote next week',
      contactFullName: 'Thabo',
      nextStep: ACTIVITY_NEXT_STEP.keep,
      hasLead: true,
    });
    expect(fieldErrors.followUp).toMatch(/follow-up date/i);
  });

  it('allows discard without a follow-up date', () => {
    const { firstMessage, fieldErrors } = validateEndVisitFormWithZodFieldErrors({
      notes: 'Not a fit',
      resolution: 'Too small',
      contactFullName: 'Thabo',
      nextStep: ACTIVITY_NEXT_STEP.discard,
      hasLead: true,
    });
    expect(firstMessage).toBeNull();
    expect(fieldErrors).toEqual({});
  });
});

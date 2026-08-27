import { describe, expect, it } from 'vitest';
import { getDefaultEmployeeIntakeValues } from './employee-intake-schema';
import { mergeEmployeeIntakeDraft } from './employee-intake-draft';

describe('mergeEmployeeIntakeDraft', () => {
  it('returns null for non-objects', () => {
    const defaults = getDefaultEmployeeIntakeValues();
    expect(mergeEmployeeIntakeDraft(defaults, null)).toBeNull();
    expect(mergeEmployeeIntakeDraft(defaults, 'x')).toBeNull();
  });

  it('restores filled fields and never keeps passwords', () => {
    const defaults = getDefaultEmployeeIntakeValues('locked@example.com');
    const merged = mergeEmployeeIntakeDraft(defaults, {
      name: 'Jane',
      surname: 'Smith',
      email: 'jane@example.com',
      phone: '+26770000000',
      password: 'should-not-restore',
      confirmPassword: 'should-not-restore',
      profile: { city: 'Gaborone', smokingHabits: 'no' },
      employmentProfile: { contactNumber: '+26771111111' },
    });

    expect(merged).not.toBeNull();
    expect(merged?.name).toBe('Jane');
    expect(merged?.profile.city).toBe('Gaborone');
    expect(merged?.profile.smokingHabits).toBe('no');
    expect(merged?.employmentProfile.contactNumber).toBe('+26771111111');
    expect(merged?.password).toBe('');
    expect(merged?.confirmPassword).toBe('');
    expect(merged?.profile.address).toBe('');
  });

  it('merges new personnel fields from older drafts onto defaults', () => {
    const defaults = getDefaultEmployeeIntakeValues();
    const merged = mergeEmployeeIntakeDraft(defaults, {
      profile: { nationalId: '328219412', bankName: 'FirstRand' },
      employmentProfile: { divisionName: 'BitDrywall' },
    });
    expect(merged?.profile.nationalId).toBe('328219412');
    expect(merged?.profile.bankName).toBe('FirstRand');
    expect(merged?.profile.city).toBe('');
    expect(merged?.employmentProfile.divisionName).toBe('BitDrywall');
    expect(merged?.employmentProfile.contactNumber).toBe('');
  });
});

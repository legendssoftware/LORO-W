import { describe, expect, it } from 'vitest';
import {
  employeeIntakeSchema,
  getDefaultEmployeeIntakeValues,
} from './employee-intake-schema';
import { saIdChecksumDigit } from './sa-field-rules';

const VALID_SA_ID = `900115580008${saIdChecksumDigit('900115580008')}`;

function validIntake(overrides: Record<string, unknown> = {}) {
  const defaults = getDefaultEmployeeIntakeValues('jane@example.com');
  return {
    ...defaults,
    name: 'Jane',
    surname: 'Smith',
    email: 'jane@example.com',
    phone: '+27641234567',
    password: 'SecurePass1',
    confirmPassword: 'SecurePass1',
    consentToProcess: true,
    profile: {
      ...defaults.profile,
      gender: 'female' as const,
      dateOfBirth: '1990-01-15',
      address: '1 Main Street',
      city: 'Cape Town',
      country: 'South Africa',
    },
    employmentProfile: {
      ...defaults.employmentProfile,
      contactNumber: '+27641234567',
    },
    ...overrides,
  };
}

describe('employeeIntakeSchema', () => {
  it('accepts a complete valid profile', () => {
    const result = employeeIntakeSchema.safeParse(validIntake());
    expect(result.success).toBe(true);
  });

  it('rejects a password without upper, lower, and digit', () => {
    const result = employeeIntakeSchema.safeParse(
      validIntake({ password: 'password', confirmPassword: 'password' }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('password'))).toBe(true);
    }
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = employeeIntakeSchema.safeParse(
      validIntake({ password: 'Ab1', confirmPassword: 'Ab1' }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects mismatched passwords', () => {
    const result = employeeIntakeSchema.safeParse(
      validIntake({ password: 'SecurePass1', confirmPassword: 'SecurePass2' }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('confirmPassword'))).toBe(
        true,
      );
    }
  });

  it('requires an explicit gender choice', () => {
    const defaults = getDefaultEmployeeIntakeValues();
    expect(defaults.profile.gender).toBeUndefined();
    const result = employeeIntakeSchema.safeParse(
      validIntake({
        profile: {
          ...defaults.profile,
          gender: undefined,
          dateOfBirth: '1990-01-15',
          address: '1 Main Street',
          city: 'Cape Town',
          country: 'South Africa',
        },
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('gender'))).toBe(true);
    }
  });

  it('rejects a date of birth outside ages 16–80', () => {
    const defaults = getDefaultEmployeeIntakeValues();
    const tooYoung = employeeIntakeSchema.safeParse(
      validIntake({
        profile: {
          ...defaults.profile,
          gender: 'male',
          dateOfBirth: new Date().toISOString().slice(0, 10),
          address: '1 Main Street',
          city: 'Cape Town',
          country: 'South Africa',
        },
      }),
    );
    expect(tooYoung.success).toBe(false);

    const tooOld = employeeIntakeSchema.safeParse(
      validIntake({
        profile: {
          ...defaults.profile,
          gender: 'male',
          dateOfBirth: '1920-01-01',
          address: '1 Main Street',
          city: 'Cape Town',
          country: 'South Africa',
        },
      }),
    );
    expect(tooOld.success).toBe(false);
  });

  it('accepts optional personnel fields without requiring them', () => {
    const defaults = getDefaultEmployeeIntakeValues();
    const result = employeeIntakeSchema.safeParse(
      validIntake({
        profile: {
          ...defaults.profile,
          gender: 'female',
          dateOfBirth: '1990-01-15',
          address: '1 Main Street',
          city: 'Cape Town',
          country: 'South Africa',
          nationalId: VALID_SA_ID,
          bankAccountNo: '6319848837',
          nextOfKinName: 'Boikhutso Molefe',
        },
        employmentProfile: {
          ...defaults.employmentProfile,
          contactNumber: '+27641234567',
        },
      }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.profile.nationalId).toBe(VALID_SA_ID);
      expect(result.data.profile.bankAccountNo).toBe('6319848837');
    }
  });

  it('rejects an invalid South African ID when one is provided', () => {
    const defaults = getDefaultEmployeeIntakeValues();
    const result = employeeIntakeSchema.safeParse(
      validIntake({
        profile: {
          ...defaults.profile,
          gender: 'female',
          dateOfBirth: '1990-01-15',
          address: '1 Main Street',
          city: 'Cape Town',
          country: 'South Africa',
          nationalId: '328219412',
        },
      }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects a short or non-numeric phone', () => {
    const short = employeeIntakeSchema.safeParse(validIntake({ phone: '123' }));
    expect(short.success).toBe(false);
    const letters = employeeIntakeSchema.safeParse(validIntake({ phone: 'not-a-phone' }));
    expect(letters.success).toBe(false);
  });

  it('defaults country to South Africa', () => {
    expect(getDefaultEmployeeIntakeValues().profile.country).toBe('South Africa');
  });
});

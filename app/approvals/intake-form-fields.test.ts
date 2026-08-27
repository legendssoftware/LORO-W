import { describe, expect, it } from 'vitest';
import {
  collectApprovalPayloadRows,
  collectIntakeFormSections,
  collectRecordFieldSections,
  formatApprovalTypeLabel,
  humanizeIntakeFieldLabel,
} from './intake-form-fields';

describe('collectIntakeFormSections', () => {
  it('renders filled identity and address groups and hides empty ones', () => {
    const sections = collectIntakeFormSections({
      account: {
        name: 'Thabo',
        surname: 'Mokoena',
        email: 'thabo@example.com',
        phone: '0821234567',
        status: 'pending',
        accessLevel: 'user',
      },
      profile: {
        gender: 'male',
        dateOfBirth: '1990-01-15',
        address: '1 Main Street',
        city: 'Cape Town',
        country: 'South Africa',
      },
      employment: {
        contactNumber: '0821234567',
      },
    });

    expect(sections.map((section) => section.title)).toEqual([
      'Employee',
      'Identity',
      'Address',
      'Employment',
    ]);
    expect(sections[0]?.rows.map((row) => row.name)).toContain('accessLevel');
    expect(sections.find((section) => section.title === 'Banking')).toBeUndefined();
  });

  it('puts unmapped filled keys into Other details', () => {
    const sections = collectIntakeFormSections({
      account: { name: 'Thabo' },
      profile: { hairColor: 'black', aboutMe: 'Field sales' },
    });

    const other = sections.find((section) => section.title === 'Other details');
    expect(other?.rows.map((row) => row.label)).toEqual(['Hair Color', 'About Me']);
  });
});

describe('collectApprovalPayloadRows', () => {
  it('prints filled scalars and skips secrets, nested objects, and listed keys', () => {
    const rows = collectApprovalPayloadRows({
      entityData: {
        email: 'thabo@example.com',
        invitationUid: 12,
        nested: { ignored: true },
        password: 'secret',
      },
      metadata: {
        hireName: 'Thabo Mokoena',
        leaveType: 'annual',
        source: 'employee-intake',
      },
      skipKeys: ['hireName', 'email'],
    });

    expect(rows.map((row) => row.name)).toEqual([
      'invitationUid',
      'leaveType',
      'source',
    ]);
    expect(rows.find((row) => row.name === 'password')).toBeUndefined();
  });
});

describe('collectRecordFieldSections', () => {
  it('turns nested objects into labeled subsections', () => {
    const sections = collectRecordFieldSections({
      record: {
        name: 'Acme',
        currentData: { phone: '011' },
        proposedData: { phone: '082' },
        password: 'secret',
      },
      detailsTitle: 'Client',
    });

    expect(sections.map((section) => section.title)).toEqual([
      'Client',
      'Current data',
      'Proposed data',
    ]);
    expect(sections[0]?.rows.map((row) => row.name)).toEqual(['name']);
    expect(sections[1]?.rows[0]?.value).toBe('011');
    expect(sections[2]?.rows[0]?.value).toBe('082');
  });
});

describe('label helpers', () => {
  it('formats approval types and camelCase keys', () => {
    expect(formatApprovalTypeLabel('user_access')).toBe('Employee access');
    expect(humanizeIntakeFieldLabel('hireEmail')).toBe('Hire Email');
  });
});

import type { IntakeFormSnapshot } from '@/api/types/approvals';
import {
  JOB_INFORMATION_FIELDS,
  PERSONNEL_DETAILS_GROUPS,
} from '@/lib/user-form/personnel-fields';

export type IntakeFormFieldGroup = {
  title: string;
  source: 'account' | 'profile' | 'employment';
  fields: Array<{ name: string; label: string }>;
};

export type IntakeFormRow = {
  name: string;
  label: string;
  value: string;
};

export type IntakeFormSection = {
  title: string;
  source: 'account' | 'profile' | 'employment';
  rows: IntakeFormRow[];
};

function mapNamedFields(
  fields: Array<{ name: string; label: string }>,
): Array<{ name: string; label: string }> {
  return fields.map(({ name, label }) => ({ name, label }));
}

function identityFieldsWithAge(
  fields: Array<{ name: string; label: string }>,
): Array<{ name: string; label: string }> {
  const mapped = mapNamedFields(fields);
  const ageField = { name: 'currentAge', label: 'Age' };
  if (mapped.some((field) => field.name === 'currentAge')) return mapped;
  const dobIndex = mapped.findIndex((field) => field.name === 'dateOfBirth');
  if (dobIndex === -1) return [...mapped, ageField];
  return [...mapped.slice(0, dobIndex + 1), ageField, ...mapped.slice(dobIndex + 1)];
}

export const INTAKE_FORM_GROUPS: IntakeFormFieldGroup[] = [
  {
    title: 'Employee',
    source: 'account',
    fields: [
      { name: 'name', label: 'First name' },
      { name: 'surname', label: 'Surname' },
      { name: 'email', label: 'Email' },
      { name: 'phone', label: 'Phone' },
      { name: 'status', label: 'Account status' },
      { name: 'photoURL', label: 'Photo' },
      { name: 'accessLevel', label: 'Access level' },
      { name: 'workforceType', label: 'Workforce type' },
      { name: 'role', label: 'Role' },
    ],
  },
  ...PERSONNEL_DETAILS_GROUPS.map((group) => ({
    title: group.title,
    source: 'profile' as const,
    fields:
      group.title === 'Identity'
        ? identityFieldsWithAge(group.fields)
        : mapNamedFields(group.fields),
  })),
  {
    title: 'Employment',
    source: 'employment',
    fields: [
      { name: 'position', label: 'Position' },
      { name: 'department', label: 'Department' },
      { name: 'branchref', label: 'Branch' },
      { name: 'email', label: 'Work email' },
      { name: 'contactNumber', label: 'Work contact' },
      { name: 'startDate', label: 'Start date' },
      { name: 'endDate', label: 'End date' },
      { name: 'isCurrentlyEmployed', label: 'Currently employed' },
      ...mapNamedFields(JOB_INFORMATION_FIELDS),
    ],
  },
];

const PAYLOAD_SECRET_KEYS = new Set([
  'password',
  'passwordHash',
  'hashedPassword',
  'salt',
  'token',
  'refreshToken',
  'clerkUserId',
  'uid',
  'owner',
  'ownerClerkUserId',
]);

/**
 * Formats a snapshot scalar for display. Empty values are omitted.
 */
export function formatIntakeFieldValue(
  value: string | number | boolean | undefined,
): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  }
  return trimmed;
}

export function formatApprovalTypeLabel(type?: string | null): string {
  if (!type?.trim()) return '—';
  if (type.toLowerCase() === 'user_access') return 'Employee access';
  return type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Turns camelCase / snake_case keys into a readable label. */
export function humanizeIntakeFieldLabel(name: string): string {
  const spaced = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  if (!spaced) return name;
  return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Builds labeled sections from an intake snapshot. Empty groups are omitted.
 * Any filled keys that are not mapped to a group land in "Other details".
 */
export function collectIntakeFormSections(
  intakeForm: IntakeFormSnapshot,
): IntakeFormSection[] {
  const usedKeys: Record<IntakeFormFieldGroup['source'], Set<string>> = {
    account: new Set(),
    profile: new Set(),
    employment: new Set(),
  };
  const sections: IntakeFormSection[] = [];

  for (const group of INTAKE_FORM_GROUPS) {
    const source = intakeForm[group.source] ?? {};
    const rows: IntakeFormRow[] = [];
    for (const field of group.fields) {
      if (usedKeys[group.source].has(field.name)) continue;
      const value = formatIntakeFieldValue(source[field.name]);
      if (!value) continue;
      usedKeys[group.source].add(field.name);
      rows.push({ name: field.name, label: field.label, value });
    }
    if (rows.length === 0) continue;
    sections.push({ title: group.title, source: group.source, rows });
  }

  const leftoverRows: IntakeFormRow[] = [];
  const leftoverSources: Array<IntakeFormFieldGroup['source']> = [
    'account',
    'profile',
    'employment',
  ];
  for (const source of leftoverSources) {
    const record = intakeForm[source] ?? {};
    for (const [name, raw] of Object.entries(record)) {
      if (usedKeys[source].has(name)) continue;
      const value = formatIntakeFieldValue(raw);
      if (!value) continue;
      leftoverRows.push({
        name: `${source}.${name}`,
        label: humanizeIntakeFieldLabel(name),
        value,
      });
    }
  }
  if (leftoverRows.length > 0) {
    sections.push({ title: 'Other details', source: 'profile', rows: leftoverRows });
  }

  return sections;
}

function formatPayloadScalar(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return formatIntakeFieldValue(value);
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => formatPayloadScalar(item))
      .filter((item): item is string => Boolean(item));
    return parts.length > 0 ? parts.join(', ') : undefined;
  }
  return undefined;
}

/**
 * Flattens filled scalar keys from entityData and metadata for the Details section.
 */
export function collectApprovalPayloadRows(params: {
  entityData?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  skipKeys?: Iterable<string>;
}): IntakeFormRow[] {
  const skip = new Set(
    [...(params.skipKeys ?? [])].map((key) => key.toLowerCase()),
  );
  const rows: IntakeFormRow[] = [];
  const seen = new Set<string>();
  const sources: Array<[string, Record<string, unknown> | null | undefined]> = [
    ['entityData', params.entityData],
    ['metadata', params.metadata],
  ];

  for (const [, record] of sources) {
    if (!record) continue;
    for (const [name, raw] of Object.entries(record)) {
      const key = name.toLowerCase();
      if (PAYLOAD_SECRET_KEYS.has(name) || PAYLOAD_SECRET_KEYS.has(key)) continue;
      if (skip.has(key) || seen.has(key)) continue;
      const value = formatPayloadScalar(raw);
      if (!value) continue;
      seen.add(key);
      rows.push({
        name,
        label: humanizeIntakeFieldLabel(name),
        value,
      });
    }
  }

  return rows;
}

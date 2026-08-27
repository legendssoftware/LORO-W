import {
  getDefaultEmployeeIntakeValues,
  type EmployeeIntakeFormValues,
} from '@/lib/user-form/employee-intake-schema';

export const EMPLOYEE_INTAKE_DRAFT_VERSION = 2;

const STORAGE_KEY_PREFIX = 'loro-employee-intake-draft';

export interface EmployeeIntakeDraft {
  version: number;
  step: number;
  values: EmployeeIntakeFormValues;
}

/**
 * @param token Intake invitation token
 * @returns localStorage key for this invitation's in-progress form
 */
export function employeeIntakeDraftKey(token: string): string {
  return `${STORAGE_KEY_PREFIX}:${token}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Merge a stored draft onto defaults so missing keys from older drafts stay valid.
 * Passwords are never restored.
 */
export function mergeEmployeeIntakeDraft(
  defaults: EmployeeIntakeFormValues,
  stored: unknown,
): EmployeeIntakeFormValues | null {
  if (!isRecord(stored)) return null;

  const profile = isRecord(stored.profile) ? stored.profile : {};
  const employment = isRecord(stored.employmentProfile) ? stored.employmentProfile : {};
  const documents = Array.isArray(stored.documents) ? stored.documents : defaults.documents;

  return {
    ...defaults,
    ...stored,
    password: '',
    confirmPassword: '',
    consentToProcess:
      typeof stored.consentToProcess === 'boolean'
        ? stored.consentToProcess
        : defaults.consentToProcess,
    photoURL:
      typeof stored.photoURL === 'string' || stored.photoURL === null
        ? (stored.photoURL as string | null)
        : defaults.photoURL,
    profile: {
      ...defaults.profile,
      ...profile,
    } as EmployeeIntakeFormValues['profile'],
    employmentProfile: {
      ...defaults.employmentProfile,
      ...employment,
    } as EmployeeIntakeFormValues['employmentProfile'],
    documents: documents as EmployeeIntakeFormValues['documents'],
  };
}

/**
 * Read a persisted intake draft. Returns null when missing, malformed, or version-mismatched.
 */
export function readEmployeeIntakeDraft(
  token: string,
): { values: EmployeeIntakeFormValues; step: number } | null {
  if (typeof window === 'undefined' || !token) return null;
  try {
    const raw = localStorage.getItem(employeeIntakeDraftKey(token));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EmployeeIntakeDraft>;
    if (parsed.version !== EMPLOYEE_INTAKE_DRAFT_VERSION) return null;
    const defaults = getDefaultEmployeeIntakeValues();
    const values = mergeEmployeeIntakeDraft(defaults, parsed.values);
    if (!values) return null;
    const step = typeof parsed.step === 'number' && Number.isFinite(parsed.step)
      ? Math.max(0, Math.floor(parsed.step))
      : 0;
    return { values, step };
  } catch {
    return null;
  }
}

/**
 * Persist form values and step. Passwords are stripped before write.
 */
export function writeEmployeeIntakeDraft(
  token: string,
  values: EmployeeIntakeFormValues,
  step: number,
): void {
  if (typeof window === 'undefined' || !token) return;
  try {
    const payload: EmployeeIntakeDraft = {
      version: EMPLOYEE_INTAKE_DRAFT_VERSION,
      step,
      values: {
        ...values,
        password: '',
        confirmPassword: '',
      },
    };
    localStorage.setItem(employeeIntakeDraftKey(token), JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

/** Remove the draft after successful submit or when the link is invalid. */
export function clearEmployeeIntakeDraft(token: string): void {
  if (typeof window === 'undefined' || !token) return;
  try {
    localStorage.removeItem(employeeIntakeDraftKey(token));
  } catch {
    // ignore
  }
}

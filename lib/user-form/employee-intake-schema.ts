import { z } from 'zod';
import {
  getEmptyEmploymentProfile,
  getEmptyPersonnelProfile,
  personnelEmploymentSchemaShape,
  personnelProfileSchemaShape,
} from './personnel-fields';

const optionalString = z.string().optional().nullable();

const PHONE_PATTERN = /^\+?[0-9\s()-]{8,20}$/;

export const INTAKE_MAX_FILE_BYTES = 5 * 1024 * 1024;

function ageFromIsoDate(value: string): number | null {
  const parsed = new Date(`${value.trim()}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDelta = today.getMonth() - parsed.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < parsed.getDate())) {
    age -= 1;
  }
  return age;
}

export const employeeIntakeProfileSchema = z.object({
  ...personnelProfileSchemaShape,
  gender: z.enum(['male', 'female', 'other'], { message: 'Gender is required' }),
  dateOfBirth: z
    .string()
    .min(1, 'Date of birth is required')
    .refine((value) => {
      const age = ageFromIsoDate(value);
      return age != null && age >= 16 && age <= 80;
    }, 'Enter a date of birth for someone aged 16 to 80'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  country: z.string().min(1, 'Country is required'),
});

export const employeeIntakeEmploymentSchema = z.object({
  ...personnelEmploymentSchemaShape,
  email: z.union([z.string().email(), z.literal(''), z.null()]).optional(),
  contactNumber: z
    .string()
    .min(1, 'Work contact number is required')
    .regex(PHONE_PATTERN, 'Enter a valid phone number'),
});

export const intakeDocumentSchema = z.object({
  url: z.string().min(1),
  title: z.string().min(1),
  docType: z.string().optional(),
  mimeType: z.string().optional(),
  fileSize: z.number().optional(),
});

export const employeeIntakeSchema = z
  .object({
    name: z.string().min(1, 'First name is required'),
    surname: z.string().min(1, 'Surname is required'),
    email: z.string().email('Valid email is required'),
    phone: z
      .string()
      .min(1, 'Phone is required')
      .regex(PHONE_PATTERN, 'Enter a valid phone number'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password must be less than 128 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one lowercase letter, one uppercase letter, and one number',
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    photoURL: optionalString,
    consentToProcess: z.boolean().refine((value) => value === true, {
      message: 'Please confirm we may process this information',
    }),
    profile: employeeIntakeProfileSchema,
    employmentProfile: employeeIntakeEmploymentSchema,
    documents: z.array(intakeDocumentSchema).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type EmployeeIntakeFormValues = z.infer<typeof employeeIntakeSchema>;
export type IntakeDocumentValues = z.infer<typeof intakeDocumentSchema>;

export const EMPLOYEE_INTAKE_STEP_FIELDS: Record<number, string[]> = {
  0: ['name', 'surname', 'email', 'phone', 'password', 'confirmPassword'],
  1: ['profile.gender', 'profile.dateOfBirth'],
  2: ['profile.address', 'profile.city', 'profile.country'],
  3: [],
  4: [],
  5: ['employmentProfile.contactNumber'],
  6: ['consentToProcess'],
};

export const EMPLOYEE_INTAKE_STEP_LABELS = [
  'Account',
  'Personal',
  'Address',
  'Health',
  'Contacts',
  'Employment',
  'Review',
] as const;

export function getDefaultEmployeeIntakeValues(
  prefillEmail?: string | null,
): EmployeeIntakeFormValues {
  return {
    name: '',
    surname: '',
    email: prefillEmail ?? '',
    phone: '',
    password: '',
    confirmPassword: '',
    photoURL: null,
    consentToProcess: false,
    profile: {
      ...getEmptyPersonnelProfile(),
      gender: undefined as unknown as EmployeeIntakeFormValues['profile']['gender'],
      dateOfBirth: '',
      address: '',
      city: '',
      country: '',
    },
    employmentProfile: {
      ...getEmptyEmploymentProfile(),
      contactNumber: '',
    },
    documents: [],
  };
}

export function buildCompleteIntakeBody(values: EmployeeIntakeFormValues) {
  const { confirmPassword: _confirm, consentToProcess: _consent, ...rest } = values;
  return {
    ...rest,
    employmentProfile: {
      ...rest.employmentProfile,
      email: rest.employmentProfile.email?.trim() || undefined,
      startDate: rest.employmentProfile.startDate || undefined,
      endDate: rest.employmentProfile.endDate || undefined,
    },
    photoURL: rest.photoURL?.trim() || undefined,
    documents: rest.documents?.length ? rest.documents : undefined,
  };
}

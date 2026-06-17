import { z } from 'zod';

const optionalString = z.string().optional().nullable();

export const employeeIntakeProfileSchema = z.object({
  height: optionalString,
  weight: optionalString,
  hairColor: optionalString,
  eyeColor: optionalString,
  gender: z.enum(['male', 'female', 'other'], { message: 'Gender is required' }),
  ethnicity: optionalString,
  bodyType: optionalString,
  smokingHabits: optionalString,
  drinkingHabits: optionalString,
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  country: z.string().min(1, 'Country is required'),
  zipCode: optionalString,
  aboutMe: optionalString,
  socialMedia: optionalString,
  maritalStatus: optionalString,
  numberDependents: z.union([z.number(), z.null()]).optional(),
  shoeSize: optionalString,
  shirtSize: optionalString,
  pantsSize: optionalString,
  dressSize: optionalString,
  coatSize: optionalString,
});

export const employeeIntakeEmploymentSchema = z.object({
  branchref: optionalString,
  position: optionalString,
  department: optionalString,
  startDate: optionalString,
  endDate: optionalString,
  isCurrentlyEmployed: z.boolean().optional().nullable(),
  email: z.union([z.string().email(), z.literal(''), z.null()]).optional(),
  contactNumber: z.string().min(1, 'Contact number is required'),
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
    phone: z.string().min(1, 'Phone is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    photoURL: optionalString,
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

export const EMPLOYEE_INTAKE_STEP_FIELDS: Record<number, (keyof EmployeeIntakeFormValues)[]> = {
  0: ['name', 'surname', 'email', 'phone', 'password', 'confirmPassword'],
  1: ['profile'],
  2: ['employmentProfile'],
  3: [],
};

export const EMPLOYEE_INTAKE_STEP_LABELS = [
  'Account',
  'Personal',
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
    profile: {
      height: null,
      weight: null,
      hairColor: null,
      eyeColor: null,
      gender: 'male',
      ethnicity: null,
      bodyType: null,
      smokingHabits: null,
      drinkingHabits: null,
      dateOfBirth: '',
      address: '',
      city: '',
      country: '',
      zipCode: null,
      aboutMe: null,
      socialMedia: null,
      maritalStatus: null,
      numberDependents: null,
      shoeSize: null,
      shirtSize: null,
      pantsSize: null,
      dressSize: null,
      coatSize: null,
    },
    employmentProfile: {
      branchref: null,
      position: null,
      department: null,
      startDate: null,
      endDate: null,
      isCurrentlyEmployed: true,
      email: null,
      contactNumber: '',
    },
    documents: [],
  };
}

export function buildCompleteIntakeBody(values: EmployeeIntakeFormValues) {
  const { confirmPassword: _confirm, ...rest } = values;
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

import { z } from 'zod';
import {
  getEmptyEmploymentProfile,
  getEmptyPersonnelProfile,
  personnelEmploymentSchemaShape,
  personnelProfileSchemaShape,
} from './personnel-fields';
import { ageFromIsoDate } from './date-input';
import {
  isSouthAfrica,
  isValidBankAccountNo,
  isValidBankBranchCode,
  isValidGenericBankAccount,
  isValidNationalId,
  isValidPassport,
  isValidPhone,
  optionalFilled,
  PHONE_VALIDATION_MESSAGE,
} from './sa-field-rules';

const optionalString = z.string().optional().nullable();

export const INTAKE_MAX_FILE_BYTES = 5 * 1024 * 1024;

const requiredPhone = z
  .string()
  .min(1, 'Phone is required')
  .refine(isValidPhone, PHONE_VALIDATION_MESSAGE);

const PROFILE_PHONE_FIELDS = [
  'partnerContactNo',
  'nextOfKinContactNo',
  'emergencyContactNo',
  'dependantContactNo',
] as const;

function refineProfileByCountry(
  data: z.infer<typeof employeeIntakeProfileBaseSchema>,
  ctx: z.RefinementCtx,
) {
  const country = data.country ?? '';
  const isSa = isSouthAfrica(country);

  if (optionalFilled(data.nationalId)) {
    if (!isValidNationalId(data.nationalId!, country)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: isSa
          ? 'Enter a valid 13-digit South African ID number'
          : 'Enter a valid national ID (4–20 letters or digits)',
        path: ['nationalId'],
      });
    }
  }

  if (optionalFilled(data.passportNo) && !isValidPassport(data.passportNo!)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Enter a valid passport number (5–15 letters or digits)',
      path: ['passportNo'],
    });
  }

  if (optionalFilled(data.bankAccountNo)) {
    const valid = isSa
      ? isValidBankAccountNo(data.bankAccountNo!)
      : isValidGenericBankAccount(data.bankAccountNo!);
    if (!valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: isSa
          ? 'Enter a bank account number with 7 to 11 digits'
          : 'Enter a valid bank account number (4–20 characters)',
        path: ['bankAccountNo'],
      });
    }
  }

  if (isSa && optionalFilled(data.bankBranchCode) && !isValidBankBranchCode(data.bankBranchCode!)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Enter a 6-digit branch code',
      path: ['bankBranchCode'],
    });
  }

  for (const field of PROFILE_PHONE_FIELDS) {
    const value = data[field];
    if (optionalFilled(value) && !isValidPhone(value!)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: PHONE_VALIDATION_MESSAGE,
        path: [field],
      });
    }
  }
}

const employeeIntakeProfileBaseSchema = z.object({
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

export const employeeIntakeProfileSchema = employeeIntakeProfileBaseSchema.superRefine(
  refineProfileByCountry,
);

export const employeeIntakeEmploymentSchema = z
  .object({
    ...personnelEmploymentSchemaShape,
    email: z.union([z.string().email(), z.literal(''), z.null()]).optional(),
    contactNumber: z
      .string()
      .min(1, 'Work contact number is required')
      .refine(isValidPhone, PHONE_VALIDATION_MESSAGE),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true;
      return data.startDate <= data.endDate;
    },
    { message: 'End date must be on or after the start date', path: ['endDate'] },
  );

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
    phone: requiredPhone,
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
  1: ['profile.gender', 'profile.dateOfBirth', 'profile.country', 'profile.nationalId', 'profile.passportNo'],
  2: ['profile.address', 'profile.city'],
  3: [],
  4: [
    'profile.bankAccountNo',
    'profile.bankBranchCode',
    'profile.partnerContactNo',
    'profile.nextOfKinContactNo',
    'profile.emergencyContactNo',
    'profile.dependantContactNo',
  ],
  5: [
    'employmentProfile.contactNumber',
    'employmentProfile.email',
    'employmentProfile.startDate',
    'employmentProfile.endDate',
  ],
  6: ['consentToProcess'],
};

const ADDRESS_FIELDS = new Set([
  'address',
  'city',
  'complex',
  'suburb',
  'province',
  'zipCode',
  'ownTransport',
]);

const HEALTH_FIELDS = new Set([
  'smokingHabits',
  'bloodType',
  'chronicDisease',
  'allergies',
  'medicalAidName',
  'medicalAidMembershipNo',
  'medicalAidType',
  'vaccinationStatus',
  'vaccineBrand',
]);

const CONTACTS_FIELDS = new Set([
  'partnerName',
  'partnerIdNo',
  'partnerContactNo',
  'nextOfKinName',
  'nextOfKinIdNo',
  'nextOfKinContactNo',
  'emergencyContactNo',
  'mainDependantName',
  'dependantId',
  'dependantContactNo',
  'numberDependents',
  'bankName',
  'bankAccountNo',
  'bankBranchCode',
  'bankAccountType',
  'taxNumber',
  'taxOffice',
  'lifeInsurance',
  'personalCarInsurance',
  'householdInsurance',
  'funeralPlan',
]);

export function employeeIntakeStepForFieldPath(path: string): number {
  const [top, field] = path.split('.');
  if (top === 'consentToProcess') return 6;
  if (top === 'employmentProfile') return 5;
  if (top === 'profile' && field) {
    if (ADDRESS_FIELDS.has(field)) return 2;
    if (HEALTH_FIELDS.has(field)) return 3;
    if (CONTACTS_FIELDS.has(field)) return 4;
    return 1;
  }
  return 0;
}

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
      country: 'South Africa',
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
  const currentAge = ageFromIsoDate(rest.profile.dateOfBirth);
  return {
    ...rest,
    profile: {
      ...rest.profile,
      currentAge,
    },
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

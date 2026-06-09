import { z } from 'zod';
import { AccessLevel, WorkforceType } from '@/api/types/user';

export const profileSchema = z.object({
  height: z.string().optional().nullable(),
  weight: z.string().optional().nullable(),
  hairColor: z.string().optional().nullable(),
  eyeColor: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
});

export const employmentProfileSchema = z.object({
  branchref: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isCurrentlyEmployed: z.boolean().optional().nullable(),
  email: z.string().optional().nullable(),
  contactNumber: z.string().optional().nullable(),
});

/** User targets form schema (PATCH /user/:ref with userTarget). */
export const targetFormSchema = z.object({
  targetSalesAmount: z.number().optional().nullable(),
  targetQuotationsAmount: z.number().optional().nullable(),
  targetCurrency: z.string().optional().nullable(),
  targetHoursWorked: z.number().optional().nullable(),
  targetNewClients: z.number().optional().nullable(),
  targetNewLeads: z.number().optional().nullable(),
  targetCheckIns: z.number().optional().nullable(),
  targetCalls: z.number().optional().nullable(),
  targetPeriod: z.string().optional().nullable(),
  periodStartDate: z.string().optional().nullable(),
  periodEndDate: z.string().optional().nullable(),
  isRecurring: z.boolean().optional().nullable(),
  recurringInterval: z.enum(['daily', 'weekly', 'monthly']).optional().nullable(),
  carryForwardUnfulfilled: z.boolean().optional().nullable(),
  baseSalary: z.number().optional().nullable(),
  carInstalment: z.number().optional().nullable(),
  carInsurance: z.number().optional().nullable(),
  fuel: z.number().optional().nullable(),
  cellPhoneAllowance: z.number().optional().nullable(),
  carMaintenance: z.number().optional().nullable(),
  cgicCosts: z.number().optional().nullable(),
  totalCost: z.number().optional().nullable(),
  erpSalesRepCode: z.string().optional().nullable(),
  performanceWarningLevel: z.enum(['none', '1', '2', '3']).optional().nullable(),
});

export type TargetFormValues = z.infer<typeof targetFormSchema>;

export const userFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  surname: z.string().min(1, 'Surname is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional().nullable(),
  userref: z.string().optional().nullable(),
  hrID: z.union([z.number(), z.null()]).optional(),
  role: z.string().optional(),
  status: z.string().optional(),
  accessLevel: z.string().optional(),
  workforceType: z.string().optional(),
  departmentId: z.union([z.number(), z.null()]).optional(),
  branchUid: z.union([z.number(), z.null()]).optional(),
  managedBranches: z.array(z.number()).optional(),
  managedStaff: z.array(z.number()).optional(),
  businesscardURL: z.string().optional().nullable(),
  profile: profileSchema.optional().nullable(),
  employmentProfile: employmentProfileSchema.optional().nullable(),
  assignedClientIds: z.array(z.number()).optional(),
});

export type UserFormValues = z.infer<typeof userFormSchema>;

/** Combined wizard schema (user fields + targets, no performance warning on create). */
export const addUserWizardSchema = userFormSchema.merge(
  targetFormSchema.omit({ performanceWarningLevel: true })
);

export type AddUserWizardValues = z.infer<typeof addUserWizardSchema>;

export const wizardBasicsStepSchema = addUserWizardSchema.pick({
  name: true,
  surname: true,
  email: true,
  phone: true,
});

export const wizardAccessStepSchema = addUserWizardSchema.pick({
  accessLevel: true,
  workforceType: true,
  role: true,
  status: true,
  departmentId: true,
  hrID: true,
  userref: true,
  branchUid: true,
});

export const wizardTargetsStepSchema = targetFormSchema.omit({
  performanceWarningLevel: true,
});

export const wizardAssignmentsStepSchema = addUserWizardSchema.pick({
  profile: true,
  businesscardURL: true,
  employmentProfile: true,
  managedBranches: true,
  managedStaff: true,
  assignedClientIds: true,
});

export const WIZARD_STEP_FIELDS: Record<number, (keyof AddUserWizardValues)[]> = {
  0: ['name', 'surname', 'email', 'phone'],
  1: [
    'accessLevel',
    'workforceType',
    'role',
    'status',
    'departmentId',
    'hrID',
    'userref',
    'branchUid',
  ],
  2: [
    'targetSalesAmount',
    'targetQuotationsAmount',
    'targetCurrency',
    'targetHoursWorked',
    'targetNewClients',
    'targetNewLeads',
    'targetCheckIns',
    'targetCalls',
    'targetPeriod',
    'periodStartDate',
    'periodEndDate',
    'isRecurring',
    'recurringInterval',
    'carryForwardUnfulfilled',
    'baseSalary',
    'carInstalment',
    'carInsurance',
    'fuel',
    'cellPhoneAllowance',
    'carMaintenance',
    'cgicCosts',
    'totalCost',
    'erpSalesRepCode',
  ],
  3: [
    'profile',
    'businesscardURL',
    'employmentProfile',
    'managedBranches',
    'managedStaff',
    'assignedClientIds',
  ],
};

export const WIZARD_STEP_LABELS = [
  'Account',
  'Access',
  'Targets',
  'Assignments',
] as const;

export function getDefaultAddUserWizardValues(): AddUserWizardValues {
  return {
    name: '',
    surname: '',
    email: '',
    phone: null,
    userref: null,
    hrID: null,
    role: AccessLevel.USER,
    status: 'active',
    accessLevel: AccessLevel.USER,
    workforceType: WorkforceType.GENERAL_WORKER,
    departmentId: null,
    branchUid: null,
    managedBranches: [],
    managedStaff: [],
    businesscardURL: null,
    profile: {
      height: null,
      weight: null,
      hairColor: null,
      eyeColor: null,
      gender: null,
      dateOfBirth: null,
      address: null,
      city: null,
      country: null,
    },
    employmentProfile: {
      branchref: null,
      position: null,
      department: null,
      startDate: null,
      endDate: null,
      isCurrentlyEmployed: true,
      email: null,
      contactNumber: null,
    },
    assignedClientIds: [],
    targetSalesAmount: null,
    targetQuotationsAmount: null,
    targetCurrency: null,
    targetHoursWorked: null,
    targetNewClients: null,
    targetNewLeads: null,
    targetCheckIns: null,
    targetCalls: null,
    targetPeriod: null,
    periodStartDate: null,
    periodEndDate: null,
    isRecurring: null,
    recurringInterval: null,
    carryForwardUnfulfilled: null,
    baseSalary: null,
    carInstalment: null,
    carInsurance: null,
    fuel: null,
    cellPhoneAllowance: null,
    carMaintenance: null,
    cgicCosts: null,
    totalCost: null,
    erpSalesRepCode: null,
  };
}

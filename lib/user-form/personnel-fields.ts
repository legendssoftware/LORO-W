import { z } from 'zod';
import { FORM_PLACEHOLDERS } from '@/lib/form-placeholders';
import type { DatePickerPreset } from './date-input';

const optionalString = z.string().optional().nullable();
const optionalNumber = z.union([z.number(), z.null()]).optional();
const optionalBoolean = z.boolean().optional().nullable();

export type PersonnelFieldKind = 'text' | 'date' | 'number' | 'tel' | 'select';

export type PersonnelSelectOption = {
  value: string;
  label: string;
};

export type PersonnelFieldSpec = {
  name: string;
  label: string;
  kind: PersonnelFieldKind;
  placeholder?: string;
  options?: PersonnelSelectOption[];
  datePreset?: DatePickerPreset;
};

export const GENDER_OPTIONS: PersonnelSelectOption[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export const COUNTRY_OPTIONS: PersonnelSelectOption[] = [
  { value: 'South Africa', label: 'South Africa' },
  { value: 'Namibia', label: 'Namibia' },
  { value: 'Botswana', label: 'Botswana' },
  { value: 'Zimbabwe', label: 'Zimbabwe' },
  { value: 'Lesotho', label: 'Lesotho' },
  { value: 'Eswatini', label: 'Eswatini' },
  { value: 'Mozambique', label: 'Mozambique' },
  { value: 'Zambia', label: 'Zambia' },
  { value: 'Malawi', label: 'Malawi' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'Other', label: 'Other' },
];

export const SA_PROVINCE_OPTIONS: PersonnelSelectOption[] = [
  { value: 'Eastern Cape', label: 'Eastern Cape' },
  { value: 'Free State', label: 'Free State' },
  { value: 'Gauteng', label: 'Gauteng' },
  { value: 'KwaZulu-Natal', label: 'KwaZulu-Natal' },
  { value: 'Limpopo', label: 'Limpopo' },
  { value: 'Mpumalanga', label: 'Mpumalanga' },
  { value: 'Northern Cape', label: 'Northern Cape' },
  { value: 'North West', label: 'North West' },
  { value: 'Western Cape', label: 'Western Cape' },
];

export const MARITAL_STATUS_OPTIONS: PersonnelSelectOption[] = [
  { value: 'Single', label: 'Single' },
  { value: 'Married', label: 'Married' },
  { value: 'Divorced', label: 'Divorced' },
  { value: 'Widowed', label: 'Widowed' },
  { value: 'Life partner', label: 'Life partner' },
];

export const BLOOD_TYPE_OPTIONS: PersonnelSelectOption[] = [
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
];

export const SMOKER_OPTIONS: PersonnelSelectOption[] = [
  { value: 'No', label: 'No' },
  { value: 'Yes', label: 'Yes' },
  { value: 'Former', label: 'Former' },
];

export const YES_NO_OPTIONS: PersonnelSelectOption[] = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
];

export const CLOTHING_SIZE_OPTIONS: PersonnelSelectOption[] = [
  { value: 'XS', label: 'XS' },
  { value: 'S', label: 'S' },
  { value: 'M', label: 'M' },
  { value: 'L', label: 'L' },
  { value: 'XL', label: 'XL' },
  { value: 'XXL', label: 'XXL' },
  { value: 'XXXL', label: 'XXXL' },
];

export const BANK_ACCOUNT_TYPE_OPTIONS: PersonnelSelectOption[] = [
  { value: 'Cheque', label: 'Cheque' },
  { value: 'Savings', label: 'Savings' },
  { value: 'Transmission', label: 'Transmission' },
];

export const EMPLOYMENT_TYPE_OPTIONS: PersonnelSelectOption[] = [
  { value: 'full_time', label: 'Full time' },
  { value: 'part_time', label: 'Part time' },
  { value: 'contract', label: 'Contract' },
  { value: 'temporary', label: 'Temporary' },
];

export const personnelProfileSchemaShape = {
  height: optionalString,
  weight: optionalString,
  hairColor: optionalString,
  eyeColor: optionalString,
  gender: optionalString,
  ethnicity: optionalString,
  bodyType: optionalString,
  smokingHabits: optionalString,
  drinkingHabits: optionalString,
  dateOfBirth: optionalString,
  address: optionalString,
  city: optionalString,
  country: optionalString,
  zipCode: optionalString,
  aboutMe: optionalString,
  socialMedia: optionalString,
  maritalStatus: optionalString,
  numberDependents: optionalNumber,
  currentAge: optionalNumber,
  shoeSize: optionalString,
  shirtSize: optionalString,
  pantsSize: optionalString,
  dressSize: optionalString,
  coatSize: optionalString,
  nationalId: optionalString,
  passportNo: optionalString,
  visaExpiryDate: optionalString,
  fingerIndex: optionalString,
  religion: optionalString,
  overallSize: optionalString,
  complex: optionalString,
  suburb: optionalString,
  province: optionalString,
  ownTransport: optionalString,
  education: optionalString,
  homeLanguage: optionalString,
  secondLanguage: optionalString,
  bloodType: optionalString,
  chronicDisease: optionalString,
  allergies: optionalString,
  vaccinationStatus: optionalString,
  vaccineBrand: optionalString,
  medicalAidName: optionalString,
  medicalAidMembershipNo: optionalString,
  medicalAidType: optionalString,
  taxNumber: optionalString,
  taxOffice: optionalString,
  bankName: optionalString,
  bankAccountNo: optionalString,
  bankBranchCode: optionalString,
  bankAccountType: optionalString,
  lifeInsurance: optionalString,
  personalCarInsurance: optionalString,
  householdInsurance: optionalString,
  funeralPlan: optionalString,
  partnerName: optionalString,
  partnerIdNo: optionalString,
  partnerContactNo: optionalString,
  nextOfKinName: optionalString,
  nextOfKinIdNo: optionalString,
  nextOfKinContactNo: optionalString,
  emergencyContactNo: optionalString,
  mainDependantName: optionalString,
  dependantId: optionalString,
  dependantContactNo: optionalString,
};

export const personnelEmploymentSchemaShape = {
  branchref: optionalString,
  position: optionalString,
  department: optionalString,
  startDate: optionalString,
  endDate: optionalString,
  isCurrentlyEmployed: optionalBoolean,
  email: optionalString,
  contactNumber: optionalString,
  divisionName: optionalString,
  employmentType: optionalString,
  directManager: optionalString,
  directSupervisor: optionalString,
  directTeamLeader: optionalString,
  directDirector: optionalString,
  leaveDays: optionalNumber,
  leaveRate: optionalString,
  medicalLeaveDays: optionalNumber,
  wageType: optionalString,
  wageDay: optionalString,
  salaryDay: optionalString,
  ratePerHour: optionalNumber,
  employeeNumber: optionalString,
};

export const staffProfileSchema = z.object(personnelProfileSchemaShape);
export const staffEmploymentSchema = z.object(personnelEmploymentSchemaShape);

export type StaffProfileFormValues = z.infer<typeof staffProfileSchema>;
export type StaffEmploymentFormValues = z.infer<typeof staffEmploymentSchema>;

export function getEmptyPersonnelProfile(): StaffProfileFormValues {
  return {
    height: null,
    weight: null,
    hairColor: null,
    eyeColor: null,
    gender: null,
    ethnicity: null,
    bodyType: null,
    smokingHabits: null,
    drinkingHabits: null,
    dateOfBirth: null,
    address: null,
    city: null,
    country: null,
    zipCode: null,
    aboutMe: null,
    socialMedia: null,
    maritalStatus: null,
    numberDependents: null,
    currentAge: null,
    shoeSize: null,
    shirtSize: null,
    pantsSize: null,
    dressSize: null,
    coatSize: null,
    nationalId: null,
    passportNo: null,
    visaExpiryDate: null,
    fingerIndex: null,
    religion: null,
    overallSize: null,
    complex: null,
    suburb: null,
    province: null,
    ownTransport: null,
    education: null,
    homeLanguage: null,
    secondLanguage: null,
    bloodType: null,
    chronicDisease: null,
    allergies: null,
    vaccinationStatus: null,
    vaccineBrand: null,
    medicalAidName: null,
    medicalAidMembershipNo: null,
    medicalAidType: null,
    taxNumber: null,
    taxOffice: null,
    bankName: null,
    bankAccountNo: null,
    bankBranchCode: null,
    bankAccountType: null,
    lifeInsurance: null,
    personalCarInsurance: null,
    householdInsurance: null,
    funeralPlan: null,
    partnerName: null,
    partnerIdNo: null,
    partnerContactNo: null,
    nextOfKinName: null,
    nextOfKinIdNo: null,
    nextOfKinContactNo: null,
    emergencyContactNo: null,
    mainDependantName: null,
    dependantId: null,
    dependantContactNo: null,
  };
}

export function getEmptyEmploymentProfile(): StaffEmploymentFormValues {
  return {
    branchref: null,
    position: null,
    department: null,
    startDate: null,
    endDate: null,
    isCurrentlyEmployed: true,
    email: null,
    contactNumber: null,
    divisionName: null,
    employmentType: null,
    directManager: null,
    directSupervisor: null,
    directTeamLeader: null,
    directDirector: null,
    leaveDays: null,
    leaveRate: null,
    medicalLeaveDays: null,
    wageType: null,
    wageDay: null,
    salaryDay: null,
    ratePerHour: null,
    employeeNumber: null,
  };
}

function str(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function num(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function bool(value: unknown): boolean | null {
  if (value == null) return null;
  return Boolean(value);
}

export function mapProfileFromApi(
  profile: Record<string, unknown> | null | undefined,
  parseDate: (value: unknown) => string | null,
): StaffProfileFormValues {
  const empty = getEmptyPersonnelProfile();
  if (!profile) return empty;
  return {
    ...empty,
    height: str(profile.height),
    weight: str(profile.weight),
    hairColor: str(profile.hairColor),
    eyeColor: str(profile.eyeColor),
    gender: str(profile.gender),
    ethnicity: str(profile.ethnicity),
    bodyType: str(profile.bodyType),
    smokingHabits: str(profile.smokingHabits),
    drinkingHabits: str(profile.drinkingHabits),
    dateOfBirth: parseDate(profile.dateOfBirth),
    address: str(profile.address),
    city: str(profile.city),
    country: str(profile.country),
    zipCode: str(profile.zipCode),
    aboutMe: str(profile.aboutMe),
    socialMedia: str(profile.socialMedia),
    maritalStatus: str(profile.maritalStatus),
    numberDependents: num(profile.numberDependents),
    currentAge: num(profile.currentAge),
    shoeSize: str(profile.shoeSize),
    shirtSize: str(profile.shirtSize),
    pantsSize: str(profile.pantsSize),
    dressSize: str(profile.dressSize),
    coatSize: str(profile.coatSize),
    nationalId: str(profile.nationalId),
    passportNo: str(profile.passportNo),
    visaExpiryDate: parseDate(profile.visaExpiryDate),
    fingerIndex: str(profile.fingerIndex),
    religion: str(profile.religion),
    overallSize: str(profile.overallSize),
    complex: str(profile.complex),
    suburb: str(profile.suburb),
    province: str(profile.province),
    ownTransport: str(profile.ownTransport),
    education: str(profile.education),
    homeLanguage: str(profile.homeLanguage),
    secondLanguage: str(profile.secondLanguage),
    bloodType: str(profile.bloodType),
    chronicDisease: str(profile.chronicDisease),
    allergies: str(profile.allergies),
    vaccinationStatus: str(profile.vaccinationStatus),
    vaccineBrand: str(profile.vaccineBrand),
    medicalAidName: str(profile.medicalAidName),
    medicalAidMembershipNo: str(profile.medicalAidMembershipNo),
    medicalAidType: str(profile.medicalAidType),
    taxNumber: str(profile.taxNumber),
    taxOffice: str(profile.taxOffice),
    bankName: str(profile.bankName),
    bankAccountNo: str(profile.bankAccountNo),
    bankBranchCode: str(profile.bankBranchCode),
    bankAccountType: str(profile.bankAccountType),
    lifeInsurance: str(profile.lifeInsurance),
    personalCarInsurance: str(profile.personalCarInsurance),
    householdInsurance: str(profile.householdInsurance),
    funeralPlan: str(profile.funeralPlan),
    partnerName: str(profile.partnerName),
    partnerIdNo: str(profile.partnerIdNo),
    partnerContactNo: str(profile.partnerContactNo),
    nextOfKinName: str(profile.nextOfKinName),
    nextOfKinIdNo: str(profile.nextOfKinIdNo),
    nextOfKinContactNo: str(profile.nextOfKinContactNo),
    emergencyContactNo: str(profile.emergencyContactNo),
    mainDependantName: str(profile.mainDependantName),
    dependantId: str(profile.dependantId),
    dependantContactNo: str(profile.dependantContactNo),
  };
}

export function mapEmploymentFromApi(
  emp: Record<string, unknown> | null | undefined,
  parseDate: (value: unknown) => string | null,
): StaffEmploymentFormValues {
  const empty = getEmptyEmploymentProfile();
  if (!emp) return empty;
  return {
    ...empty,
    branchref: str(emp.branchref),
    position: str(emp.position),
    department: str(emp.department),
    startDate: parseDate(emp.startDate),
    endDate: parseDate(emp.endDate),
    isCurrentlyEmployed: bool(emp.isCurrentlyEmployed) ?? true,
    email: str(emp.email),
    contactNumber: str(emp.contactNumber),
    divisionName: str(emp.divisionName),
    employmentType: str(emp.employmentType),
    directManager: str(emp.directManager),
    directSupervisor: str(emp.directSupervisor),
    directTeamLeader: str(emp.directTeamLeader),
    directDirector: str(emp.directDirector),
    leaveDays: num(emp.leaveDays),
    leaveRate: str(emp.leaveRate),
    medicalLeaveDays: num(emp.medicalLeaveDays),
    wageType: str(emp.wageType),
    wageDay: str(emp.wageDay),
    salaryDay: str(emp.salaryDay),
    ratePerHour: num(emp.ratePerHour),
    employeeNumber: str(emp.employeeNumber),
  };
}

export const PERSONNEL_IDENTITY_FIELDS: PersonnelFieldSpec[] = [
  { name: 'nationalId', label: 'ID No', kind: 'text', placeholder: FORM_PLACEHOLDERS.saId },
  { name: 'passportNo', label: 'Passport No', kind: 'text', placeholder: 'e.g. A12345678' },
  { name: 'visaExpiryDate', label: 'Visa expiry date', kind: 'date' },
  { name: 'fingerIndex', label: 'Finger index', kind: 'text', placeholder: 'e.g. Right index' },
  { name: 'religion', label: 'Religion', kind: 'text', placeholder: 'e.g. Christian' },
  { name: 'ethnicity', label: 'Ethnicity', kind: 'text', placeholder: 'e.g. Xhosa' },
  { name: 'maritalStatus', label: 'Marital status', kind: 'select', options: MARITAL_STATUS_OPTIONS },
];

export const PERSONNEL_SIZE_FIELDS: PersonnelFieldSpec[] = [
  { name: 'height', label: 'Height', kind: 'text', placeholder: 'e.g. 175 cm' },
  { name: 'weight', label: 'Weight', kind: 'text', placeholder: 'e.g. 70 kg' },
  { name: 'shirtSize', label: 'Shirt size', kind: 'select', options: CLOTHING_SIZE_OPTIONS },
  { name: 'shoeSize', label: 'Shoe size', kind: 'text', placeholder: 'e.g. UK 8' },
  { name: 'overallSize', label: 'Overall size', kind: 'select', options: CLOTHING_SIZE_OPTIONS },
  { name: 'pantsSize', label: 'Pants size', kind: 'text', placeholder: 'e.g. 32' },
  { name: 'dressSize', label: 'Dress size', kind: 'select', options: CLOTHING_SIZE_OPTIONS },
  { name: 'coatSize', label: 'Coat size', kind: 'select', options: CLOTHING_SIZE_OPTIONS },
];

export const PERSONNEL_EDUCATION_FIELDS: PersonnelFieldSpec[] = [
  { name: 'education', label: 'Education', kind: 'text', placeholder: 'e.g. BCom Accounting' },
  { name: 'homeLanguage', label: 'Home language', kind: 'text', placeholder: 'e.g. isiXhosa' },
  { name: 'secondLanguage', label: 'Second language', kind: 'text', placeholder: 'e.g. English' },
];

export const PERSONNEL_ADDRESS_FIELDS: PersonnelFieldSpec[] = [
  { name: 'complex', label: 'Complex / plot', kind: 'text', placeholder: 'e.g. Sunrise Estate' },
  { name: 'address', label: 'Street address', kind: 'text', placeholder: FORM_PLACEHOLDERS.street },
  { name: 'suburb', label: 'Suburb / town', kind: 'text', placeholder: FORM_PLACEHOLDERS.suburb },
  { name: 'city', label: 'City', kind: 'text', placeholder: FORM_PLACEHOLDERS.city },
  { name: 'province', label: 'Province / state', kind: 'select', options: SA_PROVINCE_OPTIONS },
  { name: 'zipCode', label: 'Postal code', kind: 'text', placeholder: FORM_PLACEHOLDERS.postalCode },
  { name: 'country', label: 'Country', kind: 'select', options: COUNTRY_OPTIONS },
  { name: 'ownTransport', label: 'Own transport', kind: 'select', options: YES_NO_OPTIONS },
];

export const PERSONNEL_ADDRESS_OPTIONAL_FIELDS: PersonnelFieldSpec[] = PERSONNEL_ADDRESS_FIELDS.filter(
  (field) => field.name !== 'address' && field.name !== 'city' && field.name !== 'country',
);

export const PERSONNEL_HEALTH_FIELDS: PersonnelFieldSpec[] = [
  { name: 'smokingHabits', label: 'Smoker', kind: 'select', options: SMOKER_OPTIONS },
  { name: 'bloodType', label: 'Blood type', kind: 'select', options: BLOOD_TYPE_OPTIONS },
  { name: 'chronicDisease', label: 'Chronic disease', kind: 'text', placeholder: 'e.g. Type 2 diabetes' },
  { name: 'allergies', label: 'Allergies', kind: 'text', placeholder: 'e.g. Peanuts' },
  { name: 'medicalAidName', label: 'Medical aid', kind: 'text', placeholder: 'e.g. Discovery Health' },
  { name: 'medicalAidMembershipNo', label: 'Membership No', kind: 'text', placeholder: 'e.g. 123456789' },
  { name: 'medicalAidType', label: 'Aid type', kind: 'text', placeholder: 'e.g. Comprehensive' },
  { name: 'vaccinationStatus', label: 'Vaccination status', kind: 'text', placeholder: 'e.g. Fully vaccinated' },
  { name: 'vaccineBrand', label: 'Vaccine brand', kind: 'text', placeholder: 'e.g. Pfizer' },
];

export const PERSONNEL_EMERGENCY_FIELDS: PersonnelFieldSpec[] = [
  { name: 'partnerName', label: 'Partner name', kind: 'text', placeholder: FORM_PLACEHOLDERS.fullName },
  { name: 'partnerIdNo', label: 'Partner ID No', kind: 'text', placeholder: FORM_PLACEHOLDERS.saId },
  { name: 'partnerContactNo', label: 'Partner contact No', kind: 'tel', placeholder: FORM_PLACEHOLDERS.phone },
  { name: 'nextOfKinName', label: 'Next of kin', kind: 'text', placeholder: 'e.g. John Smith' },
  { name: 'nextOfKinIdNo', label: 'Next of kin ID No', kind: 'text', placeholder: FORM_PLACEHOLDERS.saId },
  { name: 'nextOfKinContactNo', label: 'Next of kin contact No', kind: 'tel', placeholder: FORM_PLACEHOLDERS.phone },
  { name: 'emergencyContactNo', label: 'Emergency contact No', kind: 'tel', placeholder: FORM_PLACEHOLDERS.phone },
];

export const PERSONNEL_DEPENDANT_FIELDS: PersonnelFieldSpec[] = [
  { name: 'mainDependantName', label: 'Main dependant name', kind: 'text', placeholder: 'e.g. Child Smith' },
  { name: 'dependantId', label: 'Dependant ID', kind: 'text', placeholder: FORM_PLACEHOLDERS.saId },
  { name: 'dependantContactNo', label: 'Dependant contact No', kind: 'tel', placeholder: FORM_PLACEHOLDERS.phone },
  { name: 'numberDependents', label: 'No of dependants', kind: 'number', placeholder: 'e.g. 2' },
];

export const PERSONNEL_BANKING_FIELDS: PersonnelFieldSpec[] = [
  { name: 'bankName', label: 'Bank name', kind: 'text', placeholder: 'e.g. FNB' },
  { name: 'bankAccountNo', label: 'Account No', kind: 'text', placeholder: '7–11 digits' },
  { name: 'bankBranchCode', label: 'Branch code', kind: 'text', placeholder: '6 digits' },
  { name: 'bankAccountType', label: 'Account type', kind: 'select', options: BANK_ACCOUNT_TYPE_OPTIONS },
];

export const PERSONNEL_TAX_FIELDS: PersonnelFieldSpec[] = [
  { name: 'taxNumber', label: 'Tax number', kind: 'text', placeholder: '10-digit tax number' },
  { name: 'taxOffice', label: 'Tax office', kind: 'text', placeholder: 'e.g. SARS Cape Town' },
];

export const PERSONNEL_INSURANCE_FIELDS: PersonnelFieldSpec[] = [
  { name: 'lifeInsurance', label: 'Life insurance', kind: 'text', placeholder: 'e.g. Old Mutual' },
  { name: 'personalCarInsurance', label: 'Car insurance', kind: 'text', placeholder: 'e.g. Outsurance' },
  { name: 'householdInsurance', label: 'Household insurance', kind: 'text', placeholder: 'e.g. Santam' },
  { name: 'funeralPlan', label: 'Funeral plan', kind: 'text', placeholder: 'e.g. AVBOB' },
];

export const JOB_INFORMATION_FIELDS: PersonnelFieldSpec[] = [
  { name: 'employeeNumber', label: 'Employee No', kind: 'text', placeholder: 'e.g. EMP001' },
  { name: 'divisionName', label: 'Division name', kind: 'text', placeholder: 'e.g. Retail Division' },
  { name: 'employmentType', label: 'Employment type', kind: 'select', options: EMPLOYMENT_TYPE_OPTIONS },
  { name: 'directManager', label: 'Direct manager', kind: 'text', placeholder: FORM_PLACEHOLDERS.fullName },
  { name: 'directSupervisor', label: 'Direct supervisor', kind: 'text', placeholder: 'e.g. John Doe' },
  { name: 'directTeamLeader', label: 'Direct team leader', kind: 'text', placeholder: 'e.g. Sarah Jones' },
  { name: 'directDirector', label: 'Direct director', kind: 'text', placeholder: 'e.g. Michael Brown' },
  { name: 'leaveDays', label: 'Leave days', kind: 'number', placeholder: 'e.g. 15' },
  { name: 'leaveRate', label: 'Leave rate', kind: 'text', placeholder: 'e.g. 1.0 per month' },
  { name: 'medicalLeaveDays', label: 'Medical leave days', kind: 'number', placeholder: 'e.g. 3' },
  { name: 'wageType', label: 'Wage type', kind: 'text', placeholder: 'e.g. Monthly' },
  { name: 'wageDay', label: 'Wage day', kind: 'text', placeholder: 'e.g. Last Friday' },
  { name: 'salaryDay', label: 'Salary day', kind: 'text', placeholder: 'e.g. 25' },
  { name: 'ratePerHour', label: 'Rate per hour (ZAR)', kind: 'number', placeholder: 'e.g. 85.50' },
];

export const PERSONNEL_DETAILS_GROUPS: { title: string; fields: PersonnelFieldSpec[] }[] = [
  {
    title: 'Identity',
    fields: [
      { name: 'gender', label: 'Gender', kind: 'select', options: GENDER_OPTIONS },
      { name: 'dateOfBirth', label: 'Date of birth', kind: 'date', datePreset: 'birthdate' },
      ...PERSONNEL_IDENTITY_FIELDS,
    ],
  },
  { title: 'Sizes', fields: PERSONNEL_SIZE_FIELDS },
  { title: 'Education and languages', fields: PERSONNEL_EDUCATION_FIELDS },
  { title: 'Address', fields: PERSONNEL_ADDRESS_FIELDS },
  { title: 'Medical', fields: PERSONNEL_HEALTH_FIELDS },
  { title: 'Emergency contacts', fields: PERSONNEL_EMERGENCY_FIELDS },
  { title: 'Dependants', fields: PERSONNEL_DEPENDANT_FIELDS },
  { title: 'Banking', fields: PERSONNEL_BANKING_FIELDS },
  { title: 'Tax', fields: PERSONNEL_TAX_FIELDS },
  { title: 'Insurance', fields: PERSONNEL_INSURANCE_FIELDS },
];

import { z } from 'zod';

const optionalString = z.string().optional().nullable();
const optionalNumber = z.union([z.number(), z.null()]).optional();
const optionalBoolean = z.boolean().optional().nullable();

export type PersonnelFieldKind = 'text' | 'date' | 'number' | 'tel';

export type PersonnelFieldSpec = {
  name: string;
  label: string;
  kind: PersonnelFieldKind;
  placeholder?: string;
};

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
  { name: 'nationalId', label: 'ID No', kind: 'text' },
  { name: 'passportNo', label: 'Passport No', kind: 'text' },
  { name: 'visaExpiryDate', label: 'Visa expiry date', kind: 'date' },
  { name: 'fingerIndex', label: 'Finger index', kind: 'text' },
  { name: 'religion', label: 'Religion', kind: 'text' },
  { name: 'ethnicity', label: 'Ethnicity', kind: 'text' },
  { name: 'maritalStatus', label: 'Marital status', kind: 'text' },
];

export const PERSONNEL_SIZE_FIELDS: PersonnelFieldSpec[] = [
  { name: 'height', label: 'Height', kind: 'text', placeholder: 'e.g. 175 cm' },
  { name: 'weight', label: 'Weight', kind: 'text', placeholder: 'e.g. 70 kg' },
  { name: 'shirtSize', label: 'Shirt size', kind: 'text' },
  { name: 'shoeSize', label: 'Shoe size', kind: 'text' },
  { name: 'overallSize', label: 'Overall size', kind: 'text' },
  { name: 'pantsSize', label: 'Pants size', kind: 'text' },
  { name: 'dressSize', label: 'Dress size', kind: 'text' },
  { name: 'coatSize', label: 'Coat size', kind: 'text' },
];

export const PERSONNEL_EDUCATION_FIELDS: PersonnelFieldSpec[] = [
  { name: 'education', label: 'Education', kind: 'text' },
  { name: 'homeLanguage', label: 'Home language', kind: 'text' },
  { name: 'secondLanguage', label: 'Second language', kind: 'text' },
];

export const PERSONNEL_ADDRESS_FIELDS: PersonnelFieldSpec[] = [
  { name: 'complex', label: 'Complex / plot', kind: 'text' },
  { name: 'address', label: 'Street address', kind: 'text' },
  { name: 'suburb', label: 'Suburb / town', kind: 'text' },
  { name: 'city', label: 'City', kind: 'text' },
  { name: 'province', label: 'Province / state', kind: 'text' },
  { name: 'zipCode', label: 'Postal code', kind: 'text' },
  { name: 'country', label: 'Country', kind: 'text' },
  { name: 'ownTransport', label: 'Own transport', kind: 'text', placeholder: 'Yes / N/A' },
];

export const PERSONNEL_ADDRESS_OPTIONAL_FIELDS: PersonnelFieldSpec[] = PERSONNEL_ADDRESS_FIELDS.filter(
  (field) => field.name !== 'address' && field.name !== 'city' && field.name !== 'country',
);

export const PERSONNEL_HEALTH_FIELDS: PersonnelFieldSpec[] = [
  { name: 'smokingHabits', label: 'Smoker', kind: 'text' },
  { name: 'bloodType', label: 'Blood type', kind: 'text' },
  { name: 'chronicDisease', label: 'Chronic disease', kind: 'text' },
  { name: 'allergies', label: 'Allergies', kind: 'text' },
  { name: 'medicalAidName', label: 'Medical aid', kind: 'text' },
  { name: 'medicalAidMembershipNo', label: 'Membership No', kind: 'text' },
  { name: 'medicalAidType', label: 'Aid type', kind: 'text' },
  { name: 'vaccinationStatus', label: 'Vaccination status', kind: 'text' },
  { name: 'vaccineBrand', label: 'Vaccine brand', kind: 'text' },
];

export const PERSONNEL_EMERGENCY_FIELDS: PersonnelFieldSpec[] = [
  { name: 'partnerName', label: 'Partner name', kind: 'text' },
  { name: 'partnerIdNo', label: 'Partner ID No', kind: 'text' },
  { name: 'partnerContactNo', label: 'Partner contact No', kind: 'tel' },
  { name: 'nextOfKinName', label: 'Next of kin', kind: 'text' },
  { name: 'nextOfKinIdNo', label: 'Next of kin ID No', kind: 'text' },
  { name: 'nextOfKinContactNo', label: 'Next of kin contact No', kind: 'tel' },
  { name: 'emergencyContactNo', label: 'Emergency contact No', kind: 'tel' },
];

export const PERSONNEL_DEPENDANT_FIELDS: PersonnelFieldSpec[] = [
  { name: 'mainDependantName', label: 'Main dependant name', kind: 'text' },
  { name: 'dependantId', label: 'Dependant ID', kind: 'text' },
  { name: 'dependantContactNo', label: 'Dependant contact No', kind: 'tel' },
  { name: 'numberDependents', label: 'No of dependants', kind: 'number' },
];

export const PERSONNEL_BANKING_FIELDS: PersonnelFieldSpec[] = [
  { name: 'bankName', label: 'Bank name', kind: 'text' },
  { name: 'bankAccountNo', label: 'Account No', kind: 'text' },
  { name: 'bankBranchCode', label: 'Branch code', kind: 'text' },
  { name: 'bankAccountType', label: 'Account type', kind: 'text', placeholder: 'Cheque' },
];

export const PERSONNEL_TAX_FIELDS: PersonnelFieldSpec[] = [
  { name: 'taxNumber', label: 'Tax number', kind: 'text' },
  { name: 'taxOffice', label: 'Tax office', kind: 'text' },
];

export const PERSONNEL_INSURANCE_FIELDS: PersonnelFieldSpec[] = [
  { name: 'lifeInsurance', label: 'Life insurance', kind: 'text' },
  { name: 'personalCarInsurance', label: 'Car insurance', kind: 'text' },
  { name: 'householdInsurance', label: 'Household insurance', kind: 'text' },
  { name: 'funeralPlan', label: 'Funeral plan', kind: 'text' },
];

export const JOB_INFORMATION_FIELDS: PersonnelFieldSpec[] = [
  { name: 'employeeNumber', label: 'Employee No', kind: 'text' },
  { name: 'divisionName', label: 'Division name', kind: 'text' },
  { name: 'employmentType', label: 'Employment type', kind: 'text', placeholder: 'full_time / part_time / contract' },
  { name: 'directManager', label: 'Direct manager', kind: 'text' },
  { name: 'directSupervisor', label: 'Direct supervisor', kind: 'text' },
  { name: 'directTeamLeader', label: 'Direct team leader', kind: 'text' },
  { name: 'directDirector', label: 'Direct director', kind: 'text' },
  { name: 'leaveDays', label: 'Leave days', kind: 'number' },
  { name: 'leaveRate', label: 'Leave rate', kind: 'text' },
  { name: 'medicalLeaveDays', label: 'Medical leave days', kind: 'number' },
  { name: 'wageType', label: 'Wage type', kind: 'text' },
  { name: 'wageDay', label: 'Wage day', kind: 'text' },
  { name: 'salaryDay', label: 'Salary day', kind: 'text' },
  { name: 'ratePerHour', label: 'Rate per hour (ZAR)', kind: 'number' },
];

export const PERSONNEL_DETAILS_GROUPS: { title: string; fields: PersonnelFieldSpec[] }[] = [
  {
    title: 'Identity',
    fields: [
      { name: 'gender', label: 'Gender', kind: 'text' },
      { name: 'dateOfBirth', label: 'Date of birth', kind: 'date' },
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

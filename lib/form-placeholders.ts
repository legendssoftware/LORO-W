/** Repeated data-entry placeholder copy. Unique field hints stay inline. */

export const FORM_PLACEHOLDERS = {
  firstName: 'Jane',
  surname: 'Smith',
  fullName: 'e.g. Jane Smith',
  email: 'jane.smith@example.com',
  workEmail: 'work@company.com',
  phone: '+27 64 123 4567',
  landline: '+27 11 123 4567',
  nationalId: 'e.g. 13-digit SA ID or national ID',
  idOrPassport: 'e.g. ID or passport number',
  website: 'https://…',
  street: 'e.g. 12 Main Road',
  suburb: 'e.g. Rondebosch',
  city: 'e.g. Cape Town',
  province: 'e.g. Western Cape',
  country: 'e.g. South Africa',
  postalCode: 'e.g. 7700',
  companyName: 'e.g. Acme Holdings (Pty) Ltd',
  position: 'e.g. Sales Representative',
  department: 'e.g. Sales',
  branchRef: 'e.g. BR001',
  zero: '0',
  amount: '0.00',
} as const;

export const ADDRESS_FIELD_PLACEHOLDERS: Record<string, string> = {
  street: FORM_PLACEHOLDERS.street,
  suburb: FORM_PLACEHOLDERS.suburb,
  city: FORM_PLACEHOLDERS.city,
  state: FORM_PLACEHOLDERS.province,
  province: FORM_PLACEHOLDERS.province,
  country: FORM_PLACEHOLDERS.country,
  postalCode: FORM_PLACEHOLDERS.postalCode,
};

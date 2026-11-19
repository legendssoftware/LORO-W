/** Repeated data-entry placeholder keys under `common.placeholders`. */

import type { TFunction } from 'i18next';

export type FormPlaceholderKey =
  | 'firstName'
  | 'surname'
  | 'fullName'
  | 'email'
  | 'workEmail'
  | 'phone'
  | 'landline'
  | 'nationalId'
  | 'idOrPassport'
  | 'website'
  | 'street'
  | 'suburb'
  | 'city'
  | 'province'
  | 'country'
  | 'postalCode'
  | 'companyName'
  | 'position'
  | 'department'
  | 'branchRef'
  | 'zero'
  | 'amount';

/** @deprecated Prefer `formPlaceholder(t, key)` so copy follows the active locale. */
export const FORM_PLACEHOLDERS: Record<FormPlaceholderKey, string> = {
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
};

export function formPlaceholder(t: TFunction, key: FormPlaceholderKey): string {
  return t(`placeholders.${key}`);
}

export function addressFieldPlaceholder(t: TFunction, field: string): string {
  const key =
    field === 'state' || field === 'province'
      ? 'province'
      : field === 'postalCode'
        ? 'postalCode'
        : field === 'street' ||
            field === 'suburb' ||
            field === 'city' ||
            field === 'country'
          ? (field as FormPlaceholderKey)
          : null;
  if (!key) return '';
  return formPlaceholder(t, key);
}

/** @deprecated Prefer `addressFieldPlaceholder(t, field)`. */
export const ADDRESS_FIELD_PLACEHOLDERS: Record<string, string> = {
  street: FORM_PLACEHOLDERS.street,
  suburb: FORM_PLACEHOLDERS.suburb,
  city: FORM_PLACEHOLDERS.city,
  state: FORM_PLACEHOLDERS.province,
  province: FORM_PLACEHOLDERS.province,
  country: FORM_PLACEHOLDERS.country,
  postalCode: FORM_PLACEHOLDERS.postalCode,
};

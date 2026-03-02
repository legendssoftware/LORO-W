/**
 * Shared constants and validation for visit forms (End visit, Edit visit).
 */

import type { MethodOfContact, UpdateVisitDetailsPayload } from '@/api/types/visits';

export const METHOD_OPTIONS: { value: MethodOfContact; label: string }[] = [
  { value: 'Physical', label: 'Physical' },
  { value: 'Telephone', label: 'Telephone' },
  { value: 'Email', label: 'Email' },
  { value: 'Whatsapp', label: 'WhatsApp' },
];

export const TYPE_OF_BUSINESS_OPTIONS: { value: string; label: string }[] = [
  { value: 'HARDWARE', label: 'Hardware' },
  { value: 'CONTRACTOR', label: 'Contractor' },
  { value: 'HOME_OWNER', label: 'Home owner' },
  { value: 'TECHNOLOGY', label: 'Technology' },
  { value: 'HEALTHCARE', label: 'Healthcare' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'RETAIL', label: 'Retail' },
  { value: 'MANUFACTURING', label: 'Manufacturing' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'CONSTRUCTION', label: 'Construction' },
  { value: 'REAL_ESTATE', label: 'Real estate' },
  { value: 'AUTOMOTIVE', label: 'Automotive' },
  { value: 'AGRICULTURE', label: 'Agriculture' },
  { value: 'ENERGY', label: 'Energy' },
  { value: 'TELECOMMUNICATIONS', label: 'Telecommunications' },
  { value: 'ENTERTAINMENT', label: 'Entertainment' },
  { value: 'HOSPITALITY', label: 'Hospitality' },
  { value: 'TRANSPORTATION', label: 'Transportation' },
  { value: 'GOVERNMENT', label: 'Government' },
  { value: 'NON_PROFIT', label: 'Non-profit' },
  { value: 'CONSULTING', label: 'Consulting' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'LEGAL', label: 'Legal' },
  { value: 'OTHER', label: 'Other' },
];

export const SITE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'office', label: 'Office' },
  { value: 'home', label: 'Home' },
  { value: 'shop', label: 'Shop' },
  { value: 'garage', label: 'Garage' },
  { value: 'factory', label: 'Factory' },
  { value: 'construction', label: 'Construction' },
  { value: 'residential-apartment', label: 'Residential apartment' },
  { value: 'other-business', label: 'Other business' },
  { value: 'other', label: 'Other' },
];

export const QUOTATION_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '_none', label: 'None' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_internal', label: 'Pending internal' },
  { value: 'pending_client', label: 'Pending client' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'sourcing', label: 'Sourcing' },
  { value: 'packing', label: 'Packing' },
  { value: 'in_fulfillment', label: 'In fulfillment' },
  { value: 'paid', label: 'Paid' },
  { value: 'outfordelivery', label: 'Out for delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'returned', label: 'Returned' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'postponed', label: 'Postponed' },
  { value: 'inprogress', label: 'In progress' },
  { value: 'pending', label: 'Pending' },
];

export const CURRENCY_OPTIONS: { value: string; label: string }[] = [
  { value: 'ZAR', label: 'ZAR (South African Rand)' },
  { value: 'USD', label: 'USD (US Dollar)' },
  { value: 'EUR', label: 'EUR (Euro)' },
  { value: 'GBP', label: 'GBP (British Pound)' },
  { value: 'BWP', label: 'BWP (Botswana Pula)' },
  { value: 'NAD', label: 'NAD (Namibian Dollar)' },
];

export const PERSON_POSITION_OPTIONS: { value: string; label: string }[] = [
  { value: 'Owner', label: 'Owner' },
  { value: 'Buyer', label: 'Buyer' },
  { value: 'Receptionist', label: 'Receptionist' },
];

export const MAX_CONTACT_FULL_NAME = 200;
export const MAX_COMPANY_NAME = 255;
export const MAX_PERSON_SEEN_POSITION = 200;
export const MAX_PHONE = 25;
export const MAX_EMAIL = 255;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^[+]?[\d\s\-().]*$/;

export function validateVisitForm(form: Partial<UpdateVisitDetailsPayload>): string[] {
  const errors: string[] = [];
  const fullName = (form.contactFullName ?? '').trim();
  const company = (form.companyName ?? '').trim();
  const position = (form.personSeenPosition ?? '').trim();
  const cell = (form.contactCellPhone ?? '').trim();
  const landline = (form.contactLandline ?? '').trim();
  const email = (form.contactEmail ?? '').trim();
  if (fullName.length > MAX_CONTACT_FULL_NAME) {
    errors.push(`Contact name must be ${MAX_CONTACT_FULL_NAME} characters or less.`);
  }
  if (company.length > MAX_COMPANY_NAME) {
    errors.push(`Company name must be ${MAX_COMPANY_NAME} characters or less.`);
  }
  if (position.length > MAX_PERSON_SEEN_POSITION) {
    errors.push(`Position must be ${MAX_PERSON_SEEN_POSITION} characters or less.`);
  }
  if (cell.length > MAX_PHONE) {
    errors.push(`Cell phone must be ${MAX_PHONE} characters or less.`);
  }
  if (cell && !PHONE_REGEX.test(cell)) {
    errors.push('Cell phone may only contain digits, spaces, +, -, ., or parentheses.');
  }
  if (landline.length > MAX_PHONE) {
    errors.push(`Landline must be ${MAX_PHONE} characters or less.`);
  }
  if (landline && !PHONE_REGEX.test(landline)) {
    errors.push('Landline may only contain digits, spaces, +, -, ., or parentheses.');
  }
  if (email.length > MAX_EMAIL) {
    errors.push(`Email must be ${MAX_EMAIL} characters or less.`);
  }
  if (email && !EMAIL_REGEX.test(email)) {
    errors.push('Please enter a valid email address.');
  }
  return errors;
}

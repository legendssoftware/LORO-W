/**
 * Shared constants and validation for visit forms (End visit, Edit visit).
 * Each option includes an icon component for dropdown display.
 */

import type { ComponentType } from 'react';
import type { MethodOfContact, UpdateVisitDetailsPayload } from '@/api/types/visits';
import {
  MapPinIcon,
  PhoneCallIcon,
  MailIcon,
  MessageSquareIcon,
  BanknoteIcon,
  StoreIcon,
  ShoppingCartIcon,
} from '@/lib/icons';
import {
  Wrench,
  HardHat,
  Construction,
  Home,
  Cpu,
  HeartPulse,
  Landmark,
  Factory,
  GraduationCap,
  Building2,
  Car,
  Wheat,
  Zap,
  Radio,
  Film,
  UtensilsCrossed,
  Truck,
  HeartHandshake,
  Lightbulb,
  Megaphone,
  Scale,
  MoreHorizontal,
  Building,
  Briefcase,
  FileEdit,
  Clock,
  UserCheck,
  Handshake,
  CheckCircle,
  XCircle,
  Search,
  Package,
  PackageCheck,
  RotateCcw,
  CircleCheck,
  CalendarClock,
  Loader2,
  Crown,
  UserCircle,
  Minus,
  BedDouble,
} from 'lucide-react';

type IconComponent = ComponentType<{ className?: string; size?: number }>;

export const METHOD_OPTIONS: { value: MethodOfContact; label: string; icon: IconComponent }[] = [
  { value: 'Physical', label: 'Physical', icon: MapPinIcon },
  { value: 'Telephone', label: 'Telephone', icon: PhoneCallIcon },
  { value: 'Email', label: 'Email', icon: MailIcon },
  { value: 'Whatsapp', label: 'WhatsApp', icon: MessageSquareIcon },
];

export const TYPE_OF_BUSINESS_OPTIONS: { value: string; label: string; icon: IconComponent }[] = [
  { value: 'HARDWARE', label: 'Hardware', icon: Wrench },
  { value: 'CONTRACTOR', label: 'Contractor', icon: HardHat },
  { value: 'HOME_OWNER', label: 'Home owner', icon: Home },
  { value: 'TECHNOLOGY', label: 'Technology', icon: Cpu },
  { value: 'HEALTHCARE', label: 'Healthcare', icon: HeartPulse },
  { value: 'FINANCE', label: 'Finance', icon: Landmark },
  { value: 'RETAIL', label: 'Retail', icon: StoreIcon },
  { value: 'MANUFACTURING', label: 'Manufacturing', icon: Factory },
  { value: 'EDUCATION', label: 'Education', icon: GraduationCap },
  { value: 'CONSTRUCTION', label: 'Construction', icon: Construction },
  { value: 'REAL_ESTATE', label: 'Real estate', icon: Building2 },
  { value: 'AUTOMOTIVE', label: 'Automotive', icon: Car },
  { value: 'AGRICULTURE', label: 'Agriculture', icon: Wheat },
  { value: 'ENERGY', label: 'Energy', icon: Zap },
  { value: 'TELECOMMUNICATIONS', label: 'Telecommunications', icon: Radio },
  { value: 'ENTERTAINMENT', label: 'Entertainment', icon: Film },
  { value: 'HOSPITALITY', label: 'Hospitality', icon: UtensilsCrossed },
  { value: 'TRANSPORTATION', label: 'Transportation', icon: Truck },
  { value: 'GOVERNMENT', label: 'Government', icon: Building2 },
  { value: 'NON_PROFIT', label: 'Non-profit', icon: HeartHandshake },
  { value: 'CONSULTING', label: 'Consulting', icon: Lightbulb },
  { value: 'MARKETING', label: 'Marketing', icon: Megaphone },
  { value: 'LEGAL', label: 'Legal', icon: Scale },
  { value: 'UPHOLSTERY', label: 'Upholstery', icon: BedDouble },
  { value: 'SHOP_FITTERS', label: 'Shop fitters', icon: HardHat },
  { value: 'OTHER', label: 'Other', icon: MoreHorizontal },
];

export const SITE_TYPE_OPTIONS: { value: string; label: string; icon: IconComponent }[] = [
  { value: 'office', label: 'Office', icon: Building2 },
  { value: 'home', label: 'Home', icon: Home },
  { value: 'shop', label: 'Shop', icon: StoreIcon },
  { value: 'garage', label: 'Garage', icon: Wrench },
  { value: 'factory', label: 'Factory', icon: Factory },
  { value: 'construction', label: 'Construction', icon: HardHat },
  { value: 'residential-apartment', label: 'Residential apartment', icon: Building },
  { value: 'other-business', label: 'Other business', icon: Briefcase },
  { value: 'other', label: 'Other', icon: MoreHorizontal },
];

export const QUOTATION_STATUS_OPTIONS: { value: string; label: string; icon: IconComponent }[] = [
  { value: '_none', label: 'None', icon: Minus },
  { value: 'draft', label: 'Draft', icon: FileEdit },
  { value: 'pending_internal', label: 'Pending internal', icon: Clock },
  { value: 'pending_client', label: 'Pending client', icon: UserCheck },
  { value: 'negotiation', label: 'Negotiation', icon: Handshake },
  { value: 'approved', label: 'Approved', icon: CheckCircle },
  { value: 'rejected', label: 'Rejected', icon: XCircle },
  { value: 'sourcing', label: 'Sourcing', icon: Search },
  { value: 'packing', label: 'Packing', icon: Package },
  { value: 'in_fulfillment', label: 'In fulfillment', icon: PackageCheck },
  { value: 'paid', label: 'Paid', icon: BanknoteIcon },
  { value: 'outfordelivery', label: 'Out for delivery', icon: Truck },
  { value: 'delivered', label: 'Delivered', icon: CircleCheck },
  { value: 'returned', label: 'Returned', icon: RotateCcw },
  { value: 'completed', label: 'Completed', icon: CircleCheck },
  { value: 'cancelled', label: 'Cancelled', icon: XCircle },
  { value: 'postponed', label: 'Postponed', icon: CalendarClock },
  { value: 'inprogress', label: 'In progress', icon: Loader2 },
  { value: 'pending', label: 'Pending', icon: Clock },
];

export const CURRENCY_OPTIONS: { value: string; label: string; icon: IconComponent }[] = [
  { value: 'ZAR', label: 'ZAR (South African Rand)', icon: BanknoteIcon },
  { value: 'USD', label: 'USD (US Dollar)', icon: BanknoteIcon },
  { value: 'EUR', label: 'EUR (Euro)', icon: BanknoteIcon },
  { value: 'GBP', label: 'GBP (British Pound)', icon: BanknoteIcon },
  { value: 'BWP', label: 'BWP (Botswana Pula)', icon: BanknoteIcon },
  { value: 'NAD', label: 'NAD (Namibian Dollar)', icon: BanknoteIcon },
];

export const PERSON_POSITION_OPTIONS: { value: string; label: string; icon: IconComponent }[] = [
  { value: 'Owner', label: 'Owner', icon: Crown },
  { value: 'Buyer', label: 'Buyer', icon: ShoppingCartIcon },
  { value: 'Receptionist', label: 'Receptionist', icon: UserCircle },
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

/** ISO 4217 currency options for target currency dropdown. */
export const CURRENCY_OPTIONS = [
  { value: 'ZAR', label: 'ZAR - South African Rand' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'CHF', label: 'CHF - Swiss Franc' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'BWP', label: 'BWP - Botswana Pula' },
  { value: 'NAD', label: 'NAD - Namibian Dollar' },
  { value: 'SZL', label: 'SZL - Swazi Lilangeni' },
  { value: 'LSL', label: 'LSL - Lesotho Loti' },
  { value: 'NGN', label: 'NGN - Nigerian Naira' },
  { value: 'KES', label: 'KES - Kenyan Shilling' },
  { value: 'GHS', label: 'GHS - Ghanaian Cedi' },
  { value: 'MUR', label: 'MUR - Mauritian Rupee' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'CNY', label: 'CNY - Chinese Yuan' },
] as const;

/** Target period options for dropdown. */
export const TARGET_PERIOD_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
] as const;

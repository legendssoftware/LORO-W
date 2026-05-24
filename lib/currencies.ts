/**
 * Currency picker options — keep in sync with server/src/lib/constants/currencies.ts
 */
export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'NAD', name: 'Namibian Dollar', symbol: 'N$' },
  { code: 'BWP', name: 'Botswana Pula', symbol: 'P' },
  { code: 'ZMW', name: 'Zambian Kwacha', symbol: 'ZK' },
  { code: 'ZWL', name: 'Zimbabwean Dollar', symbol: 'ZiG' },
  { code: 'MZN', name: 'Mozambican Metical', symbol: 'MT' },
  { code: 'SZL', name: 'Swazi Lilangeni', symbol: 'E' },
  { code: 'LSL', name: 'Lesotho Loti', symbol: 'L' },
  { code: 'MWK', name: 'Malawian Kwacha', symbol: 'MK' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh' },
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'FRw' },
  { code: 'BIF', name: 'Burundian Franc', symbol: 'FBu' },
  { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br' },
  { code: 'SOS', name: 'Somali Shilling', symbol: 'Sh' },
  { code: 'DJF', name: 'Djiboutian Franc', symbol: 'Fdj' },
  { code: 'ERN', name: 'Eritrean Nakfa', symbol: 'Nfk' },
  { code: 'SSP', name: 'South Sudanese Pound', symbol: '£' },
  { code: 'SDG', name: 'Sudanese Pound', symbol: '£' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵' },
  { code: 'XOF', name: 'West African CFA Franc', symbol: 'CFA' },
  { code: 'XAF', name: 'Central African CFA Franc', symbol: 'FCFA' },
  { code: 'GMD', name: 'Gambian Dalasi', symbol: 'D' },
  { code: 'GNF', name: 'Guinean Franc', symbol: 'FG' },
  { code: 'SLE', name: 'Sierra Leonean Leone', symbol: 'Le' },
  { code: 'LRD', name: 'Liberian Dollar', symbol: 'L$' },
  { code: 'CVE', name: 'Cape Verdean Escudo', symbol: '$' },
  { code: 'STN', name: 'São Tomé Dobra', symbol: 'Db' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'DH' },
  { code: 'TND', name: 'Tunisian Dinar', symbol: 'DT' },
  { code: 'DZD', name: 'Algerian Dinar', symbol: 'DA' },
  { code: 'LYD', name: 'Libyan Dinar', symbol: 'LD' },
  { code: 'MRU', name: 'Mauritanian Ouguiya', symbol: 'UM' },
  { code: 'MUR', name: 'Mauritian Rupee', symbol: '₨' },
  { code: 'SCR', name: 'Seychellois Rupee', symbol: '₨' },
  { code: 'KMF', name: 'Comorian Franc', symbol: 'CF' },
  { code: 'MGA', name: 'Malagasy Ariary', symbol: 'Ar' },
  { code: 'AOA', name: 'Angolan Kwanza', symbol: 'Kz' },
  { code: 'CDF', name: 'Congolese Franc', symbol: 'FC' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'PLN', name: 'Polish Złoty', symbol: 'zł' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei' },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QR' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BD' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'OMR' },
  { code: 'JOD', name: 'Jordanian Dinar', symbol: 'JD' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'ARS', name: 'Argentine Peso', symbol: 'AR$' },
  { code: 'CLP', name: 'Chilean Peso', symbol: 'CL$' },
  { code: 'COP', name: 'Colombian Peso', symbol: 'COL$' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/' },
  { code: 'UYU', name: 'Uruguayan Peso', symbol: '$U' },
  { code: 'BOB', name: 'Bolivian Boliviano', symbol: 'Bs' },
  { code: 'PYG', name: 'Paraguayan Guaraní', symbol: '₲' },
  { code: 'CRC', name: 'Costa Rican Colón', symbol: '₡' },
  { code: 'GTQ', name: 'Guatemalan Quetzal', symbol: 'Q' },
  { code: 'DOP', name: 'Dominican Peso', symbol: 'RD$' },
  { code: 'JMD', name: 'Jamaican Dollar', symbol: 'J$' },
  { code: 'TTD', name: 'Trinidad Dollar', symbol: 'TT$' },
  { code: 'XCD', name: 'East Caribbean Dollar', symbol: 'EC$' },
  { code: 'FJD', name: 'Fijian Dollar', symbol: 'FJ$' },
  { code: 'PGK', name: 'Papua New Guinean Kina', symbol: 'K' },
  { code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴' },
  { code: 'GEL', name: 'Georgian Lari', symbol: '₾' },
  { code: 'AMD', name: 'Armenian Dram', symbol: '֏' },
  { code: 'AZN', name: 'Azerbaijani Manat', symbol: '₼' },
  { code: 'BYN', name: 'Belarusian Ruble', symbol: 'Br' },
  { code: 'MDL', name: 'Moldovan Leu', symbol: 'L' },
  { code: 'RSD', name: 'Serbian Dinar', symbol: 'din' },
  { code: 'MKD', name: 'Macedonian Denar', symbol: 'den' },
  { code: 'ALL', name: 'Albanian Lek', symbol: 'L' },
  { code: 'BAM', name: 'Bosnia Mark', symbol: 'KM' },
  { code: 'ISK', name: 'Icelandic Króna', symbol: 'kr' },
];

export function getCurrencySymbol(code: string): string {
  return CURRENCY_OPTIONS.find((c) => c.code === code)?.symbol ?? code;
}

/** Picker row label — aligned with apk/lib/enums/claims.enum.ts */
export function getClaimCurrencyLabel(code: string): string {
  const row = CURRENCY_OPTIONS.find((c) => c.code === code);
  if (!row) return code;
  return `${row.code} - ${row.name}`;
}

/** Compact trigger label — aligned with apk claims create/edit screens */
export function getClaimCurrencyTriggerLabel(code: string): string {
  if (!code) return 'Select currency';
  return `${code} - ${getCurrencySymbol(code)}`;
}

export interface ClaimCurrencyPickerRow {
  code: string;
  label: string;
  symbol: string;
  searchText: string;
}

/** Searchable currency rows for claims pickers (Africa-first catalog). */
export function buildClaimCurrencyPickerRows(): ClaimCurrencyPickerRow[] {
  return CURRENCY_OPTIONS.map((c) => ({
    code: c.code,
    label: getClaimCurrencyLabel(c.code),
    symbol: c.symbol,
    searchText: `${c.code} ${c.name} ${c.symbol}`.toLowerCase(),
  }));
}

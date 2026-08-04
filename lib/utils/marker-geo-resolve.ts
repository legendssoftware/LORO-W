/**
 * Strict country + admin-region resolution for map markers.
 * Never invents countries from free text; provinces are canonical only.
 */

export const UNMAPPED = 'Unmapped';
export const NOT_SET = 'Not set';

export const ALLOWED_COUNTRIES = [
  'South Africa',
  'Botswana',
  'Zimbabwe',
  'Namibia',
  'Lesotho',
  'Eswatini',
  'Mozambique',
  'Zambia',
  'Malawi',
  'Congo',
  'Tanzania',
] as const;

export type AllowedCountry = (typeof ALLOWED_COUNTRIES)[number];

export const SA_PROVINCES = [
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Free State',
  'Northern Cape',
] as const;

export type SaProvince = (typeof SA_PROVINCES)[number];

const COUNTRY_BY_TOKEN: Record<string, AllowedCountry> = {
  'SOUTH AFRICA': 'South Africa',
  SA: 'South Africa',
  ZA: 'South Africa',
  RSA: 'South Africa',
  BOTSWANA: 'Botswana',
  BOT: 'Botswana',
  BW: 'Botswana',
  BWA: 'Botswana',
  ZIMBABWE: 'Zimbabwe',
  ZW: 'Zimbabwe',
  ZWE: 'Zimbabwe',
  NAMIBIA: 'Namibia',
  NA: 'Namibia',
  LESOTHO: 'Lesotho',
  LS: 'Lesotho',
  ESWATINI: 'Eswatini',
  SWAZILAND: 'Eswatini',
  SZ: 'Eswatini',
  MOZAMBIQUE: 'Mozambique',
  MOZ: 'Mozambique',
  MZ: 'Mozambique',
  ZAMBIA: 'Zambia',
  ZAM: 'Zambia',
  ZM: 'Zambia',
  ZMB: 'Zambia',
  MALAWI: 'Malawi',
  MW: 'Malawi',
  MWI: 'Malawi',
  MAL: 'Malawi',
  CONGO: 'Congo',
  CON: 'Congo',
  CD: 'Congo',
  COD: 'Congo',
  DRC: 'Congo',
  TANZANIA: 'Tanzania',
  TAN: 'Tanzania',
  TZ: 'Tanzania',
  TZA: 'Tanzania',
};

const SA_PROVINCE_ALIASES: Record<string, SaProvince> = {
  KZN: 'KwaZulu-Natal',
  'KWAZULU/NATAL': 'KwaZulu-Natal',
  'KWAZULU NATAL': 'KwaZulu-Natal',
  'KWAZULU-NATAL': 'KwaZulu-Natal',
  GAUTENG: 'Gauteng',
  GP: 'Gauteng',
  'EASTERN CAPE': 'Eastern Cape',
  EC: 'Eastern Cape',
  'WESTERN CAPE': 'Western Cape',
  WC: 'Western Cape',
  LIMPOPO: 'Limpopo',
  LP: 'Limpopo',
  MPUMALANGA: 'Mpumalanga',
  MP: 'Mpumalanga',
  'NORTH WEST': 'North West',
  'NORTH-WEST': 'North West',
  NW: 'North West',
  FREESTATE: 'Free State',
  'FREE STATE': 'Free State',
  FS: 'Free State',
  'NORTHERN CAPE': 'Northern Cape',
  NC: 'Northern Cape',
};

/** Major SA places → province (normalized uppercase keys). */
const SA_CITY_TO_PROVINCE: Record<string, SaProvince> = {
  JOHANNESBURG: 'Gauteng',
  PRETORIA: 'Gauteng',
  TSHWANE: 'Gauteng',
  SOWETO: 'Gauteng',
  SANDTON: 'Gauteng',
  MIDRAND: 'Gauteng',
  ROODEPOORT: 'Gauteng',
  RANDBURG: 'Gauteng',
  CENTURION: 'Gauteng',
  BENONI: 'Gauteng',
  BOKSBURG: 'Gauteng',
  GERMISTON: 'Gauteng',
  KRUGERSDORP: 'Gauteng',
  VEREENIGING: 'Gauteng',
  VANDERBIJLPARK: 'Gauteng',
  ALBERTON: 'Gauteng',
  KEMPTON: 'Gauteng',
  'KEMPTON PARK': 'Gauteng',
  SPRINGS: 'Gauteng',
  'HATFIELD': 'Gauteng',
  ALEXANDRA: 'Gauteng',
  'CAPE TOWN': 'Western Cape',
  CAPETOWN: 'Western Cape',
  STELLENBOSCH: 'Western Cape',
  PAARL: 'Western Cape',
  SOMERSET: 'Western Cape',
  'SOMERSET WEST': 'Western Cape',
  GEORGE: 'Western Cape',
  WORCESTER: 'Western Cape',
  'BELLVILLE': 'Western Cape',
  DURBAN: 'KwaZulu-Natal',
  PIETERMARITZBURG: 'KwaZulu-Natal',
  PMB: 'KwaZulu-Natal',
  RICHARDS: 'KwaZulu-Natal',
  'RICHARDS BAY': 'KwaZulu-Natal',
  NEWCASTLE: 'KwaZulu-Natal',
  LADYSMITH: 'KwaZulu-Natal',
  PINETOWN: 'KwaZulu-Natal',
  UMLAZI: 'KwaZulu-Natal',
  BALLITO: 'KwaZulu-Natal',
  EMPANGENI: 'KwaZulu-Natal',
  VRYHEID: 'KwaZulu-Natal',
  GQEBERHA: 'Eastern Cape',
  'PORT ELIZABETH': 'Eastern Cape',
  PE: 'Eastern Cape',
  'EAST LONDON': 'Eastern Cape',
  MTHATHA: 'Eastern Cape',
  UMTATA: 'Eastern Cape',
  GRAHAMSTOWN: 'Eastern Cape',
  MAKHANDA: 'Eastern Cape',
  KING: 'Eastern Cape',
  'KING WILLIAMS TOWN': 'Eastern Cape',
  'KING WILLIAM\'S TOWN': 'Eastern Cape',
  ALICE: 'Eastern Cape',
  POLOKWANE: 'Limpopo',
  PIETERSBURG: 'Limpopo',
  TZANEEN: 'Limpopo',
  THOHOYANDOU: 'Limpopo',
  MOKOPANE: 'Limpopo',
  PHALABORWA: 'Limpopo',
  NELSPRUIT: 'Mpumalanga',
  MBOMBELA: 'Mpumalanga',
  WITBANK: 'Mpumalanga',
  EMALAHLENI: 'Mpumalanga',
  SECUNDA: 'Mpumalanga',
  MIDDELBURG: 'Mpumalanga',
  WHITE: 'Mpumalanga',
  'WHITE RIVER': 'Mpumalanga',
  ACORNHOEK: 'Mpumalanga',
  RUSTENBURG: 'North West',
  MAHIKENG: 'North West',
  MAFIKENG: 'North West',
  POTCHEFSTROOM: 'North West',
  KLERKSDORP: 'North West',
  BRITS: 'North West',
  LICHTENBURG: 'North West',
  BLOEMFONTEIN: 'Free State',
  WELKOM: 'Free State',
  BETHLEHEM: 'Free State',
  KROONSTAD: 'Free State',
  SASOLBURG: 'Free State',
  KIMBERLEY: 'Northern Cape',
  UPINGTON: 'Northern Cape',
  SPRINGBOK: 'Northern Cape',
  KATHU: 'Northern Cape',
  KURUMAN: 'Northern Cape',
};

type PostalRange = { min: number; max: number; province: SaProvince };

/** Approximate SA postal code ranges → province. */
const SA_POSTAL_RANGES: PostalRange[] = [
  { min: 1, max: 299, province: 'Gauteng' },
  { min: 300, max: 499, province: 'Limpopo' },
  { min: 500, max: 699, province: 'North West' },
  { min: 700, max: 999, province: 'Limpopo' },
  { min: 1000, max: 2199, province: 'Gauteng' },
  { min: 2200, max: 2499, province: 'Mpumalanga' },
  { min: 2500, max: 2899, province: 'North West' },
  { min: 2900, max: 4730, province: 'KwaZulu-Natal' },
  { min: 4731, max: 6499, province: 'Eastern Cape' },
  { min: 6500, max: 8299, province: 'Western Cape' },
  { min: 8300, max: 8999, province: 'Northern Cape' },
  { min: 9300, max: 9999, province: 'Free State' },
];

type BBox = { minLat: number; maxLat: number; minLng: number; maxLng: number };

const COUNTRY_BBOX: Record<AllowedCountry, BBox> = {
  'South Africa': { minLat: -35.0, maxLat: -22.0, minLng: 16.0, maxLng: 33.0 },
  Botswana: { minLat: -27.0, maxLat: -17.5, minLng: 19.5, maxLng: 29.5 },
  Zimbabwe: { minLat: -22.5, maxLat: -15.5, minLng: 25.0, maxLng: 33.5 },
  Namibia: { minLat: -29.0, maxLat: -16.9, minLng: 11.5, maxLng: 25.5 },
  Lesotho: { minLat: -30.7, maxLat: -28.5, minLng: 27.0, maxLng: 29.5 },
  Eswatini: { minLat: -27.4, maxLat: -25.7, minLng: 30.7, maxLng: 32.2 },
  Mozambique: { minLat: -26.9, maxLat: -10.4, minLng: 30.0, maxLng: 41.0 },
  Zambia: { minLat: -18.1, maxLat: -8.2, minLng: 21.9, maxLng: 33.7 },
  Malawi: { minLat: -17.2, maxLat: -9.3, minLng: 32.6, maxLng: 36.0 },
  Congo: { minLat: -13.5, maxLat: 5.5, minLng: 12.0, maxLng: 31.5 },
  Tanzania: { minLat: -11.8, maxLat: -0.9, minLng: 29.3, maxLng: 40.5 },
};

/** Rough SA province bounding boxes (approximate; used as last resort). */
const SA_PROVINCE_BBOX: Record<SaProvince, BBox> = {
  'Western Cape': { minLat: -35.0, maxLat: -30.0, minLng: 17.0, maxLng: 24.5 },
  'Eastern Cape': { minLat: -34.2, maxLat: -30.0, minLng: 22.5, maxLng: 30.0 },
  'Northern Cape': { minLat: -32.5, maxLat: -24.5, minLng: 16.3, maxLng: 25.5 },
  'Free State': { minLat: -30.7, maxLat: -26.5, minLng: 24.3, maxLng: 29.8 },
  'KwaZulu-Natal': { minLat: -31.2, maxLat: -26.7, minLng: 28.8, maxLng: 32.9 },
  'North West': { minLat: -28.2, maxLat: -24.5, minLng: 22.5, maxLng: 28.5 },
  Gauteng: { minLat: -26.8, maxLat: -25.1, minLng: 27.5, maxLng: 29.0 },
  Mpumalanga: { minLat: -27.5, maxLat: -22.5, minLng: 28.5, maxLng: 32.2 },
  Limpopo: { minLat: -25.5, maxLat: -22.1, minLng: 26.5, maxLng: 31.9 },
};

export const BOTSWANA_DISTRICTS = [
  'Central',
  'Ghanzi',
  'Kgalagadi',
  'Kgatleng',
  'Kweneng',
  'North-East',
  'North-West',
  'South-East',
  'Southern',
  'Gaborone',
  'Francistown',
  'Lobatse',
  'Selebi-Phikwe',
  'Jwaneng',
  'Sowa',
] as const;

const BOTSWANA_CITY_TO_DISTRICT: Record<string, string> = {
  GABORONE: 'Gaborone',
  'GABORONE WEST': 'Gaborone',
  FRANCISTOWN: 'Francistown',
  MAUN: 'North-West',
  LOBATSE: 'Lobatse',
  SEROWE: 'Central',
  PALAPYE: 'Central',
  JWANENG: 'Jwaneng',
  PILANE: 'Kgatleng',
  MOLEPOLOLE: 'Kweneng',
  KANYE: 'Southern',
  MAHALAPYE: 'Central',
};

const NAMIBIA_REGIONS = [
  'Erongo',
  'Hardap',
  '//Karas',
  'Kavango East',
  'Kavango West',
  'Khomas',
  'Kunene',
  'Ohangwena',
  'Omaheke',
  'Omusati',
  'Oshana',
  'Oshikoto',
  'Otjozondjupa',
  'Zambezi',
] as const;

const NAMIBIA_CITY_TO_REGION: Record<string, string> = {
  WINDHOEK: 'Khomas',
  WALVIS: 'Erongo',
  'WALVIS BAY': 'Erongo',
  SWAKOPMUND: 'Erongo',
  OSHAKATI: 'Oshana',
  RUNDU: 'Kavango East',
  OTJIWARONGO: 'Otjozondjupa',
};

const ZIMBABWE_PROVINCES = [
  'Bulawayo',
  'Harare',
  'Manicaland',
  'Mashonaland Central',
  'Mashonaland East',
  'Mashonaland West',
  'Masvingo',
  'Matabeleland North',
  'Matabeleland South',
  'Midlands',
] as const;

const ZIMBABWE_CITY_TO_PROVINCE: Record<string, string> = {
  HARARE: 'Harare',
  BULAWAYO: 'Bulawayo',
  MUTARE: 'Manicaland',
  GWERU: 'Midlands',
  MASVINGO: 'Masvingo',
};

type AddressParts = {
  street?: string;
  suburb?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

export type ResolvedAddressParts = {
  country: string;
  state: string;
  city: string;
  suburb: string;
  postalCode: string;
  street: string;
  lineParts: string[];
};

function normToken(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, ' ');
}

function inBBox(lat: number, lng: number, box: BBox): boolean {
  return lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng;
}

function filterPostalAddressParts(parts: string[]): string[] {
  return parts.filter((p) => {
    const t = p.trim();
    if (!t) return false;
    if (/^\d{4,8}$/.test(t)) return false;
    return true;
  });
}

function extractPostalFromText(text: string): string {
  const m = text.match(/\b(\d{4})\b/);
  return m?.[1] ?? '';
}

export function parseCountryAllowlist(raw: string | null | undefined): AllowedCountry | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const token = normToken(trimmed);
  return COUNTRY_BY_TOKEN[token] ?? null;
}

/** Strict: only allowlisted countries; unknown free text → null. */
export function normalizeMarkerCountryLabel(raw: string | null | undefined): string {
  return parseCountryAllowlist(raw) ?? UNMAPPED;
}

function matchSaProvinceAlias(raw: string): SaProvince | null {
  const token = normToken(raw);
  if (SA_PROVINCE_ALIASES[token]) return SA_PROVINCE_ALIASES[token];
  // Substring contains known province name
  for (const [alias, province] of Object.entries(SA_PROVINCE_ALIASES)) {
    if (alias.length >= 4 && token.includes(alias)) return province;
  }
  for (const province of SA_PROVINCES) {
    if (token === normToken(province)) return province;
  }
  return null;
}

function lookupPlaceMap(raw: string, map: Record<string, string>): string | null {
  const token = normToken(raw);
  if (!token) return null;
  if (map[token]) return map[token];
  for (const [key, value] of Object.entries(map)) {
    if (key.length >= 4 && (token.includes(key) || key.includes(token))) return value;
  }
  return null;
}

function provinceFromSaPostal(postal: string): SaProvince | null {
  const digits = postal.replace(/\D/g, '');
  if (digits.length < 4) return null;
  const n = parseInt(digits.slice(0, 4), 10);
  if (!Number.isFinite(n)) return null;
  for (const range of SA_POSTAL_RANGES) {
    if (n >= range.min && n <= range.max) return range.province;
  }
  return null;
}

function provinceFromSaBBox(lat: number, lng: number): SaProvince | null {
  // Prefer smallest matching area — test tighter boxes first (Gauteng)
  const order: SaProvince[] = [
    'Gauteng',
    'KwaZulu-Natal',
    'Western Cape',
    'Free State',
    'Mpumalanga',
    'Limpopo',
    'North West',
    'Eastern Cape',
    'Northern Cape',
  ];
  for (const p of order) {
    if (inBBox(lat, lng, SA_PROVINCE_BBOX[p])) return p;
  }
  return null;
}

function countryFromBBox(lat: number, lng: number): AllowedCountry | null {
  // Smaller countries first to avoid SA absorbing Lesotho/Eswatini
  const order: AllowedCountry[] = [
    'Lesotho',
    'Eswatini',
    'Malawi',
    'Botswana',
    'Zimbabwe',
    'Zambia',
    'Namibia',
    'Tanzania',
    'Congo',
    'Mozambique',
    'South Africa',
  ];
  for (const c of order) {
    if (inBBox(lat, lng, COUNTRY_BBOX[c])) return c;
  }
  return null;
}

function countryFromHaystack(haystack: string): AllowedCountry | null {
  const u = normToken(haystack);
  for (const [token, country] of Object.entries(COUNTRY_BY_TOKEN)) {
    if (token.length >= 3 && u.includes(token)) return country;
  }
  // Known cities implying country when country field wrong
  if (lookupPlaceMap(haystack, SA_CITY_TO_PROVINCE)) return 'South Africa';
  if (lookupPlaceMap(haystack, BOTSWANA_CITY_TO_DISTRICT)) return 'Botswana';
  if (lookupPlaceMap(haystack, NAMIBIA_CITY_TO_REGION)) return 'Namibia';
  if (lookupPlaceMap(haystack, ZIMBABWE_CITY_TO_PROVINCE)) return 'Zimbabwe';
  if (/\bLUSAKA\b/.test(u)) return 'Zambia';
  if (/\bLILONGWE\b|\bBLANTYRE\b/.test(u)) return 'Malawi';
  if (/\bMAPUTO\b/.test(u)) return 'Mozambique';
  if (/\bMASERU\b/.test(u)) return 'Lesotho';
  if (/\bMBABANE\b|\bMANZINI\b/.test(u)) return 'Eswatini';
  if (/\bDAR ES SALAAM\b|\bDAR-ES-SALAAM\b|\bDODOMA\b|\bARUSHA\b/.test(u)) return 'Tanzania';
  if (/\bKINSHASA\b|\bLUBUMBASHI\b/.test(u)) return 'Congo';
  return null;
}

export type GeoMarkerLike = {
  address?: unknown;
  latitude?: number | string | null;
  longitude?: number | string | null;
  position?: [number, number] | number[] | null;
  name?: string | null;
  country?: string | null;
};

function markerLatLng(marker: GeoMarkerLike): { lat: number; lng: number } | null {
  const lat = Number(marker.latitude ?? marker.position?.[0]);
  const lng = Number(marker.longitude ?? marker.position?.[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

/**
 * Resolve marker address whether stored as a formatted string or structured object.
 */
export function resolveMarkerAddressParts(marker: GeoMarkerLike): ResolvedAddressParts {
  const empty: ResolvedAddressParts = {
    country: '',
    state: '',
    city: '',
    suburb: '',
    postalCode: '',
    street: '',
    lineParts: [],
  };

  const raw = marker.address;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as AddressParts;
    const street = typeof o.street === 'string' ? o.street.trim() : '';
    const suburb = typeof o.suburb === 'string' ? o.suburb.trim() : '';
    const city = typeof o.city === 'string' ? o.city.trim() : '';
    const state = typeof o.state === 'string' ? o.state.trim() : '';
    const postalCode =
      typeof o.postalCode === 'string'
        ? o.postalCode.trim()
        : extractPostalFromText([street, suburb, city, state].join(' '));
    const country = typeof o.country === 'string' ? o.country.trim() : '';
    const lineParts = [street, suburb, city, state, postalCode, country].filter(Boolean);
    return { country, state, city, suburb, postalCode, street, lineParts };
  }

  const addr = typeof raw === 'string' ? raw.trim() : String(raw ?? '').trim();
  if (!addr || addr === '[object Object]') return empty;

  let parts = addr.split(',').map((p) => p.trim()).filter(Boolean);
  const postalCode = extractPostalFromText(addr);
  parts = filterPostalAddressParts(parts);
  const country = parts.length > 0 ? parts[parts.length - 1]! : '';
  const state = parts.length >= 2 ? parts[parts.length - 2]! : '';
  const city = parts.length >= 3 ? parts[parts.length - 3]! : '';
  const suburb = parts.length >= 4 ? parts[parts.length - 4]! : '';
  const street = parts.length >= 5 ? parts.slice(0, -4).join(', ') : parts[0] ?? '';
  return { country, state, city, suburb, postalCode, street, lineParts: parts };
}

export function getMarkerCountryKey(marker: GeoMarkerLike): string {
  const parts = resolveMarkerAddressParts(marker);
  const countryFromMarker =
    typeof marker.country === 'string' ? marker.country.trim() : '';
  const countryCandidate = parts.country || countryFromMarker;
  const direct = parseCountryAllowlist(countryCandidate);
  if (direct) return direct;

  const haystack = [countryCandidate, parts.state, parts.city, parts.suburb, marker.name ?? '']
    .filter(Boolean)
    .join(' ');
  const fromText = countryFromHaystack(haystack);
  if (fromText) return fromText;

  const ll = markerLatLng(marker);
  if (ll) {
    const fromGeo = countryFromBBox(ll.lat, ll.lng);
    if (fromGeo) return fromGeo;
  }

  return UNMAPPED;
}

function resolveSaProvince(marker: GeoMarkerLike, parts: ResolvedAddressParts): string {
  for (const candidate of [parts.state, parts.city, parts.suburb]) {
    if (!candidate) continue;
    const alias = matchSaProvinceAlias(candidate);
    if (alias) return alias;
  }

  for (const candidate of [parts.city, parts.suburb, parts.state]) {
    if (!candidate) continue;
    // Skip if candidate looks like a street (digits + street words)
    if (/^\d/.test(candidate) && /\b(STREET|ST|ROAD|RD|AVENUE|AVE|DRIVE|DR)\b/i.test(candidate)) {
      continue;
    }
    const fromCity = lookupPlaceMap(candidate, SA_CITY_TO_PROVINCE);
    if (fromCity) return fromCity;
  }

  const postal = parts.postalCode || extractPostalFromText(parts.street);
  if (postal) {
    const fromPostal = provinceFromSaPostal(postal);
    if (fromPostal) return fromPostal;
  }

  const ll = markerLatLng(marker);
  if (ll) {
    const fromBBox = provinceFromSaBBox(ll.lat, ll.lng);
    if (fromBBox) return fromBBox;
  }

  return UNMAPPED;
}

function resolveMappedAdmin(
  parts: ResolvedAddressParts,
  canonical: readonly string[],
  cityMap: Record<string, string>
): string {
  const canonSet = new Set(canonical.map((c) => normToken(c)));
  for (const candidate of [parts.state, parts.city, parts.suburb]) {
    if (!candidate) continue;
    const token = normToken(candidate);
    if (canonSet.has(token)) {
      const found = canonical.find((c) => normToken(c) === token);
      if (found) return found;
    }
    const mapped = lookupPlaceMap(candidate, cityMap);
    if (mapped) return mapped;
  }
  return UNMAPPED;
}

export function getMarkerProvinceKey(marker: GeoMarkerLike): string {
  const country = getMarkerCountryKey(marker);
  const parts = resolveMarkerAddressParts(marker);

  if (country === 'South Africa') return resolveSaProvince(marker, parts);
  if (country === 'Botswana') {
    return resolveMappedAdmin(parts, BOTSWANA_DISTRICTS, BOTSWANA_CITY_TO_DISTRICT);
  }
  if (country === 'Namibia') {
    return resolveMappedAdmin(parts, NAMIBIA_REGIONS, NAMIBIA_CITY_TO_REGION);
  }
  if (country === 'Zimbabwe') {
    return resolveMappedAdmin(parts, ZIMBABWE_PROVINCES, ZIMBABWE_CITY_TO_PROVINCE);
  }
  if (country === UNMAPPED) return UNMAPPED;

  // Other allowlisted countries: only accept state if it is not a street-like string
  const state = parts.state.trim();
  if (!state) return UNMAPPED;
  if (/^\d{4,8}$/.test(state)) return UNMAPPED;
  if (/^\d/.test(state) && /\b(STREET|ST|ROAD|RD|AVENUE|AVE)\b/i.test(state)) return UNMAPPED;
  // If state equals country name, unmapped
  if (parseCountryAllowlist(state)) return UNMAPPED;
  // Prefer city-map style: treat state as region label only if short-ish and no street keywords
  if (/\b(STREET|ROAD|AVENUE|DRIVE|LANE)\b/i.test(state)) return UNMAPPED;
  return state;
}

export function getMarkerRegionGroupKey(marker: GeoMarkerLike): string {
  const country = getMarkerCountryKey(marker);
  const province = getMarkerProvinceKey(marker);
  if (province !== UNMAPPED && country !== UNMAPPED) return `${province}, ${country}`;
  if (country !== UNMAPPED) return country;
  if (province !== UNMAPPED) return province;
  return UNMAPPED;
}

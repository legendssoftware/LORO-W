import type { LeadListItem } from '@/api/types/leads';
import type {
  CheckInStatusResponse,
  CreateCheckInPayload,
  CreateCheckOutPayload,
  MethodOfContact,
} from '@/api/types/visits';

function strOrEmpty(value: string | null | undefined): string {
  return value ?? '';
}

const DEFAULT_FALLBACK_LOCATION = '-34.6037,150.7794';

export function getDefaultLocation(): string {
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    return '';
  }
  return DEFAULT_FALLBACK_LOCATION;
}

/** Resolve check-in coordinates via geolocation with fallback. */
export async function resolveCheckInLocation(): Promise<string> {
  let location = getDefaultLocation();
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
      });
      location = `${pos.coords.latitude},${pos.coords.longitude}`;
    } catch {
      location = DEFAULT_FALLBACK_LOCATION;
    }
  }
  return location;
}

export async function buildCheckInPayload(
  methodOfContact: MethodOfContact,
  overrides?: Partial<CreateCheckInPayload>,
): Promise<CreateCheckInPayload> {
  const checkInLocation = await resolveCheckInLocation();
  return {
    checkInTime: new Date().toISOString(),
    checkInLocation,
    checkInPhoto: undefined,
    methodOfContact,
    ...(methodOfContact === 'Telephone' && { buildingType: 'other' }),
    ...overrides,
  };
}

export async function buildLeadCallCheckInPayload(
  lead: LeadListItem,
): Promise<CreateCheckInPayload> {
  return buildCheckInPayload('Telephone', {
    leadUid: lead.uid,
    contactFullName: lead.name,
    contactCellPhone: lead.phone,
    contactLandline: lead.secondaryPhoneNumber,
    contactEmail: lead.email,
    companyName: lead.companyName,
  });
}

/** Pre-fill end-visit form fields from a lead record. */
export function leadToEndVisitInitialForm(lead: LeadListItem): Partial<CreateCheckOutPayload> {
  return {
    contactFullName: strOrEmpty(lead.name),
    contactCellPhone: strOrEmpty(lead.phone),
    contactLandline: strOrEmpty(lead.secondaryPhoneNumber),
    contactEmail: strOrEmpty(lead.email),
    companyName: strOrEmpty(lead.companyName),
    methodOfContact: 'Telephone',
    buildingType: 'other',
    contactMade: true,
  };
}

export interface ActiveCallState {
  checkedIn: boolean;
  activeCheckInMethod: string | null;
  hasActiveCall: boolean;
  activeCallLeadUid: number | null;
}

/** Derive active call state from check-in status API response. */
export function parseActiveCallFromStatus(
  status: CheckInStatusResponse | undefined,
): ActiveCallState {
  const checkedIn = status?.checkedIn === true;
  const activeCheckInMethod =
    typeof status?.methodOfContact === 'string' ? status.methodOfContact : null;
  const hasActiveCall = checkedIn && isActiveCallMethod(activeCheckInMethod);
  const activeCallLeadUid =
    hasActiveCall && typeof status?.leadUid === 'number' ? status.leadUid : null;
  return { checkedIn, activeCheckInMethod, hasActiveCall, activeCallLeadUid };
}

/** True when an active check-in is a non-physical call (Telephone, Email, Whatsapp). */
export function isActiveCallMethod(method: string | null | undefined): boolean {
  if (!method) return false;
  const m = method.toLowerCase();
  return m === 'telephone' || m === 'email' || m === 'whatsapp';
}

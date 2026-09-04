/**
 * Types for organisation admin settings API responses (subset of server entities).
 */

export interface OrganisationAddress {
  street: string;
  suburb: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
}

export interface OrganisationProfile {
  uid: number;
  name: string;
  alias?: string | null;
  email: string;
  phone: string;
  website: string;
  logo: string;
  address: OrganisationAddress;
  ref: string;
  clerkOrgId?: string | null;
  /** GeneralStatus enum value (e.g. active, inactive) */
  status?: string;
  /** Relations returned by GET /org (join) — used to hydrate when /organisations/* misses Clerk vs ref. */
  settings?: OrganisationSettingsRecord | null;
  appearance?: OrganisationAppearanceRecord | null;
  hours?: OrganisationHoursRecord[] | null;
}

export interface GetOrganisationResponse {
  organisation: OrganisationProfile | null;
  message: string;
}

export interface OrganisationAppearanceRecord {
  uid: number;
  ref: string;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  errorColor?: string | null;
  successColor?: string | null;
  logoUrl?: string | null;
  logoAltText?: string | null;
  organisationUid: string;
}

export interface PatchOrganisationAppearanceBody {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  errorColor?: string;
  successColor?: string;
  logoUrl?: string;
  logoAltText?: string;
}

/** Subset of organisation_settings JSON + scalars (matches server entity). */
export interface OrganisationSettingsRecord {
  uid: number;
  organisationUid: string;
  contact?: {
    email?: string;
    phone?: { code: string; number: string };
    website?: string;
    address?: {
      street: string;
      suburb?: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
  } | null;
  regional?: {
    language?: string;
    timezone?: string;
    currency?: string;
    dateFormat?: string;
    timeFormat?: string;
  } | null;
  branding?: Record<string, unknown> | null;
  business?: Record<string, unknown> | null;
  notifications?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    whatsapp?: boolean;
  } | null;
  preferences?: {
    defaultView?: string;
    itemsPerPage?: number;
    theme?: 'light' | 'dark' | 'system';
    menuCollapsed?: boolean;
  } | null;
  sendTaskNotifications?: boolean;
  feedbackTokenExpiryDays?: number;
  taskReminders?: {
    createFollowUpTaskOnLeadCreate?: boolean;
    deadlineOffsetsMinutes?: number[];
    dailySummaryHour?: number;
    overdueSummaryHour?: number;
  } | null;
  calendarIntegrations?: {
    enabled?: boolean;
    allowedProviders?: ('google' | 'microsoft')[];
  } | null;
  geofenceDefaultRadius?: number;
  geofenceEnabledByDefault?: boolean;
  geofenceDefaultNotificationType?: string;
  geofenceMaxRadius?: number;
  geofenceMinRadius?: number;
  socialLinks?: Record<string, unknown> | null;
  performance?: Record<string, unknown> | null;
  callQuality?: {
    enabled?: boolean;
    dailyCallTarget?: number;
    productName?: string;
    dimensions?: Array<{
      id: string;
      label: string;
      type: 'boolean' | 'score' | 'text' | 'enum' | 'ratio';
      enumOptions?: string[];
      weight?: number;
      category?: 'discovery' | 'closing' | 'behaviour' | 'outcome';
      required?: boolean;
      affectsScore?: boolean;
    }>;
    coachingPrompt?: string;
    autoCreateLead?: boolean;
    reviewScoreThreshold?: number;
    scorecardVersion?: number;
  } | null;
}

export interface GetOrganisationSettingsResponse {
  settings: OrganisationSettingsRecord | null;
  message: string;
}

export type PatchOrganisationSettingsBody = Partial<OrganisationSettingsRecord>;

export interface DayScheduleForm {
  start: string;
  end: string;
  closed: boolean;
}

export interface OrganisationHoursWeeklySchedule {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

export interface OrganisationHoursRecord {
  uid: number;
  ref: string;
  openTime?: string | Date;
  closeTime?: string | Date;
  weeklySchedule: OrganisationHoursWeeklySchedule;
  schedule?: {
    monday: DayScheduleForm;
    tuesday: DayScheduleForm;
    wednesday: DayScheduleForm;
    thursday: DayScheduleForm;
    friday: DayScheduleForm;
    saturday: DayScheduleForm;
    sunday: DayScheduleForm;
  } | null;
  timezone?: string | null;
  holidayMode: boolean;
  holidayUntil?: string | Date | null;
  specialHours?: {
    date: string;
    openTime: string;
    closeTime: string;
    reason?: string;
  }[];
  organisationUid: string;
}

export type PatchOrganisationHoursBody = Partial<{
  openTime: string;
  closeTime: string;
  weeklySchedule: OrganisationHoursWeeklySchedule;
  schedule: OrganisationHoursRecord['schedule'];
  timezone: string;
  holidayMode: boolean;
  holidayUntil: string | null;
  specialHours: OrganisationHoursRecord['specialHours'];
}>;

export interface PatchOrganisationProfileBody {
  name?: string;
  alias?: string;
  email?: string;
  phone?: string;
  website?: string;
  logo?: string;
  address?: OrganisationAddress;
  /** GeneralStatus value */
  status?: string;
}

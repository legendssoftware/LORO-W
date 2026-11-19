'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { useSessionSync, getSessionSyncQueryKey } from '@/api/hooks/use-session-sync';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import {
  getOrganisation,
  patchOrganisation,
  getOrganisationAppearance,
  patchOrganisationAppearance,
  postOrganisationAppearance,
  getOrganisationSettings,
  patchOrganisationSettings,
  postOrganisationSettings,
  getOrganisationHoursDefault,
  patchOrganisationHoursDefault,
} from '@/api/endpoints/organisation';
import {
  getBranches,
  getBranchByRef,
  patchBranch,
  postCreateBranch,
} from '@/api/endpoints/branch';
import type {
  GetOrganisationSettingsResponse,
  OrganisationAppearanceRecord,
  OrganisationHoursRecord,
  OrganisationHoursWeeklySchedule,
  OrganisationSettingsRecord,
  PatchOrganisationSettingsBody,
} from '@/api/types/organisation';
import { getBranchDisplayLabel, type BranchListItem } from '@/api/types/branch';
import { useUsers } from '@/api/hooks/use-users';
import { WorkforceType } from '@/api/types/user';
import type { WeekdayKey } from './settings-types';
import {
  BRANCHES_LIST_QUERY_KEY,
  settingsBranchDetailKey,
  settingsOrgAppearanceKey,
  settingsOrgBranchesKey,
  settingsOrgHoursKey,
  settingsOrgProfileKey,
  settingsOrgSettingsKey,
} from '@/api/query-keys/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { LogoField } from '@/components/settings/logo-field';
import {
  BRANCH_STATUS_SELECT_OPTIONS,
  GEOFENCE_NOTIFICATION_SELECT_OPTIONS,
  ORG_STATUS_SELECT_OPTIONS,
  THEME_SELECT_OPTIONS,
  optionByValue,
} from '@/components/settings/select-options';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { appPageMainClass } from '@/lib/page-shell';
import toast from 'react-hot-toast';
import {
  Building2,
  Check,
  ChevronDown,
  ChevronsUpDown,
  Clock,
  Globe,
  HelpCircle,
  Palette,
  Plus,
  Trash2,
  User,
  CalendarDays,
  Megaphone,
  ImageIcon,
  PhoneCall,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { CalendarIntegrationsSection } from '@/components/settings/calendar-integrations-section';
import { OrganisationCalendarSettingsSection } from '@/components/settings/organisation-calendar-settings-section';
import { OrganisationNoticesSection } from '@/components/settings/organisation-notices-section';
import { OrganisationBannersSection } from '@/components/settings/organisation-banners-section';
import { CallQualitySettingsSection } from '@/components/settings/call-quality-settings-section';
import { PerformancePolicySettingsSection } from '@/components/settings/performance-policy-settings-section';
import { ApifyLeadJobsSection } from '@/components/settings/apify-lead-jobs-section';
import { canAccessOrgSettings, canManageWebhooks } from '@/lib/access';
import { WebhooksSection } from '@/components/settings/admin-integration-sections';
import { addressFieldPlaceholder, formPlaceholder } from '@/lib/form-placeholders';

const WEEKDAYS: { key: WeekdayKey }[] = [
  { key: 'monday' },
  { key: 'tuesday' },
  { key: 'wednesday' },
  { key: 'thursday' },
  { key: 'friday' },
  { key: 'saturday' },
  { key: 'sunday' },
];

const defaultWeekly: OrganisationHoursWeeklySchedule = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: true,
  sunday: false,
};

type HoursScheduleState = NonNullable<OrganisationHoursRecord['schedule']>;

function defaultHoursSchedule(): HoursScheduleState {
  return {
    monday: { start: '07:00', end: '16:30', closed: false },
    tuesday: { start: '07:00', end: '16:30', closed: false },
    wednesday: { start: '07:00', end: '16:30', closed: false },
    thursday: { start: '07:00', end: '16:30', closed: false },
    friday: { start: '07:00', end: '16:30', closed: false },
    saturday: { start: '07:00', end: '12:00', closed: false },
    sunday: { start: '07:00', end: '12:00', closed: true },
  };
}

function mergeHoursSchedule(
  s: OrganisationHoursRecord['schedule'] | null | undefined
): HoursScheduleState {
  const d = defaultHoursSchedule();
  if (!s) return d;
  return {
    monday: { ...d.monday, ...s.monday },
    tuesday: { ...d.tuesday, ...s.tuesday },
    wednesday: { ...d.wednesday, ...s.wednesday },
    thursday: { ...d.thursday, ...s.thursday },
    friday: { ...d.friday, ...s.friday },
    saturday: { ...d.saturday, ...s.saturday },
    sunday: { ...d.sunday, ...s.sunday },
  };
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

function mergeSettingObjects<T extends Record<string, unknown>>(
  base: T | null | undefined,
  patch: Partial<T>
): T {
  return { ...(base ?? {}), ...stripUndefined(patch as Record<string, unknown>) } as T;
}

function regionalFormStateFromSettings(s: OrganisationSettingsRecord) {
  const r = s.regional;
  const n = s.notifications;
  const p = s.preferences;
  const c = s.contact;
  const ph = c?.phone;
  const ca = c?.address;
  const b = s.branding as Record<string, string | undefined> | null | undefined;
  const bus = s.business as Record<string, string | undefined> | null | undefined;
  const soc = s.socialLinks as Record<string, string | undefined> | null | undefined;
  const perf = s.performance as Record<string, number | string | undefined> | null | undefined;
  return {
    language: r?.language ?? '',
    timezone: r?.timezone ?? '',
    currency: r?.currency ?? '',
    dateFormat: r?.dateFormat ?? '',
    timeFormat: r?.timeFormat ?? '',
    notifEmail: n?.email ?? true,
    notifSms: n?.sms ?? false,
    notifPush: n?.push ?? true,
    notifWhatsapp: n?.whatsapp ?? false,
    theme: p?.theme ?? 'system',
    defaultView: p?.defaultView ?? '',
    itemsPerPage: p?.itemsPerPage ?? 25,
    menuCollapsed: p?.menuCollapsed ?? false,
    chartLayout: p?.chartLayout ?? 'comfortable',
    showCookieBanner: p?.showCookieBanner ?? false,
    sendTaskNotifications: s.sendTaskNotifications ?? false,
    createFollowUpTaskOnLeadCreate:
      s.taskReminders?.createFollowUpTaskOnLeadCreate !== false,
    reminderOffset24h: (s.taskReminders?.deadlineOffsetsMinutes ?? [1440, 60, 15]).includes(
      1440
    ),
    reminderOffset1h: (s.taskReminders?.deadlineOffsetsMinutes ?? [1440, 60, 15]).includes(60),
    reminderOffset15m: (s.taskReminders?.deadlineOffsetsMinutes ?? [1440, 60, 15]).includes(
      15
    ),
    feedbackTokenExpiryDays: s.feedbackTokenExpiryDays ?? 30,
    geofenceDefaultRadius: s.geofenceDefaultRadius ?? 500,
    geofenceEnabledByDefault: s.geofenceEnabledByDefault ?? false,
    geofenceDefaultNotificationType: s.geofenceDefaultNotificationType ?? 'NOTIFY',
    geofenceMaxRadius: s.geofenceMaxRadius ?? 5000,
    geofenceMinRadius: s.geofenceMinRadius ?? 100,
    contactEmail: c?.email ?? '',
    contactWebsite: c?.website ?? '',
    contactPhoneCode: ph?.code ?? '',
    contactPhoneNumber: ph?.number ?? '',
    contactAddrStreet: ca?.street ?? '',
    contactAddrSuburb: ca?.suburb ?? '',
    contactAddrCity: ca?.city ?? '',
    contactAddrState: ca?.state ?? '',
    contactAddrCountry: ca?.country ?? '',
    contactAddrPostal: ca?.postalCode ?? '',
    brandingLogo: b?.logo ?? '',
    brandingLogoAlt: b?.logoAltText ?? '',
    brandingFavicon: b?.favicon ?? '',
    brandingPrimary: b?.primaryColor ?? '',
    brandingSecondary: b?.secondaryColor ?? '',
    brandingAccent: b?.accentColor ?? '',
    businessName: bus?.name ?? '',
    businessReg: bus?.registrationNumber ?? '',
    businessTaxId: bus?.taxId ?? '',
    businessIndustry: bus?.industry ?? '',
    businessSize: (bus?.size &&
    ['small', 'medium', 'large', 'enterprise'].includes(String(bus.size))
      ? bus.size
      : '') as '' | 'small' | 'medium' | 'large' | 'enterprise',
    socialFacebook: soc?.facebook ?? '',
    socialTwitter: soc?.twitter ?? '',
    socialInstagram: soc?.instagram ?? '',
    socialLinkedin: soc?.linkedin ?? '',
    socialYoutube: soc?.youtube ?? '',
    socialWebsite: soc?.website ?? '',
    perfDaily: perf?.dailyRevenueTarget != null ? String(perf.dailyRevenueTarget) : '',
    perfWeekly: perf?.weeklyRevenueTarget != null ? String(perf.weeklyRevenueTarget) : '',
    perfMonthly: perf?.monthlyRevenueTarget != null ? String(perf.monthlyRevenueTarget) : '',
    perfYearly: perf?.yearlyRevenueTarget != null ? String(perf.yearlyRevenueTarget) : '',
    perfCalcMethod: (perf?.targetCalculationMethod &&
    ['fixed', 'dynamic', 'historical'].includes(String(perf.targetCalculationMethod))
      ? perf.targetCalculationMethod
      : '') as '' | 'fixed' | 'dynamic' | 'historical',
    perfHistDays:
      perf?.historicalPeriodDays != null ? String(perf.historicalPeriodDays) : '',
    perfGrowthPct:
      perf?.growthTargetPercentage != null ? String(perf.growthTargetPercentage) : '',
  };
}

function formatTimeInZone(d: Date, timeZone: string): string {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = fmt.formatToParts(d);
    const h = parts.find((p) => p.type === 'hour')?.value ?? '00';
    const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
  } catch {
    return d.toISOString().slice(11, 16);
  }
}

function hoursToHHmm(
  val: string | Date | undefined | null,
  timeZone: string
): string {
  if (val == null) return '';
  if (typeof val === 'string') {
    if (/^\d{2}:\d{2}$/.test(val)) return val;
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) return formatTimeInZone(d, timeZone);
    return '';
  }
  return formatTimeInZone(val, timeZone);
}

type SpecialHourRow = {
  date: string;
  openTime: string;
  closeTime: string;
  reason: string;
};

function normalizeSpecialHours(
  list: OrganisationHoursRecord['specialHours'] | undefined
): SpecialHourRow[] {
  if (!list?.length) return [];
  return list.map((x) => ({
    date: x.date,
    openTime: x.openTime,
    closeTime: x.closeTime,
    reason: x.reason ?? '',
  }));
}

function holidayUntilToLocalInput(val: string | Date | null | undefined): string {
  if (val == null) return '';
  const d = typeof val === 'string' ? new Date(val) : val;
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 py-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-start">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

type SettingsTab = 'profile' | 'appearance' | 'regional' | 'hours' | 'branches' | 'calendar' | 'scrapping' | 'notices' | 'banners' | 'call-quality' | 'performance-policy' | 'webhooks';

function addressPostalCode(addr: BranchListItem['address']): string {
  if (!addr) return '';
  const a = addr as NonNullable<BranchListItem['address']> & {
    postal_code?: string;
  };
  const raw = a.postalCode ?? a.postal_code;
  return typeof raw === 'string' ? raw : '';
}

/** Lowercase/trim for display (avoids all-caps legacy data; does not change postal shape). */
function formatAddressForDisplay(s: string | null | undefined): string {
  if (s == null) return '';
  return s.trim().toLowerCase();
}

function branchListItemToForm(b: BranchListItem) {
  return {
    name: b.name ?? '',
    alias: (b.alias as string) ?? '',
    email: b.email ?? '',
    phone: b.phone ?? '',
    contactPerson: b.contactPerson ?? '',
    website: b.website ?? '',
    status: (b.status as string) ?? 'active',
    country: b.country ?? 'SA',
    floorSizeSqm:
      b.floorSizeSqm != null && Number.isFinite(Number(b.floorSizeSqm))
        ? String(b.floorSizeSqm)
        : '',
    street: formatAddressForDisplay(b.address?.street),
    suburb: formatAddressForDisplay(b.address?.suburb),
    city: formatAddressForDisplay(b.address?.city),
    state: formatAddressForDisplay(b.address?.state),
    addrCountry: formatAddressForDisplay(b.address?.country),
    postalCode: addressPostalCode(b.address).trim(),
    primaryInternalSalesUserUid:
      b.primaryInternalSalesUserUid != null && b.primaryInternalSalesUserUid > 0
        ? String(b.primaryInternalSalesUserUid)
        : '',
  };
}

function parseOptionalFloorSizeSqm(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

function normalizeBranchAddressForSave(f: {
  street: string;
  suburb: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}) {
  return {
    street: f.street.trim().toLowerCase(),
    suburb: f.suburb.trim().toLowerCase(),
    city: f.city.trim().toLowerCase(),
    state: f.state.trim().toLowerCase(),
    country: f.country.trim().toLowerCase(),
    postalCode: f.postalCode.trim(),
  };
}

const PANEL_CLASS = 'rounded border border-border bg-card';

/** Add-branch dialog: smaller gray placeholders; keep input text at text-sm on md+ */
const CREATE_BRANCH_INPUT_CLASS =
  'border-border bg-background text-sm md:text-sm placeholder:text-xs placeholder:italic placeholder:text-muted-foreground';

export function SettingsContent() {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  const client = useApiClient();
  const queryClient = useQueryClient();
  const { backendUserData } = useSessionSync();
  const { isTokenReady } = useTokenReady();
  const canManageOrgSettings = canAccessOrgSettings(backendUserData?.accessLevel);
  const orgRef = backendUserData?.organisationRef ?? '';
  const orgEnabled = canManageOrgSettings && Boolean(orgRef) && isTokenReady;
  const enabled = orgEnabled;
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
  const [addBranchOpen, setAddBranchOpen] = useState(false);
  const [createBranchForm, setCreateBranchForm] = useState({
    name: '',
    alias: '',
    email: '',
    phone: '',
    contactPerson: '',
    website: 'https://',
    ref: '',
    street: '',
    suburb: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    floorSizeSqm: '',
  });

  const profileQuery = useQuery({
    queryKey: settingsOrgProfileKey(orgRef),
    queryFn: async () => getOrganisation(client, orgRef),
    enabled,
  });

  const appearanceQuery = useQuery({
    queryKey: settingsOrgAppearanceKey(orgRef),
    queryFn: async () => getOrganisationAppearance(client, orgRef),
    enabled,
  });

  const settingsQuery = useQuery({
    queryKey: settingsOrgSettingsKey(orgRef),
    queryFn: async () => getOrganisationSettings(client, orgRef),
    enabled,
  });

  const hoursQuery = useQuery({
    queryKey: settingsOrgHoursKey(orgRef),
    queryFn: async () => getOrganisationHoursDefault(client, orgRef),
    enabled,
  });

  const branchesQuery = useQuery({
    queryKey: settingsOrgBranchesKey(orgRef),
    queryFn: async () => getBranches(client),
    enabled,
  });

  /** When /organisations/* 404 or returns empty but GET /org included relations (Clerk id vs ref). */
  useEffect(() => {
    if (!enabled || !orgRef) return;
    const org = profileQuery.data?.organisation;
    if (!org || !profileQuery.isSuccess) return;

    if (
      org.settings &&
      settingsQuery.isFetched &&
      !settingsQuery.data?.settings
    ) {
      queryClient.setQueryData<GetOrganisationSettingsResponse>(
        settingsOrgSettingsKey(orgRef),
        {
          settings: org.settings,
          message: 'Settings retrieved successfully',
        }
      );
    }

    if (
      org.appearance &&
      appearanceQuery.isFetched &&
      appearanceQuery.data == null
    ) {
      queryClient.setQueryData<OrganisationAppearanceRecord>(
        settingsOrgAppearanceKey(orgRef),
        org.appearance
      );
    }

    const hourRows = org.hours;
    if (
      Array.isArray(hourRows) &&
      hourRows.length > 0 &&
      hoursQuery.isFetched &&
      hoursQuery.data == null
    ) {
      const row = [...hourRows].sort((a, b) => (a.uid ?? 0) - (b.uid ?? 0))[0];
      if (row?.ref) {
        const weekly: OrganisationHoursWeeklySchedule = {
          ...defaultWeekly,
          ...row.weeklySchedule,
        };
        const hydrated: OrganisationHoursRecord = {
          ...row,
          weeklySchedule: weekly,
          holidayMode: row.holidayMode ?? false,
          organisationUid: row.organisationUid ?? orgRef,
        };
        queryClient.setQueryData<OrganisationHoursRecord | null>(
          settingsOrgHoursKey(orgRef),
          hydrated
        );
      }
    }
  }, [
    enabled,
    orgRef,
    queryClient,
    profileQuery.data,
    profileQuery.isSuccess,
    settingsQuery.data,
    settingsQuery.isFetched,
    appearanceQuery.data,
    appearanceQuery.isFetched,
    hoursQuery.data,
    hoursQuery.isFetched,
  ]);

  const invalidateProfile = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: settingsOrgProfileKey(orgRef) });
    queryClient.invalidateQueries({ queryKey: getSessionSyncQueryKey() });
  }, [queryClient, orgRef]);

  const [profileForm, setProfileForm] = useState({
    name: '',
    alias: '',
    email: '',
    phone: '',
    website: '',
    logo: '',
    status: 'active' as string,
    street: '',
    suburb: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
  });

  useEffect(() => {
    const o = profileQuery.data?.organisation;
    if (!o) return;
    const sessionOrgName = backendUserData?.organisation?.name?.trim();
    setProfileForm({
      name: o.name?.trim() || sessionOrgName || '',
      alias: (o.alias as string) ?? '',
      email: o.email ?? '',
      phone: o.phone ?? '',
      website: o.website ?? '',
      logo: o.logo ?? '',
      status: (o.status as string) ?? 'active',
      street: o.address?.street ?? '',
      suburb: o.address?.suburb ?? '',
      city: o.address?.city ?? '',
      state: o.address?.state ?? '',
      country: o.address?.country ?? '',
      postalCode: o.address?.postalCode ?? '',
    });
  }, [profileQuery.data?.organisation, backendUserData?.organisation?.name]);

  const patchProfileMut = useMutation({
    mutationFn: async () => {
      if (!profileQuery.data?.organisation) throw new Error('No organisation loaded');
      return patchOrganisation(client, orgRef, {
        name: profileForm.name,
        alias: profileForm.alias || undefined,
        email: profileForm.email,
        phone: profileForm.phone,
        website: profileForm.website,
        logo: profileForm.logo,
        status: profileForm.status || undefined,
        address: {
          street: profileForm.street,
          suburb: profileForm.suburb,
          city: profileForm.city,
          state: profileForm.state,
          country: profileForm.country,
          postalCode: profileForm.postalCode,
        },
      });
    },
    onSuccess: () => {
      toast.success('Organisation profile saved');
      invalidateProfile();
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to save'),
  });

  const [appearanceForm, setAppearanceForm] = useState({
    primaryColor: '#444CE7',
    secondaryColor: '',
    accentColor: '',
    errorColor: '',
    successColor: '',
    logoUrl: '',
    logoAltText: '',
  });

  useEffect(() => {
    const a = appearanceQuery.data;
    if (!a) return;
    setAppearanceForm({
      primaryColor: a.primaryColor ?? '#444CE7',
      secondaryColor: a.secondaryColor ?? '',
      accentColor: a.accentColor ?? '',
      errorColor: a.errorColor ?? '',
      successColor: a.successColor ?? '',
      logoUrl: a.logoUrl ?? '',
      logoAltText: a.logoAltText ?? '',
    });
  }, [appearanceQuery.data]);

  const saveAppearanceMut = useMutation({
    mutationFn: async () => {
      const body = {
        primaryColor: appearanceForm.primaryColor || undefined,
        secondaryColor: appearanceForm.secondaryColor || undefined,
        accentColor: appearanceForm.accentColor || undefined,
        errorColor: appearanceForm.errorColor || undefined,
        successColor: appearanceForm.successColor || undefined,
        logoUrl: appearanceForm.logoUrl || undefined,
        logoAltText: appearanceForm.logoAltText || undefined,
      };
      if (!appearanceQuery.data) {
        return postOrganisationAppearance(client, orgRef, {
          ...body,
          primaryColor: body.primaryColor ?? '#444CE7',
        });
      }
      return patchOrganisationAppearance(client, orgRef, body);
    },
    onSuccess: () => {
      toast.success('Appearance saved');
      queryClient.invalidateQueries({ queryKey: settingsOrgAppearanceKey(orgRef) });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to save'),
  });

  const [regionalForm, setRegionalForm] = useState({
    language: '',
    timezone: '',
    currency: '',
    dateFormat: '',
    timeFormat: '',
    notifEmail: true,
    notifSms: false,
    notifPush: true,
    notifWhatsapp: false,
    theme: 'system' as 'light' | 'dark' | 'system',
    defaultView: '',
    itemsPerPage: 25,
    menuCollapsed: false,
    chartLayout: 'comfortable' as 'compact' | 'comfortable',
    showCookieBanner: false,
    sendTaskNotifications: false,
    createFollowUpTaskOnLeadCreate: true,
    reminderOffset24h: true,
    reminderOffset1h: true,
    reminderOffset15m: true,
    feedbackTokenExpiryDays: 30,
    geofenceDefaultRadius: 500,
    geofenceEnabledByDefault: false,
    geofenceDefaultNotificationType: 'NOTIFY',
    geofenceMaxRadius: 5000,
    geofenceMinRadius: 100,
    contactEmail: '',
    contactWebsite: '',
    contactPhoneCode: '',
    contactPhoneNumber: '',
    contactAddrStreet: '',
    contactAddrSuburb: '',
    contactAddrCity: '',
    contactAddrState: '',
    contactAddrCountry: '',
    contactAddrPostal: '',
    brandingLogo: '',
    brandingLogoAlt: '',
    brandingFavicon: '',
    brandingPrimary: '',
    brandingSecondary: '',
    brandingAccent: '',
    businessName: '',
    businessReg: '',
    businessTaxId: '',
    businessIndustry: '',
    businessSize: '' as '' | 'small' | 'medium' | 'large' | 'enterprise',
    socialFacebook: '',
    socialTwitter: '',
    socialInstagram: '',
    socialLinkedin: '',
    socialYoutube: '',
    socialWebsite: '',
    perfDaily: '',
    perfWeekly: '',
    perfMonthly: '',
    perfYearly: '',
    perfCalcMethod: '' as '' | 'fixed' | 'dynamic' | 'historical',
    perfHistDays: '',
    perfGrowthPct: '',
  });

  useEffect(() => {
    const s = settingsQuery.data?.settings;
    if (!s) return;
    setRegionalForm(regionalFormStateFromSettings(s));
  }, [settingsQuery.data?.settings]);

  const buildSettingsPayload = useCallback((): PatchOrganisationSettingsBody => {
    const ex = settingsQuery.data?.settings;
    const regional = mergeSettingObjects(ex?.regional as Record<string, unknown>, {
      language: regionalForm.language.trim() || undefined,
      timezone: regionalForm.timezone.trim() || undefined,
      currency: regionalForm.currency.trim() || undefined,
      dateFormat: regionalForm.dateFormat.trim() || undefined,
      timeFormat: regionalForm.timeFormat.trim() || undefined,
    } as Record<string, unknown>);
    const notifications = mergeSettingObjects(
      ex?.notifications as Record<string, unknown>,
      {
        email: regionalForm.notifEmail,
        sms: regionalForm.notifSms,
        push: regionalForm.notifPush,
        whatsapp: regionalForm.notifWhatsapp,
      }
    );
    const preferences = mergeSettingObjects(
      ex?.preferences as Record<string, unknown>,
      {
        theme: regionalForm.theme,
        defaultView: regionalForm.defaultView.trim() || undefined,
        itemsPerPage: regionalForm.itemsPerPage,
        menuCollapsed: regionalForm.menuCollapsed,
        chartLayout: regionalForm.chartLayout,
        showCookieBanner: regionalForm.showCookieBanner,
      }
    );

    const addr = mergeSettingObjects(ex?.contact?.address as Record<string, unknown>, {
      street: regionalForm.contactAddrStreet.trim() || undefined,
      suburb: regionalForm.contactAddrSuburb.trim() || undefined,
      city: regionalForm.contactAddrCity.trim() || undefined,
      state: regionalForm.contactAddrState.trim() || undefined,
      country: regionalForm.contactAddrCountry.trim() || undefined,
      postalCode: regionalForm.contactAddrPostal.trim() || undefined,
    });
    const phone =
      regionalForm.contactPhoneCode.trim() || regionalForm.contactPhoneNumber.trim()
        ? {
            code: regionalForm.contactPhoneCode.trim(),
            number: regionalForm.contactPhoneNumber.trim(),
          }
        : undefined;
    const contact = mergeSettingObjects(ex?.contact as Record<string, unknown>, {
      email: regionalForm.contactEmail.trim() || undefined,
      website: regionalForm.contactWebsite.trim() || undefined,
      ...(phone ? { phone } : {}),
      address: addr,
    });

    const branding = mergeSettingObjects(ex?.branding as Record<string, unknown>, {
      logo: regionalForm.brandingLogo.trim() || undefined,
      logoAltText: regionalForm.brandingLogoAlt.trim() || undefined,
      favicon: regionalForm.brandingFavicon.trim() || undefined,
      primaryColor: regionalForm.brandingPrimary.trim() || undefined,
      secondaryColor: regionalForm.brandingSecondary.trim() || undefined,
      accentColor: regionalForm.brandingAccent.trim() || undefined,
    });

    const business = mergeSettingObjects(ex?.business as Record<string, unknown>, {
      name: regionalForm.businessName.trim() || undefined,
      registrationNumber: regionalForm.businessReg.trim() || undefined,
      taxId: regionalForm.businessTaxId.trim() || undefined,
      industry: regionalForm.businessIndustry.trim() || undefined,
      ...(regionalForm.businessSize ? { size: regionalForm.businessSize } : {}),
    });

    const socialLinks = mergeSettingObjects(
      ex?.socialLinks as Record<string, unknown>,
      stripUndefined({
        facebook: regionalForm.socialFacebook.trim() || undefined,
        twitter: regionalForm.socialTwitter.trim() || undefined,
        instagram: regionalForm.socialInstagram.trim() || undefined,
        linkedin: regionalForm.socialLinkedin.trim() || undefined,
        youtube: regionalForm.socialYoutube.trim() || undefined,
        website: regionalForm.socialWebsite.trim() || undefined,
      })
    );

    const perfPatch: Record<string, unknown> = {};
    if (regionalForm.perfDaily.trim() !== '')
      perfPatch.dailyRevenueTarget = Number(regionalForm.perfDaily);
    if (regionalForm.perfWeekly.trim() !== '')
      perfPatch.weeklyRevenueTarget = Number(regionalForm.perfWeekly);
    if (regionalForm.perfMonthly.trim() !== '')
      perfPatch.monthlyRevenueTarget = Number(regionalForm.perfMonthly);
    if (regionalForm.perfYearly.trim() !== '')
      perfPatch.yearlyRevenueTarget = Number(regionalForm.perfYearly);
    if (regionalForm.perfCalcMethod)
      perfPatch.targetCalculationMethod = regionalForm.perfCalcMethod;
    if (regionalForm.perfHistDays.trim() !== '')
      perfPatch.historicalPeriodDays = Number(regionalForm.perfHistDays);
    if (regionalForm.perfGrowthPct.trim() !== '')
      perfPatch.growthTargetPercentage = Number(regionalForm.perfGrowthPct);

    const performance = mergeSettingObjects(
      ex?.performance as Record<string, unknown>,
      perfPatch
    );

    return {
      regional,
      notifications,
      preferences,
      contact: contact as PatchOrganisationSettingsBody['contact'],
      branding,
      business,
      socialLinks,
      performance,
      sendTaskNotifications: regionalForm.sendTaskNotifications,
      taskReminders: mergeSettingObjects(
        ex?.taskReminders as Record<string, unknown>,
        {
          createFollowUpTaskOnLeadCreate: regionalForm.createFollowUpTaskOnLeadCreate,
          deadlineOffsetsMinutes: [
            ...(regionalForm.reminderOffset24h ? [1440] : []),
            ...(regionalForm.reminderOffset1h ? [60] : []),
            ...(regionalForm.reminderOffset15m ? [15] : []),
          ],
        }
      ) as PatchOrganisationSettingsBody['taskReminders'],
      feedbackTokenExpiryDays: regionalForm.feedbackTokenExpiryDays,
      geofenceDefaultRadius: regionalForm.geofenceDefaultRadius,
      geofenceEnabledByDefault: regionalForm.geofenceEnabledByDefault,
      geofenceDefaultNotificationType: regionalForm.geofenceDefaultNotificationType,
      geofenceMaxRadius: regionalForm.geofenceMaxRadius,
      geofenceMinRadius: regionalForm.geofenceMinRadius,
    };
  }, [regionalForm, settingsQuery.data?.settings]);

  const saveSettingsMut = useMutation({
    mutationFn: async () => {
      const body = buildSettingsPayload();
      if (!settingsQuery.data?.settings) {
        return postOrganisationSettings(client, orgRef, body);
      }
      return patchOrganisationSettings(client, orgRef, body);
    },
    onSuccess: (res) => {
      if (!res.settings && res.message?.toLowerCase().includes('not found')) {
        toast.error(res.message || 'Could not save settings');
        return;
      }
      toast.success('Settings saved');
      queryClient.invalidateQueries({ queryKey: settingsOrgSettingsKey(orgRef) });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to save'),
  });

  const [hoursForm, setHoursForm] = useState({
    openTime: '07:00',
    closeTime: '16:30',
    timezone: 'Africa/Johannesburg',
    holidayMode: false,
    holidayUntil: '',
    weekly: { ...defaultWeekly } as OrganisationHoursWeeklySchedule,
    schedule: defaultHoursSchedule(),
    specialHours: [] as SpecialHourRow[],
  });

  useEffect(() => {
    const h = hoursQuery.data;
    if (!h) return;
    const tz = h.timezone ?? 'Africa/Johannesburg';
    setHoursForm({
      openTime: hoursToHHmm(h.openTime, tz) || '07:00',
      closeTime: hoursToHHmm(h.closeTime, tz) || '16:30',
      timezone: tz,
      holidayMode: h.holidayMode ?? false,
      holidayUntil: holidayUntilToLocalInput(h.holidayUntil),
      weekly: { ...defaultWeekly, ...h.weeklySchedule },
      schedule: mergeHoursSchedule(h.schedule),
      specialHours: normalizeSpecialHours(h.specialHours),
    });
  }, [hoursQuery.data]);

  const saveHoursMut = useMutation({
    mutationFn: async () =>
      patchOrganisationHoursDefault(client, orgRef, {
        openTime: hoursForm.openTime,
        closeTime: hoursForm.closeTime,
        timezone: hoursForm.timezone,
        holidayMode: hoursForm.holidayMode,
        holidayUntil: hoursForm.holidayUntil
          ? new Date(hoursForm.holidayUntil).toISOString()
          : null,
        weeklySchedule: hoursForm.weekly,
        schedule: hoursForm.schedule,
        specialHours: hoursForm.specialHours
          .filter((row) => row.date.trim() !== '')
          .map((row) => ({
            date: row.date,
            openTime: row.openTime,
            closeTime: row.closeTime,
            ...(row.reason.trim() ? { reason: row.reason.trim() } : {}),
          })),
      }),
    onSuccess: () => {
      toast.success('Hours saved');
      queryClient.invalidateQueries({ queryKey: settingsOrgHoursKey(orgRef) });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to save'),
  });

  const branches = branchesQuery.data?.branches ?? [];
  const [branchRef, setBranchRef] = useState<string>('');
  const [branchForm, setBranchForm] = useState({
    name: '',
    alias: '',
    email: '',
    phone: '',
    contactPerson: '',
    website: '',
    status: 'active',
    country: 'SA',
    street: '',
    suburb: '',
    city: '',
    state: '',
    addrCountry: '',
    postalCode: '',
    floorSizeSqm: '',
    primaryInternalSalesUserUid: '',
  });
  const [branchFormDirty, setBranchFormDirty] = useState(false);

  const setBranchFormUser: typeof setBranchForm = (updater) => {
    setBranchFormDirty(true);
    setBranchForm(updater);
  };

  const branchDetailQuery = useQuery({
    queryKey: settingsBranchDetailKey(orgRef, branchRef),
    queryFn: () => getBranchByRef(client, branchRef),
    enabled: enabled && activeTab === 'branches' && Boolean(branchRef),
  });

  const selectedBranchUid =
    branchDetailQuery.data?.branch?.ref === branchRef
      ? branchDetailQuery.data.branch.uid
      : branches.find((branch) => branch.ref === branchRef)?.uid;
  const branchStaffQuery = useUsers({
    enabled: enabled && activeTab === 'branches' && selectedBranchUid != null,
    branchId: selectedBranchUid,
    limit: 100,
  });
  const internalSalesAtBranch = (branchStaffQuery.data ?? []).filter(
    (user) => user.workforceType === WorkforceType.INTERNAL_SALES,
  );

  useEffect(() => {
    const first = branches.find((b) => b.ref)?.ref ?? '';
    if (first && !branchRef) setBranchRef(first);
  }, [branches, branchRef]);

  useEffect(() => {
    setBranchFormDirty(false);
  }, [branchRef]);

  useEffect(() => {
    if (activeTab !== 'branches' || !branchRef) return;
    if (branchFormDirty) return;

    const detail = branchDetailQuery.data?.branch;
    if (detail?.ref === branchRef) {
      setBranchForm(branchListItemToForm(detail));
      return;
    }

    if (branchDetailQuery.isFetching) {
      const fromList = branches.find((x) => x.ref === branchRef) as
        | BranchListItem
        | undefined;
      if (fromList?.ref) {
        setBranchForm(branchListItemToForm(fromList));
      }
      return;
    }

    const fromList = branches.find((x) => x.ref === branchRef) as
      | BranchListItem
      | undefined;
    if (fromList?.ref) {
      setBranchForm(branchListItemToForm(fromList));
    }
  }, [
    activeTab,
    branchRef,
    branches,
    branchFormDirty,
    branchDetailQuery.data?.branch,
    branchDetailQuery.isFetching,
  ]);

  const saveBranchMut = useMutation({
    mutationFn: async () => {
      const address = normalizeBranchAddressForSave({
        street: branchForm.street,
        suburb: branchForm.suburb,
        city: branchForm.city,
        state: branchForm.state,
        country: branchForm.addrCountry,
        postalCode: branchForm.postalCode,
      });
      return patchBranch(client, branchRef, {
        name: branchForm.name,
        alias: branchForm.alias || undefined,
        email: branchForm.email,
        phone: branchForm.phone,
        contactPerson: branchForm.contactPerson,
        website: branchForm.website,
        status: branchForm.status,
        country: branchForm.country.trim() || 'SA',
        floorSizeSqm: parseOptionalFloorSizeSqm(branchForm.floorSizeSqm),
        primaryInternalSalesUserUid: branchForm.primaryInternalSalesUserUid
          ? Number(branchForm.primaryInternalSalesUserUid)
          : null,
        address,
      });
    },
    onSuccess: (res) => {
      const m = (res?.message ?? '').toLowerCase();
      if (
        m &&
        (m.includes('not found') ||
          m.includes('access denied') ||
          m.includes('organization id is required') ||
          m.includes('exception') ||
          m.includes('validation') ||
          m.includes('must be') ||
          m.includes('postal code'))
      ) {
        toast.error(res?.message || 'Could not save branch');
        return;
      }
      setBranchFormDirty(false);
      setBranchForm((s) => {
        const a = normalizeBranchAddressForSave({
          street: s.street,
          suburb: s.suburb,
          city: s.city,
          state: s.state,
          country: s.addrCountry,
          postalCode: s.postalCode,
        });
        return {
          ...s,
          street: a.street,
          suburb: a.suburb,
          city: a.city,
          state: a.state,
          addrCountry: a.country,
          postalCode: a.postalCode,
        };
      });
      toast.success('Branch saved');
      queryClient.invalidateQueries({ queryKey: settingsOrgBranchesKey(orgRef) });
      queryClient.invalidateQueries({ queryKey: BRANCHES_LIST_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: settingsBranchDetailKey(orgRef, branchRef),
      });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to save'),
  });

  const createBranchMut = useMutation({
    mutationFn: async () => {
      const ref =
        createBranchForm.ref.trim() ||
        (typeof crypto !== 'undefined' ? crypto.randomUUID() : '');
      if (!ref) throw new Error('Branch reference is required');
      const address = normalizeBranchAddressForSave({
        street: createBranchForm.street,
        suburb: createBranchForm.suburb,
        city: createBranchForm.city,
        state: createBranchForm.state,
        country: createBranchForm.country,
        postalCode: createBranchForm.postalCode,
      });
      const res = await postCreateBranch(client, {
        name: createBranchForm.name.trim(),
        email: createBranchForm.email.trim(),
        phone: createBranchForm.phone.trim(),
        website: createBranchForm.website.trim(),
        contactPerson: createBranchForm.contactPerson.trim(),
        ref,
        ...(createBranchForm.alias.trim()
          ? { alias: createBranchForm.alias.trim() }
          : {}),
        ...(parseOptionalFloorSizeSqm(createBranchForm.floorSizeSqm) != null
          ? {
              floorSizeSqm: parseOptionalFloorSizeSqm(
                createBranchForm.floorSizeSqm,
              )!,
            }
          : {}),
        address,
      });
      return { ...res, ref };
    },
    onSuccess: (data) => {
      const m = (data?.message ?? '').toLowerCase();
      if (
        m &&
        (m.includes('not found') ||
          m.includes('access denied') ||
          m.includes('organization id is required') ||
          m.includes('exception') ||
          m.includes('validation') ||
          m.includes('must be') ||
          m.includes('postal code') ||
          m.includes('already exists') ||
          m.includes('unique') ||
          m.includes('update values are not defined') ||
          m.includes('updatevaluesmissing'))
      ) {
        toast.error(data?.message || 'Could not create branch');
        return;
      }
      toast.success('Branch created');
      setAddBranchOpen(false);
      setBranchRef(data.ref);
      queryClient.invalidateQueries({ queryKey: settingsOrgBranchesKey(orgRef) });
      queryClient.invalidateQueries({ queryKey: BRANCHES_LIST_QUERY_KEY });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to create branch'),
  });

  const openAddBranchDialog = useCallback(() => {
    setCreateBranchForm({
      name: '',
      alias: '',
      email: '',
      phone: '',
      contactPerson: '',
      website: 'https://',
      ref: typeof crypto !== 'undefined' ? crypto.randomUUID() : '',
      street: '',
      suburb: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      floorSizeSqm: '',
    });
    setAddBranchOpen(true);
  }, []);

  const resetProfile = useCallback(() => {
    const o = profileQuery.data?.organisation;
    if (!o) return;
    const sessionOrgName = backendUserData?.organisation?.name?.trim();
    setProfileForm({
      name: o.name?.trim() || sessionOrgName || '',
      alias: (o.alias as string) ?? '',
      email: o.email ?? '',
      phone: o.phone ?? '',
      website: o.website ?? '',
      logo: o.logo ?? '',
      status: (o.status as string) ?? 'active',
      street: o.address?.street ?? '',
      suburb: o.address?.suburb ?? '',
      city: o.address?.city ?? '',
      state: o.address?.state ?? '',
      country: o.address?.country ?? '',
      postalCode: o.address?.postalCode ?? '',
    });
  }, [profileQuery.data?.organisation, backendUserData?.organisation?.name]);

  const resetAppearance = useCallback(() => {
    const a = appearanceQuery.data;
    if (!a) return;
    setAppearanceForm({
      primaryColor: a.primaryColor ?? '#444CE7',
      secondaryColor: a.secondaryColor ?? '',
      accentColor: a.accentColor ?? '',
      errorColor: a.errorColor ?? '',
      successColor: a.successColor ?? '',
      logoUrl: a.logoUrl ?? '',
      logoAltText: a.logoAltText ?? '',
    });
  }, [appearanceQuery.data]);

  const resetRegional = useCallback(() => {
    const s = settingsQuery.data?.settings;
    if (!s) return;
    setRegionalForm(regionalFormStateFromSettings(s));
  }, [settingsQuery.data?.settings]);

  const resetHours = useCallback(() => {
    const h = hoursQuery.data;
    if (!h) return;
    const tz = h.timezone ?? 'Africa/Johannesburg';
    setHoursForm({
      openTime: hoursToHHmm(h.openTime, tz) || '07:00',
      closeTime: hoursToHHmm(h.closeTime, tz) || '16:30',
      timezone: tz,
      holidayMode: h.holidayMode ?? false,
      holidayUntil: holidayUntilToLocalInput(h.holidayUntil),
      weekly: { ...defaultWeekly, ...h.weeklySchedule },
      schedule: mergeHoursSchedule(h.schedule),
      specialHours: normalizeSpecialHours(h.specialHours),
    });
  }, [hoursQuery.data]);

  const resetBranchForm = useCallback(async () => {
    setBranchFormDirty(false);
    await branchesQuery.refetch();
    if (branchRef) {
      await queryClient.refetchQueries({
        queryKey: settingsBranchDetailKey(orgRef, branchRef),
      });
    }
  }, [branchRef, branchesQuery, orgRef, queryClient]);

  const loading =
    canManageOrgSettings &&
    (!orgEnabled ||
    profileQuery.isLoading ||
    appearanceQuery.isLoading ||
    settingsQuery.isLoading ||
    hoursQuery.isLoading ||
    branchesQuery.isLoading);

  const profileOrg = profileQuery.data?.organisation;

  const branchTabs = branches.filter((b) => b.ref);
  const selectedBranch = branchTabs.find((b) => b.ref === branchRef);

  if (!canManageOrgSettings) {
    return (
      <div className={cn(appPageMainClass, 'flex w-full flex-col gap-6')}>
        <div data-tour="settings-page-header">
          <h1 className="text-2xl font-semibold text-foreground">{t('pageTitle')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('pageDescriptionCalendarOnly')}
          </p>
        </div>
        <CalendarIntegrationsSection />
      </div>
    );
  }

  if (!orgRef) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          {t('chrome.sections.selectOrg')}
        </p>
      </div>
    );
  }

  const tabBtnClass = (tab: SettingsTab) =>
    cn(
      'rounded-md',
      activeTab === tab
        ? 'bg-violet-600 text-white hover:bg-violet-700 hover:text-white'
        : 'text-gray-500 hover:bg-transparent hover:text-foreground'
    );

  return (
    <div className={cn(appPageMainClass, 'flex w-full flex-col gap-6')}>
      <div data-tour="settings-page-header">
        <h1 className="text-2xl font-semibold text-foreground">{t('pageTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('pageDescription')}
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{tCommon('loading')}…</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2" data-tour="settings-tab-nav">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('profile')}
              className={tabBtnClass('profile')}
            >
              <User className="mr-2 size-4" />
              {t('chrome.tabs.profile')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('appearance')}
              className={tabBtnClass('appearance')}
            >
              <Palette className="mr-2 size-4" />
              {t('chrome.tabs.appearance')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('regional')}
              className={tabBtnClass('regional')}
            >
              <Globe className="mr-2 size-4" />
              {t('chrome.tabs.regional')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('hours')}
              className={tabBtnClass('hours')}
            >
              <Clock className="mr-2 size-4" />
              {t('chrome.tabs.hours')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('branches')}
              className={tabBtnClass('branches')}
            >
              <Building2 className="mr-2 size-4" />
              {t('chrome.tabs.branches')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('calendar')}
              className={tabBtnClass('calendar')}
            >
              <CalendarDays className="mr-2 size-4" />
              {t('chrome.tabs.calendar')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('scrapping')}
              className={tabBtnClass('scrapping')}
            >
              <MapPin className="mr-2 size-4" />
              {t('chrome.tabs.scrapping')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('notices')}
              className={tabBtnClass('notices')}
            >
              <Megaphone className="mr-2 size-4" />
              {t('chrome.tabs.notices')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('banners')}
              className={tabBtnClass('banners')}
            >
              <ImageIcon className="mr-2 size-4" />
              {t('chrome.tabs.banners')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('performance-policy')}
              className={tabBtnClass('performance-policy')}
            >
              <ShieldCheck className="mr-2 size-4" />
              {t('chrome.tabs.performancePolicy')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('call-quality')}
              className={tabBtnClass('call-quality')}
            >
              <PhoneCall className="mr-2 size-4" />
              {t('chrome.tabs.callQuality')}
            </Button>
            {canManageWebhooks(backendUserData?.accessLevel) ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setActiveTab('webhooks')} className={tabBtnClass('webhooks')}>{t('chrome.tabs.webhooks')}</Button>
            ) : null}
          </div>

          {activeTab === 'profile' && (
            <div className={PANEL_CLASS} data-tour="settings-active-panel">
              <div className="px-6 pt-6">
                <h2 className="text-lg font-medium">{t('chrome.sections.orgProfile.title')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('chrome.sections.orgProfile.description')}
                </p>
              </div>
              <Separator className="mt-4" />
              <div className="px-6">
                <Row title={t('chrome.sections.orgName.title')} description={t('chrome.sections.orgName.description')}>
                  <Input
                    id="org-name"
                    value={profileForm.name}
                    onChange={(e) =>
                      setProfileForm((s) => ({ ...s, name: e.target.value }))
                    }
                    placeholder={t('placeholders.organisationName')}
                    aria-required
                  />
                </Row>
                <Separator />
                <Row title={t('chrome.sections.orgAlias.title')} description={t('chrome.sections.orgAlias.description')}>
                  <Input
                    id="org-alias"
                    value={profileForm.alias}
                    onChange={(e) =>
                      setProfileForm((s) => ({ ...s, alias: e.target.value }))
                    }
                    placeholder={t('placeholders.shortName')}
                  />
                </Row>
                <Separator />
                <Row title={t('chrome.sections.orgStatus.title')} description={t('chrome.sections.orgStatus.description')}>
                  <Select
                    value={profileForm.status}
                    onValueChange={(v) =>
                      setProfileForm((s) => ({ ...s, status: v }))
                    }
                  >
                    <SelectTrigger id="org-status" className="max-w-xs bg-background border-border">
                      {/* 
                        Radix SelectValue renders the selected SelectItem's ItemText.
                        Our SelectItems include an icon + label, so rendering an icon here
                        duplicates the selected icon (the bug shown in screenshots).
                      */}
                      <SelectValue placeholder={t('placeholders.status')} />
                    </SelectTrigger>
                    <SelectContent>
                      {!optionByValue(ORG_STATUS_SELECT_OPTIONS, profileForm.status) ? (
                        <SelectItem value={profileForm.status}>
                          <div className="flex items-center gap-2">
                            <HelpCircle className="size-4 shrink-0" />
                            {profileForm.status}
                          </div>
                        </SelectItem>
                      ) : null}
                      {ORG_STATUS_SELECT_OPTIONS.map(({ value, label, Icon }) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center gap-2">
                            <Icon className="size-4 shrink-0" />
                            {label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Row>
                <Separator />
                <Row title={t('chrome.sections.contact.title')} description={t('chrome.sections.contact.description')}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="org-email">{t('forms.email')}</Label>
                      <Input
                        id="org-email"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) =>
                          setProfileForm((s) => ({ ...s, email: e.target.value }))
                        }
                        placeholder={formPlaceholder(tCommon, 'email')}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-phone">{t('forms.phone')}</Label>
                      <Input
                        id="org-phone"
                        value={profileForm.phone}
                        onChange={(e) =>
                          setProfileForm((s) => ({ ...s, phone: e.target.value }))
                        }
                        placeholder={t('placeholders.phoneLocal')}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="org-website">{t('forms.website')}</Label>
                      <Input
                        id="org-website"
                        value={profileForm.website}
                        onChange={(e) =>
                          setProfileForm((s) => ({ ...s, website: e.target.value }))
                        }
                        placeholder={t('placeholders.websiteZa')}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-foreground">{t('forms.logo')}</Label>
                      <LogoField
                        client={client}
                        value={profileForm.logo}
                        onChange={(logo) => setProfileForm((s) => ({ ...s, logo }))}
                        urlInputId="org-logo"
                      />
                    </div>
                  </div>
                </Row>
                <Separator />
                <Row title={t('chrome.sections.address.title')} description={t('chrome.sections.address.description')}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ['street', t('forms.street'), profileForm.street],
                      ['suburb', t('forms.suburb'), profileForm.suburb],
                      ['city', t('forms.city'), profileForm.city],
                      ['state', t('forms.province'), profileForm.state],
                      ['country', t('forms.country'), profileForm.country],
                      ['postalCode', t('forms.postalCode'), profileForm.postalCode],
                    ].map(([key, label, val]) => (
                      <div key={key as string} className="space-y-2">
                        <Label htmlFor={`addr-${key}`}>{label}</Label>
                        <Input
                          id={`addr-${key}`}
                          value={val as string}
                          onChange={(e) =>
                            setProfileForm((s) => ({
                              ...s,
                              [key as string]: e.target.value,
                            }))
                          }
                          placeholder={addressFieldPlaceholder(tCommon, key)}
                        />
                      </div>
                    ))}
                  </div>
                </Row>
              </div>
              <div
                className="flex justify-end gap-2 border-t border-border px-6 py-4"
                data-tour="settings-panel-actions"
              >
                <Button type="button" variant="cancel" onClick={resetProfile}>
                  {tCommon('cancel')}
                </Button>
                <Button
                  type="button"
                  variant="success"
                  onClick={() => patchProfileMut.mutate()}
                  disabled={!profileOrg || patchProfileMut.isPending}
                >
                  {tCommon('saveChanges')}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className={PANEL_CLASS} data-tour="settings-active-panel">
              <div className="px-6 pt-6">
                <h2 className="text-lg font-medium">{t('chrome.sections.appearance.title')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('chrome.sections.appearance.description')}
                </p>
              </div>
              <Separator className="mt-4" />
              <div className="px-6">
                <Row
                  title={t('chrome.sections.brandColour.title')}
                  description={t('chrome.sections.brandColour.description')}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="color"
                      aria-label={t('forms.primaryColour')}
                      value={
                        appearanceForm.primaryColor?.startsWith('#')
                          ? appearanceForm.primaryColor
                          : '#444CE7'
                      }
                      onChange={(e) =>
                        setAppearanceForm((s) => ({
                          ...s,
                          primaryColor: e.target.value,
                        }))
                      }
                      className="h-10 w-14 cursor-pointer rounded border border-input bg-background"
                    />
                    <Input
                      className="max-w-[120px] font-mono text-sm"
                      value={appearanceForm.primaryColor}
                      onChange={(e) =>
                        setAppearanceForm((s) => ({
                          ...s,
                          primaryColor: e.target.value,
                        }))
                      }
                      placeholder={t('placeholders.hexPrimary')}
                      aria-label={t('forms.primaryColourHex')}
                    />
                  </div>
                </Row>
                <Separator />
                <Row title={t('chrome.sections.additionalColours.title')} description={t('chrome.sections.additionalColours.description')}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        ['secondaryColor', t('forms.secondaryColour')],
                        ['accentColor', t('forms.accentColour')],
                        ['errorColor', t('forms.errorColour')],
                        ['successColor', t('forms.successColour')],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key} className="space-y-2">
                        <Label htmlFor={key}>{label}</Label>
                        <Input
                          id={key}
                          value={appearanceForm[key]}
                          onChange={(e) =>
                            setAppearanceForm((s) => ({ ...s, [key]: e.target.value }))
                          }
                          placeholder={t('placeholders.hexBlack')}
                          className="font-mono text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </Row>
                <Separator />
                <Row title={t('chrome.sections.logo.title')} description={t('chrome.sections.logo.description')}>
                  <div className="space-y-3">
                    <LogoField
                      client={client}
                      value={appearanceForm.logoUrl}
                      onChange={(logoUrl) =>
                        setAppearanceForm((s) => ({ ...s, logoUrl }))
                      }
                      urlInputId="appearance-logo"
                    />
                    <div className="space-y-2">
                      <Label htmlFor="appearance-logo-alt">{t('forms.altText')}</Label>
                      <Input
                        id="appearance-logo-alt"
                        value={appearanceForm.logoAltText}
                        onChange={(e) =>
                          setAppearanceForm((s) => ({
                            ...s,
                            logoAltText: e.target.value,
                          }))
                        }
                        placeholder={t('placeholders.altText')}
                        className="bg-background border-border"
                      />
                    </div>
                  </div>
                </Row>
                <Separator />
                <Row
                  title={t('chrome.sections.dashboardOptions.title')}
                  description={t('chrome.sections.dashboardOptions.description')}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="chart-layout">{t('forms.dashboardCharts')}</Label>
                      <Select
                        value={regionalForm.chartLayout}
                        onValueChange={(value) =>
                          setRegionalForm((current) => ({
                            ...current,
                            chartLayout: value as 'compact' | 'comfortable',
                          }))
                        }
                      >
                        <SelectTrigger id="chart-layout"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="comfortable">{t('chrome.sections.dashboardOptions.comfortable')}</SelectItem>
                          <SelectItem value="compact">{t('chrome.sections.dashboardOptions.compact')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cookie-banner">{t('forms.cookieBanner')}</Label>
                      <Select
                        value={regionalForm.showCookieBanner ? 'on' : 'off'}
                        onValueChange={(value) =>
                          setRegionalForm((current) => ({
                            ...current,
                            showCookieBanner: value === 'on',
                          }))
                        }
                      >
                        <SelectTrigger id="cookie-banner"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="off">{t('chrome.sections.dashboardOptions.hidden')}</SelectItem>
                          <SelectItem value="on">{t('chrome.sections.dashboardOptions.shownOnHome')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="button" className="mt-3" onClick={() => saveSettingsMut.mutate()} disabled={saveSettingsMut.isPending}>
                    {t('chrome.sections.dashboardOptions.save')}
                  </Button>
                </Row>
              </div>
              <div
                className="flex justify-end gap-2 border-t border-border px-6 py-4"
                data-tour="settings-panel-actions"
              >
                <Button type="button" variant="cancel" onClick={resetAppearance}>
                  {tCommon('cancel')}
                </Button>
                <Button
                  type="button"
                  variant="success"
                  onClick={() => saveAppearanceMut.mutate()}
                  disabled={saveAppearanceMut.isPending}
                >
                  {tCommon('saveChanges')}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'regional' && (
            <div className={PANEL_CLASS} data-tour="settings-active-panel">
              <div className="px-6 pt-6">
                <h2 className="text-lg font-medium">{t('chrome.sections.regional.title')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('chrome.sections.regional.description')}
                </p>
              </div>
              <div className="space-y-2 px-6 pt-4">
                <Label htmlFor="user-language">{t('yourLanguage')}</Label>
                <p className="text-sm text-muted-foreground">{t('yourLanguageDescription')}</p>
                <LanguageSwitcher id="user-language" />
              </div>
              <Separator className="mt-4" />
              <div className="px-6">
                <Row title={t('chrome.sections.regional.localisation')} description={t('chrome.sections.regional.localisationHint')}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="lang">{t('forms.language')}</Label>
                      <Input
                        id="lang"
                        value={regionalForm.language}
                        onChange={(e) =>
                          setRegionalForm((s) => ({ ...s, language: e.target.value }))
                        }
                        placeholder={t('placeholders.locale')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tz">{t('forms.timezone')}</Label>
                      <Input
                        id="tz"
                        value={regionalForm.timezone}
                        onChange={(e) =>
                          setRegionalForm((s) => ({ ...s, timezone: e.target.value }))
                        }
                        placeholder={t('placeholders.timezone')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cur">{t('forms.currency')}</Label>
                      <Input
                        id="cur"
                        value={regionalForm.currency}
                        onChange={(e) =>
                          setRegionalForm((s) => ({ ...s, currency: e.target.value }))
                        }
                        placeholder={t('placeholders.currency')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="df">{t('forms.dateFormat')}</Label>
                      <Input
                        id="df"
                        value={regionalForm.dateFormat}
                        onChange={(e) =>
                          setRegionalForm((s) => ({ ...s, dateFormat: e.target.value }))
                        }
                        placeholder={t('placeholders.dateFormat')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tf">{t('forms.timeFormat')}</Label>
                      <Input
                        id="tf"
                        value={regionalForm.timeFormat}
                        onChange={(e) =>
                          setRegionalForm((s) => ({ ...s, timeFormat: e.target.value }))
                        }
                        placeholder={t('placeholders.timeFormat')}
                      />
                    </div>
                  </div>
                </Row>
                <Separator />
                <Row title={t('chrome.sections.notifications.title')} description={t('chrome.sections.notifications.description')}>
                  <div className="flex flex-wrap gap-4">
                    {(
                      [
                        ['notifEmail', t('forms.email')],
                        ['notifSms', t('forms.notifSms')],
                        ['notifPush', t('forms.notifPush')],
                        ['notifWhatsapp', t('forms.notifWhatsapp')],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={regionalForm[key]}
                          onChange={(e) =>
                            setRegionalForm((s) => ({
                              ...s,
                              [key]: e.target.checked,
                            }))
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </Row>
                <Separator />
                <Row title={t('chrome.sections.preferences.title')} description={t('chrome.sections.preferences.description')}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t('forms.theme')}</Label>
                      <Select
                        value={regionalForm.theme}
                        onValueChange={(v: 'light' | 'dark' | 'system') =>
                          setRegionalForm((s) => ({ ...s, theme: v }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          {/* 
                            Radix SelectValue renders the selected SelectItem's ItemText.
                            Our SelectItems include an icon + label, so rendering an icon here
                            duplicates the selected icon (the bug shown in screenshots).
                          */}
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {THEME_SELECT_OPTIONS.map(({ value, labelKey, Icon }) => (
                            <SelectItem key={value} value={value}>
                              <div className="flex items-center gap-2">
                                <Icon className="size-4 shrink-0" />
                                {t(labelKey)}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dv">{t('forms.defaultView')}</Label>
                      <Input
                        id="dv"
                        value={regionalForm.defaultView}
                        onChange={(e) =>
                          setRegionalForm((s) => ({
                            ...s,
                            defaultView: e.target.value,
                          }))
                        }
                        placeholder={t('placeholders.defaultView')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ipp">{t('forms.itemsPerPage')}</Label>
                      <Input
                        id="ipp"
                        type="number"
                        min={5}
                        value={regionalForm.itemsPerPage}
                        onChange={(e) =>
                          setRegionalForm((s) => ({
                            ...s,
                            itemsPerPage: Number(e.target.value) || 25,
                          }))
                        }
                        placeholder={t('placeholders.itemsPerPage')}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={regionalForm.menuCollapsed}
                        onChange={(e) =>
                          setRegionalForm((s) => ({
                            ...s,
                            menuCollapsed: e.target.checked,
                          }))
                        }
                      />
                      {t('chrome.sections.preferences.menuCollapsed')}
                    </label>
                  </div>
                </Row>
                <Separator />
                <Row title={t('chrome.sections.tasksFeedback.title')} description={t('chrome.sections.tasksFeedback.description')}>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={regionalForm.sendTaskNotifications}
                        onChange={(e) =>
                          setRegionalForm((s) => ({
                            ...s,
                            sendTaskNotifications: e.target.checked,
                          }))
                        }
                      />
                      {t('chrome.sections.tasksFeedback.sendTaskNotifications')}
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={regionalForm.createFollowUpTaskOnLeadCreate}
                        onChange={(e) =>
                          setRegionalForm((s) => ({
                            ...s,
                            createFollowUpTaskOnLeadCreate: e.target.checked,
                          }))
                        }
                      />
                      {t('chrome.sections.tasksFeedback.createFollowUp')}
                    </label>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{t('chrome.sections.tasksFeedback.deadlineReminders')}</p>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={regionalForm.reminderOffset24h}
                          onChange={(e) =>
                            setRegionalForm((s) => ({
                              ...s,
                              reminderOffset24h: e.target.checked,
                            }))
                          }
                        />
                        {t('chrome.sections.tasksFeedback.reminder24h')}
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={regionalForm.reminderOffset1h}
                          onChange={(e) =>
                            setRegionalForm((s) => ({
                              ...s,
                              reminderOffset1h: e.target.checked,
                            }))
                          }
                        />
                        {t('chrome.sections.tasksFeedback.reminder1h')}
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={regionalForm.reminderOffset15m}
                          onChange={(e) =>
                            setRegionalForm((s) => ({
                              ...s,
                              reminderOffset15m: e.target.checked,
                            }))
                          }
                        />
                        {t('chrome.sections.tasksFeedback.reminder15m')}
                      </label>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ft">{t('forms.feedbackTokenExpiry')}</Label>
                      <Input
                        id="ft"
                        type="number"
                        min={1}
                        value={regionalForm.feedbackTokenExpiryDays}
                        onChange={(e) =>
                          setRegionalForm((s) => ({
                            ...s,
                            feedbackTokenExpiryDays: Number(e.target.value) || 30,
                          }))
                        }
                        placeholder={t('placeholders.feedbackDays')}
                      />
                    </div>
                  </div>
                </Row>
                <Separator />
                <Row title={t('chrome.sections.geofence.title')} description={t('chrome.sections.geofence.description')}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="gdef">{t('forms.defaultRadius')}</Label>
                      <Input
                        id="gdef"
                        type="number"
                        value={regionalForm.geofenceDefaultRadius}
                        onChange={(e) =>
                          setRegionalForm((s) => ({
                            ...s,
                            geofenceDefaultRadius: Number(e.target.value),
                          }))
                        }
                        placeholder={t('placeholders.radiusDefault')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gmax">{t('forms.maxRadius')}</Label>
                      <Input
                        id="gmax"
                        type="number"
                        value={regionalForm.geofenceMaxRadius}
                        onChange={(e) =>
                          setRegionalForm((s) => ({
                            ...s,
                            geofenceMaxRadius: Number(e.target.value),
                          }))
                        }
                        placeholder={t('placeholders.radiusMax')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gmin">{t('forms.minRadius')}</Label>
                      <Input
                        id="gmin"
                        type="number"
                        value={regionalForm.geofenceMinRadius}
                        onChange={(e) =>
                          setRegionalForm((s) => ({
                            ...s,
                            geofenceMinRadius: Number(e.target.value),
                          }))
                        }
                        placeholder={t('placeholders.radiusMin')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gtype">{t('forms.defaultNotificationType')}</Label>
                      <Select
                        value={regionalForm.geofenceDefaultNotificationType}
                        onValueChange={(v) =>
                          setRegionalForm((s) => ({
                            ...s,
                            geofenceDefaultNotificationType: v,
                          }))
                        }
                      >
                        <SelectTrigger id="gtype" className="w-full">
                          {/* 
                            Radix SelectValue renders the selected SelectItem's ItemText.
                            Our SelectItems include an icon + label, so rendering an icon here
                            duplicates the selected icon (the bug shown in screenshots).
                          */}
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {!optionByValue(
                            GEOFENCE_NOTIFICATION_SELECT_OPTIONS,
                            regionalForm.geofenceDefaultNotificationType
                          ) ? (
                            <SelectItem value={regionalForm.geofenceDefaultNotificationType}>
                              <div className="flex items-center gap-2">
                                <HelpCircle className="size-4 shrink-0" />
                                {regionalForm.geofenceDefaultNotificationType}
                              </div>
                            </SelectItem>
                          ) : null}
                          {GEOFENCE_NOTIFICATION_SELECT_OPTIONS.map(
                            ({ value, label, Icon }) => (
                              <SelectItem key={value} value={value}>
                                <div className="flex items-center gap-2">
                                  <Icon className="size-4 shrink-0" />
                                  {label}
                                </div>
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <label className="flex items-center gap-2 text-sm sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={regionalForm.geofenceEnabledByDefault}
                        onChange={(e) =>
                          setRegionalForm((s) => ({
                            ...s,
                            geofenceEnabledByDefault: e.target.checked,
                          }))
                        }
                      />
                      {t('chrome.sections.geofence.enabledByDefault')}
                    </label>
                  </div>
                </Row>
                <Separator />
                <Collapsible className="rounded-md border border-border bg-gray-50/50 px-3 py-2">
                  <CollapsibleTrigger className="flex w-full items-center justify-between text-left text-sm font-medium text-foreground outline-none">
                    <span>{t('chrome.sections.contactJson')}</span>
                    <ChevronDown className="size-4 shrink-0 opacity-70" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="s-contact-email">{t('forms.contactEmail')}</Label>
                        <Input
                          id="s-contact-email"
                          type="email"
                          value={regionalForm.contactEmail}
                          onChange={(e) =>
                            setRegionalForm((s) => ({
                              ...s,
                              contactEmail: e.target.value,
                            }))
                          }
                          placeholder={formPlaceholder(tCommon, 'email')}
                          className="border-border bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s-phone-code">{t('forms.phoneCountryCode')}</Label>
                        <Input
                          id="s-phone-code"
                          value={regionalForm.contactPhoneCode}
                          onChange={(e) =>
                            setRegionalForm((s) => ({
                              ...s,
                              contactPhoneCode: e.target.value,
                            }))
                          }
                          placeholder={t('placeholders.phoneCode')}
                          className="border-border bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s-phone-num">{t('forms.phoneNumber')}</Label>
                        <Input
                          id="s-phone-num"
                          value={regionalForm.contactPhoneNumber}
                          onChange={(e) =>
                            setRegionalForm((s) => ({
                              ...s,
                              contactPhoneNumber: e.target.value,
                            }))
                          }
                          placeholder={t('placeholders.phoneLocal')}
                          className="border-border bg-background"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="s-contact-web">{t('forms.website')}</Label>
                        <Input
                          id="s-contact-web"
                          value={regionalForm.contactWebsite}
                          onChange={(e) =>
                            setRegionalForm((s) => ({
                              ...s,
                              contactWebsite: e.target.value,
                            }))
                          }
                          placeholder={formPlaceholder(tCommon, 'website')}
                          className="border-border bg-background"
                        />
                      </div>
                      {(
                        [
                          ['contactAddrStreet', t('forms.street'), 'street'],
                          ['contactAddrSuburb', t('forms.suburb'), 'suburb'],
                          ['contactAddrCity', t('forms.city'), 'city'],
                          ['contactAddrState', t('forms.state'), 'state'],
                          ['contactAddrCountry', t('forms.country'), 'country'],
                          ['contactAddrPostal', t('forms.postalCode'), 'postalCode'],
                        ] as const
                      ).map(([key, label, addrKey]) => (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={`s-${key}`}>{label}</Label>
                          <Input
                            id={`s-${key}`}
                            value={regionalForm[key]}
                            onChange={(e) =>
                              setRegionalForm((s) => ({
                                ...s,
                                [key]: e.target.value,
                              }))
                            }
                            placeholder={addressFieldPlaceholder(tCommon, addrKey)}
                            className="border-border bg-background"
                          />
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible className="mt-3 rounded-md border border-border bg-gray-50/50 px-3 py-2">
                  <CollapsibleTrigger className="flex w-full items-center justify-between text-left text-sm font-medium text-foreground outline-none">
                    <span>{t('chrome.sections.brandingJson')}</span>
                    <ChevronDown className="size-4 shrink-0 opacity-70" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <p className="mb-3 text-xs text-muted-foreground">
                      Distinct from the Appearance entity: used when products read{' '}
                      <code className="rounded bg-gray-100 px-1">settings.branding</code>.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(
                        [
                          ['brandingLogo', t('forms.brandingLogoUrl')],
                          ['brandingLogoAlt', t('forms.brandingLogoAlt')],
                          ['brandingFavicon', t('forms.brandingFavicon')],
                          ['brandingPrimary', t('forms.brandingPrimary')],
                          ['brandingSecondary', t('forms.brandingSecondary')],
                          ['brandingAccent', t('forms.brandingAccent')],
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key} className="space-y-2 sm:col-span-2">
                          <Label htmlFor={`s-${key}`}>{label}</Label>
                          <Input
                            id={`s-${key}`}
                            value={regionalForm[key]}
                            onChange={(e) =>
                              setRegionalForm((s) => ({
                                ...s,
                                [key]: e.target.value,
                              }))
                            }
                            placeholder={
                              key === 'brandingPrimary'
                                ? t('placeholders.hexPrimary')
                                : key === 'brandingSecondary' || key === 'brandingAccent'
                                  ? t('placeholders.hexBlack')
                                  : key === 'brandingLogoAlt'
                                    ? t('placeholders.altText')
                                    : formPlaceholder(tCommon, 'website')
                            }
                            className="border-border bg-background"
                          />
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible className="mt-3 rounded-md border border-border bg-gray-50/50 px-3 py-2">
                  <CollapsibleTrigger className="flex w-full items-center justify-between text-left text-sm font-medium text-foreground outline-none">
                    <span>{t('chrome.sections.businessProfile')}</span>
                    <ChevronDown className="size-4 shrink-0 opacity-70" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="s-bus-name">{t('forms.legalName')}</Label>
                        <Input
                          id="s-bus-name"
                          value={regionalForm.businessName}
                          onChange={(e) =>
                            setRegionalForm((s) => ({
                              ...s,
                              businessName: e.target.value,
                            }))
                          }
                          placeholder={t('placeholders.organisationName')}
                          className="border-border bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s-bus-reg">{t('forms.registrationNumber')}</Label>
                        <Input
                          id="s-bus-reg"
                          value={regionalForm.businessReg}
                          onChange={(e) =>
                            setRegionalForm((s) => ({
                              ...s,
                              businessReg: e.target.value,
                            }))
                          }
                          placeholder={t('placeholders.registrationNumber')}
                          className="border-border bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s-bus-tax">{t('forms.taxVatId')}</Label>
                        <Input
                          id="s-bus-tax"
                          value={regionalForm.businessTaxId}
                          onChange={(e) =>
                            setRegionalForm((s) => ({
                              ...s,
                              businessTaxId: e.target.value,
                            }))
                          }
                          placeholder={t('placeholders.taxVatId')}
                          className="border-border bg-background"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="s-bus-ind">{t('forms.industry')}</Label>
                        <Input
                          id="s-bus-ind"
                          value={regionalForm.businessIndustry}
                          onChange={(e) =>
                            setRegionalForm((s) => ({
                              ...s,
                              businessIndustry: e.target.value,
                            }))
                          }
                          placeholder={t('placeholders.industry')}
                          className="border-border bg-background"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>{t('forms.organisationSize')}</Label>
                        <Select
                          value={regionalForm.businessSize || '__none__'}
                          onValueChange={(v) =>
                            setRegionalForm((s) => ({
                              ...s,
                              businessSize:
                                v === '__none__'
                                  ? ''
                                  : (v as typeof s.businessSize),
                            }))
                          }
                        >
                          <SelectTrigger className="w-full border-border bg-background">
                            <SelectValue placeholder={t('placeholders.notSet')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">{t('placeholders.notSet')}</SelectItem>
                            <SelectItem value="small">{t('chrome.sections.sizes.small')}</SelectItem>
                            <SelectItem value="medium">{t('chrome.sections.sizes.medium')}</SelectItem>
                            <SelectItem value="large">{t('chrome.sections.sizes.large')}</SelectItem>
                            <SelectItem value="enterprise">{t('chrome.sections.sizes.enterprise')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible className="mt-3 rounded-md border border-border bg-gray-50/50 px-3 py-2">
                  <CollapsibleTrigger className="flex w-full items-center justify-between text-left text-sm font-medium text-foreground outline-none">
                    <span>{t('chrome.sections.socialTargets')}</span>
                    <ChevronDown className="size-4 shrink-0 opacity-70" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(
                        [
                          ['socialFacebook', t('forms.socialFacebook')],
                          ['socialTwitter', t('forms.socialTwitter')],
                          ['socialInstagram', t('forms.socialInstagram')],
                          ['socialLinkedin', t('forms.socialLinkedin')],
                          ['socialYoutube', t('forms.socialYoutube')],
                          ['socialWebsite', t('forms.socialWebsite')],
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key} className="space-y-2 sm:col-span-2">
                          <Label htmlFor={`s-${key}`}>{label}</Label>
                          <Input
                            id={`s-${key}`}
                            value={regionalForm[key]}
                            onChange={(e) =>
                              setRegionalForm((s) => ({
                                ...s,
                                [key]: e.target.value,
                              }))
                            }
                            placeholder={formPlaceholder(tCommon, 'website')}
                            className="border-border bg-background"
                          />
                        </div>
                      ))}
                      <div className="space-y-2 sm:col-span-2 border-t border-border pt-3">
                        <p className="text-xs font-medium text-muted-foreground">
                          {t('chrome.sections.revenueTargets')}
                        </p>
                      </div>
                      {(
                        [
                          ['perfDaily', t('forms.perfDaily')],
                          ['perfWeekly', t('forms.perfWeekly')],
                          ['perfMonthly', t('forms.perfMonthly')],
                          ['perfYearly', t('forms.perfYearly')],
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={`s-${key}`}>{label}</Label>
                          <Input
                            id={`s-${key}`}
                            type="number"
                            value={regionalForm[key]}
                            onChange={(e) =>
                              setRegionalForm((s) => ({
                                ...s,
                                [key]: e.target.value,
                              }))
                            }
                            placeholder={formPlaceholder(tCommon, 'zero')}
                            className="border-border bg-background"
                          />
                        </div>
                      ))}
                      <div className="space-y-2 sm:col-span-2">
                        <Label>{t('forms.targetCalculation')}</Label>
                        <Select
                          value={regionalForm.perfCalcMethod || '__none__'}
                          onValueChange={(v) =>
                            setRegionalForm((s) => ({
                              ...s,
                              perfCalcMethod:
                                v === '__none__'
                                  ? ''
                                  : (v as typeof s.perfCalcMethod),
                            }))
                          }
                        >
                          <SelectTrigger className="w-full border-border bg-background">
                            <SelectValue placeholder={t('placeholders.notSet')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">{t('placeholders.notSet')}</SelectItem>
                            <SelectItem value="fixed">{t('chrome.sections.targetCalc.fixed')}</SelectItem>
                            <SelectItem value="dynamic">{t('chrome.sections.targetCalc.dynamic')}</SelectItem>
                            <SelectItem value="historical">{t('chrome.sections.targetCalc.historical')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s-perf-hist">{t('forms.historicalPeriod')}</Label>
                        <Input
                          id="s-perf-hist"
                          type="number"
                          value={regionalForm.perfHistDays}
                          onChange={(e) =>
                            setRegionalForm((s) => ({
                              ...s,
                              perfHistDays: e.target.value,
                            }))
                          }
                          placeholder={t('placeholders.historicalDays')}
                          className="border-border bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s-perf-gr">{t('forms.growthTarget')}</Label>
                        <Input
                          id="s-perf-gr"
                          type="number"
                          value={regionalForm.perfGrowthPct}
                          onChange={(e) =>
                            setRegionalForm((s) => ({
                              ...s,
                              perfGrowthPct: e.target.value,
                            }))
                          }
                          placeholder={t('placeholders.growthPct')}
                          className="border-border bg-background"
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
              <div
                className="flex justify-end gap-2 border-t border-border px-6 py-4"
                data-tour="settings-panel-actions"
              >
                <Button type="button" variant="cancel" onClick={resetRegional}>
                  {tCommon('cancel')}
                </Button>
                <Button
                  type="button"
                  variant="success"
                  onClick={() => saveSettingsMut.mutate()}
                  disabled={saveSettingsMut.isPending}
                >
                  {tCommon('saveChanges')}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'hours' && (
            <div className={PANEL_CLASS} data-tour="settings-active-panel">
              <div className="px-6 pt-6">
                <h2 className="text-lg font-medium">{t('chrome.sections.hours.title')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('chrome.sections.hours.description')}
                </p>
              </div>
              <Separator className="mt-4" />
              <div className="px-6">
                <Row title={t('chrome.sections.hours.defaultTimes')} description={t('chrome.sections.hours.defaultTimesHint')}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="ot">{t('forms.open')}</Label>
                      <Input
                        id="ot"
                        value={hoursForm.openTime}
                        onChange={(e) =>
                          setHoursForm((s) => ({ ...s, openTime: e.target.value }))
                        }
                        placeholder={t('placeholders.openTime')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ct">{t('forms.close')}</Label>
                      <Input
                        id="ct"
                        value={hoursForm.closeTime}
                        onChange={(e) =>
                          setHoursForm((s) => ({ ...s, closeTime: e.target.value }))
                        }
                        placeholder={t('placeholders.closeTime')}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="htz">{t('forms.timezone')}</Label>
                      <Input
                        id="htz"
                        value={hoursForm.timezone}
                        onChange={(e) =>
                          setHoursForm((s) => ({ ...s, timezone: e.target.value }))
                        }
                        placeholder={t('placeholders.timezone')}
                      />
                    </div>
                  </div>
                </Row>
                <Separator />
                <Row title={t('chrome.sections.hours.workingDays')} description={t('chrome.sections.hours.workingDaysHint')}>
                  <div className="flex flex-wrap gap-3">
                    {WEEKDAYS.map(({ key }) => (
                      <label
                        key={key}
                        className={cn(
                          'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm',
                          hoursForm.weekly[key]
                            ? 'border-green-600 bg-green-600/10'
                            : 'border-border'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={hoursForm.weekly[key]}
                          onChange={(e) =>
                            setHoursForm((s) => ({
                              ...s,
                              weekly: { ...s.weekly, [key]: e.target.checked },
                            }))
                          }
                        />
                        {t(`forms.weekdaysShort.${key}`)}
                      </label>
                    ))}
                  </div>
                </Row>
                <Separator />
                <Row title={t('chrome.sections.hours.holidayMode')} description={t('chrome.sections.hours.holidayModeHint')}>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={hoursForm.holidayMode}
                        onChange={(e) =>
                          setHoursForm((s) => ({ ...s, holidayMode: e.target.checked }))
                        }
                      />
                      {t('chrome.sections.hours.holidayModeActive')}
                    </label>
                    <div className="space-y-2">
                      <Label htmlFor="hu">{t('forms.until')}</Label>
                      <Input
                        id="hu"
                        type="datetime-local"
                        value={hoursForm.holidayUntil}
                        onChange={(e) =>
                          setHoursForm((s) => ({ ...s, holidayUntil: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </Row>
                <Separator />
                <Collapsible defaultOpen className="mt-6 space-y-3">
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border border-border bg-muted/30 px-4 py-3 text-left text-sm font-medium hover:bg-muted/50 [&[data-state=open]>svg]:rotate-180">
                    <span>{t('chrome.sections.hours.detailedWeekly')}</span>
                    <ChevronDown className="size-4 shrink-0 transition-transform" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-2">
                    <p className="text-sm text-muted-foreground">
                      {t('chrome.sections.hours.detailedWeeklyHint')}
                    </p>
                    <div className="space-y-3">
                      {WEEKDAYS.map(({ key }) => (
                        <div
                          key={key}
                          className="grid gap-3 rounded-md border border-gray-100 p-3 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end"
                        >
                          <div className="text-sm font-medium text-foreground">{t(`forms.weekdaysShort.${key}`)}</div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{t('forms.open')}</Label>
                            <Input
                              value={hoursForm.schedule[key].start}
                              onChange={(e) =>
                                setHoursForm((s) => ({
                                  ...s,
                                  schedule: {
                                    ...s.schedule,
                                    [key]: { ...s.schedule[key], start: e.target.value },
                                  },
                                }))
                              }
                              placeholder={t('placeholders.openTime')}
                              className="font-mono text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{t('forms.close')}</Label>
                            <Input
                              value={hoursForm.schedule[key].end}
                              onChange={(e) =>
                                setHoursForm((s) => ({
                                  ...s,
                                  schedule: {
                                    ...s.schedule,
                                    [key]: { ...s.schedule[key], end: e.target.value },
                                  },
                                }))
                              }
                              placeholder={t('placeholders.closeTime')}
                              className="font-mono text-sm"
                            />
                          </div>
                          <label className="flex items-center gap-2 text-sm sm:justify-end">
                            <input
                              type="checkbox"
                              checked={hoursForm.schedule[key].closed}
                              onChange={(e) =>
                                setHoursForm((s) => ({
                                  ...s,
                                  schedule: {
                                    ...s.schedule,
                                    [key]: { ...s.schedule[key], closed: e.target.checked },
                                  },
                                }))
                              }
                            />
                            {t('chrome.sections.hours.closed')}
                          </label>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
                <Separator />
                <Row
                  title={t('chrome.sections.hours.specialHours')}
                  description={t('chrome.sections.hours.specialHoursHint')}
                >
                  <div className="space-y-3">
                    {hoursForm.specialHours.map((row, idx) => (
                      <div
                        key={idx}
                        className="grid gap-3 rounded-md border border-gray-100 p-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]"
                      >
                        <div className="space-y-1">
                          <Label className="text-xs">{t('forms.date')}</Label>
                          <Input
                            type="date"
                            value={row.date}
                            onChange={(e) =>
                              setHoursForm((s) => {
                                const next = [...s.specialHours];
                                next[idx] = { ...next[idx], date: e.target.value };
                                return { ...s, specialHours: next };
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t('forms.open')}</Label>
                          <Input
                            value={row.openTime}
                            onChange={(e) =>
                              setHoursForm((s) => {
                                const next = [...s.specialHours];
                                next[idx] = { ...next[idx], openTime: e.target.value };
                                return { ...s, specialHours: next };
                              })
                            }
                            placeholder={t('placeholders.specialOpenTime')}
                            className="font-mono text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t('forms.close')}</Label>
                          <Input
                            value={row.closeTime}
                            onChange={(e) =>
                              setHoursForm((s) => {
                                const next = [...s.specialHours];
                                next[idx] = { ...next[idx], closeTime: e.target.value };
                                return { ...s, specialHours: next };
                              })
                            }
                            placeholder={t('placeholders.specialCloseTime')}
                            className="font-mono text-sm"
                          />
                        </div>
                        <div className="space-y-1 md:col-span-1">
                          <Label className="text-xs">{t('forms.reasonOptional')}</Label>
                          <Input
                            value={row.reason}
                            onChange={(e) =>
                              setHoursForm((s) => {
                                const next = [...s.specialHours];
                                next[idx] = { ...next[idx], reason: e.target.value };
                                return { ...s, specialHours: next };
                              })
                            }
                            placeholder={t('placeholders.holidayReason')}
                          />
                        </div>
                        <div className="flex items-end justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            aria-label={t('chrome.sections.hours.removeRow')}
                            onClick={() =>
                              setHoursForm((s) => ({
                                ...s,
                                specialHours: s.specialHours.filter((_, i) => i !== idx),
                              }))
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() =>
                        setHoursForm((s) => ({
                          ...s,
                          specialHours: [
                            ...s.specialHours,
                            {
                              date: '',
                              openTime: '09:00',
                              closeTime: '17:00',
                              reason: '',
                            },
                          ],
                        }))
                      }
                    >
                      <Plus className="size-4" />
                      {t('chrome.sections.hours.addSpecialRow')}
                    </Button>
                  </div>
                </Row>
              </div>
              <div
                className="flex justify-end gap-2 border-t border-border px-6 py-4"
                data-tour="settings-panel-actions"
              >
                <Button type="button" variant="cancel" onClick={resetHours}>
                  {tCommon('cancel')}
                </Button>
                <Button
                  type="button"
                  variant="success"
                  onClick={() => saveHoursMut.mutate()}
                  disabled={saveHoursMut.isPending}
                >
                  {tCommon('saveChanges')}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'branches' && (
            <>
            <div className={PANEL_CLASS} data-tour="settings-active-panel">
              <div className="flex flex-col gap-3 px-6 pt-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-medium">{t('chrome.sections.branches.title')}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t('chrome.sections.branches.description')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="default"
                  className="shrink-0 gap-2 bg-purple-600 text-white hover:bg-purple-700 [&_svg]:text-white"
                  onClick={openAddBranchDialog}
                >
                  <Plus className="size-4" />
                  {t('chrome.sections.branches.add')}
                </Button>
              </div>
              <Separator className="mt-4" />
              <div className="px-6">
                <Row title={t('chrome.sections.branches.branch')} description={t('chrome.sections.branches.branchHint')}>
                  <Popover open={branchPickerOpen} onOpenChange={setBranchPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={branchPickerOpen}
                        className="h-10 w-full max-w-xl justify-between bg-background border-border font-normal"
                        disabled={branchTabs.length === 0}
                      >
                        {selectedBranch
                          ? getBranchDisplayLabel(selectedBranch) || selectedBranch.ref
                          : branchTabs.length === 0
                            ? t('chrome.sections.branches.none')
                            : t('chrome.sections.branches.select')}
                        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[min(100vw-2rem,36rem)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder={t('placeholders.searchBranches')} />
                        <CommandList>
                          <CommandEmpty>{t('chrome.sections.branches.noneFound')}</CommandEmpty>
                          <CommandGroup>
                            {branchTabs.map((b) => (
                              <CommandItem
                                key={b.ref}
                                value={`${getBranchDisplayLabel(b)} ${b.name ?? ''} ${b.ref ?? ''} ${b.email ?? ''}`}
                                onSelect={() => {
                                  if (b.ref) setBranchRef(b.ref);
                                  setBranchPickerOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'size-4 shrink-0',
                                    branchRef === b.ref ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                <span className="truncate">
                                  {getBranchDisplayLabel(b) || b.ref}
                                  {b.ref ? (
                                    <span className="text-muted-foreground">
                                      {' · '}
                                      {b.ref}
                                    </span>
                                  ) : null}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </Row>
                <Separator />
                <section className="py-2">
                  <h3 className="text-lg font-medium text-foreground mb-4">{t('chrome.sections.branches.details')}</h3>
                  <p className="text-sm text-muted-foreground mb-4 -mt-2">
                    {t('chrome.sections.branches.detailsHint')}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="br-name">{t('forms.name')}</Label>
                      <Input
                        id="br-name"
                        value={branchForm.name}
                        onChange={(e) =>
                          setBranchFormUser((s) => ({ ...s, name: e.target.value }))
                        }
                        placeholder={t('placeholders.branchName')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="br-alias">{t('forms.alias')}</Label>
                      <Input
                        id="br-alias"
                        value={branchForm.alias}
                        onChange={(e) =>
                          setBranchFormUser((s) => ({ ...s, alias: e.target.value }))
                        }
                        placeholder={t('placeholders.shortName')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="br-email">{t('forms.email')}</Label>
                      <Input
                        id="br-email"
                        type="email"
                        value={branchForm.email}
                        onChange={(e) =>
                          setBranchFormUser((s) => ({ ...s, email: e.target.value }))
                        }
                        placeholder={t('placeholders.branchEmail')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="br-phone">{t('forms.phone')}</Label>
                      <Input
                        id="br-phone"
                        value={branchForm.phone}
                        onChange={(e) =>
                          setBranchFormUser((s) => ({ ...s, phone: e.target.value }))
                        }
                        placeholder={t('placeholders.branchPhone')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="br-cp">{t('forms.contactPerson')}</Label>
                      <Input
                        id="br-cp"
                        value={branchForm.contactPerson}
                        onChange={(e) =>
                          setBranchFormUser((s) => ({
                            ...s,
                            contactPerson: e.target.value,
                          }))
                        }
                        placeholder={formPlaceholder(tCommon, 'fullName')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="br-primary-sales">{t('forms.primaryInternalSales')}</Label>
                      <Select
                        value={branchForm.primaryInternalSalesUserUid || 'none'}
                        onValueChange={(value) =>
                          setBranchFormUser((current) => ({
                            ...current,
                            primaryInternalSalesUserUid: value === 'none' ? '' : value,
                          }))
                        }
                      >
                        <SelectTrigger id="br-primary-sales">
                          <SelectValue placeholder={t('placeholders.none')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t('placeholders.none')}</SelectItem>
                          {branchForm.primaryInternalSalesUserUid &&
                          !internalSalesAtBranch.some(
                            (user) => String(user.uid) === branchForm.primaryInternalSalesUserUid,
                          ) ? (
                            <SelectItem value={branchForm.primaryInternalSalesUserUid}>
                              {t('chrome.sections.branches.selectedUser')}
                            </SelectItem>
                          ) : null}
                          {internalSalesAtBranch.map((user) => (
                            <SelectItem key={user.uid} value={String(user.uid)}>
                              {[user.name, user.surname].filter(Boolean).join(' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {t('chrome.sections.branches.landlineNote')}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="br-web">{t('forms.website')}</Label>
                      <Input
                        id="br-web"
                        value={branchForm.website}
                        onChange={(e) =>
                          setBranchFormUser((s) => ({ ...s, website: e.target.value }))
                        }
                        placeholder={t('placeholders.websiteZa')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="br-floor">{t('forms.floorSizeSqm')}</Label>
                      <Input
                        id="br-floor"
                        type="number"
                        min={0}
                        step="any"
                        placeholder={t('placeholders.floorSize')}
                        value={branchForm.floorSizeSqm}
                        onChange={(e) =>
                          setBranchFormUser((s) => ({
                            ...s,
                            floorSizeSqm: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('forms.status')}</Label>
                      <Select
                        value={branchForm.status}
                        onValueChange={(v) =>
                          setBranchFormUser((s) => ({ ...s, status: v }))
                        }
                      >
                        <SelectTrigger>
                          {/* 
                            Radix SelectValue renders the selected SelectItem's ItemText.
                            Our SelectItems include an icon + label, so rendering an icon here
                            duplicates the selected icon (the bug shown in screenshots).
                          */}
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {!optionByValue(
                            BRANCH_STATUS_SELECT_OPTIONS,
                            branchForm.status
                          ) ? (
                            <SelectItem value={branchForm.status}>
                              <div className="flex items-center gap-2">
                                <HelpCircle className="size-4 shrink-0" />
                                {branchForm.status}
                              </div>
                            </SelectItem>
                          ) : null}
                          {BRANCH_STATUS_SELECT_OPTIONS.map(({ value, label, Icon }) => (
                            <SelectItem key={value} value={value}>
                              <div className="flex items-center gap-2">
                                <Icon className="size-4 shrink-0" />
                                {label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="br-country">{t('forms.countryCode')}</Label>
                      <Input
                        id="br-country"
                        value={branchForm.country}
                        onChange={(e) =>
                          setBranchFormUser((s) => ({ ...s, country: e.target.value }))
                        }
                        placeholder={t('placeholders.countryCode')}
                      />
                    </div>
                  </div>
                </section>
                <Separator />
                <section className="py-2">
                  <h3 className="text-lg font-medium text-foreground mb-4">{t('chrome.sections.address.title')}</h3>
                  <p className="text-sm text-muted-foreground mb-4 -mt-2">
                    {t('chrome.sections.branches.addressHint')}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        ['street', t('forms.street'), branchForm.street],
                        ['suburb', t('forms.suburb'), branchForm.suburb],
                        ['city', t('forms.city'), branchForm.city],
                        ['state', t('forms.state'), branchForm.state],
                        ['addrCountry', t('forms.country'), branchForm.addrCountry],
                        ['postalCode', t('forms.postalCode'), branchForm.postalCode],
                      ] as const
                    ).map(([key, label, val]) => (
                      <div key={key} className="space-y-2">
                        <Label htmlFor={`br-${key}`}>{label}</Label>
                        <Input
                          id={`br-${key}`}
                          value={val}
                          onChange={(e) =>
                            setBranchFormUser((s) => ({
                              ...s,
                              [key]: e.target.value,
                            }))
                          }
                          placeholder={addressFieldPlaceholder(
                            tCommon,
                            key === 'addrCountry' ? 'country' : key,
                          )}
                          autoCapitalize="off"
                          autoCorrect="off"
                          className="bg-background border-border normal-case"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <div
                className="flex justify-end gap-2 border-t border-border px-6 py-4"
                data-tour="settings-panel-actions"
              >
                <Button
                  type="button"
                  variant="cancel"
                  onClick={() => void resetBranchForm()}
                  disabled={!branchRef}
                >
                  {tCommon('cancel')}
                </Button>
                <Button
                  type="button"
                  variant="success"
                  onClick={() => saveBranchMut.mutate()}
                  disabled={!branchRef || saveBranchMut.isPending}
                >
                  {tCommon('saveChanges')}
                </Button>
              </div>
            </div>

            <Dialog open={addBranchOpen} onOpenChange={setAddBranchOpen}>
              <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{t('chrome.sections.branches.add')}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 py-2 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="new-br-ref">{t('forms.reference')}</Label>
                    <Input
                      id="new-br-ref"
                      value={createBranchForm.ref}
                      onChange={(e) =>
                        setCreateBranchForm((s) => ({ ...s, ref: e.target.value }))
                      }
                      placeholder={t('placeholders.autoReference')}
                      className={cn(CREATE_BRANCH_INPUT_CLASS, 'font-mono')}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="new-br-name">{t('forms.name')}</Label>
                    <Input
                      id="new-br-name"
                      value={createBranchForm.name}
                      onChange={(e) =>
                        setCreateBranchForm((s) => ({ ...s, name: e.target.value }))
                      }
                      placeholder={t('placeholders.branchName')}
                      className={CREATE_BRANCH_INPUT_CLASS}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-br-alias">{t('forms.aliasOptional')}</Label>
                    <Input
                      id="new-br-alias"
                      value={createBranchForm.alias}
                      onChange={(e) =>
                        setCreateBranchForm((s) => ({ ...s, alias: e.target.value }))
                      }
                      placeholder={t('placeholders.shortName')}
                      className={CREATE_BRANCH_INPUT_CLASS}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-br-email">{t('forms.email')}</Label>
                    <Input
                      id="new-br-email"
                      type="email"
                      value={createBranchForm.email}
                      onChange={(e) =>
                        setCreateBranchForm((s) => ({ ...s, email: e.target.value }))
                      }
                      placeholder={t('placeholders.branchEmail')}
                      className={CREATE_BRANCH_INPUT_CLASS}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-br-phone">{t('forms.phone')}</Label>
                    <Input
                      id="new-br-phone"
                      value={createBranchForm.phone}
                      onChange={(e) =>
                        setCreateBranchForm((s) => ({ ...s, phone: e.target.value }))
                      }
                      placeholder={t('placeholders.branchPhone')}
                      className={CREATE_BRANCH_INPUT_CLASS}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-br-floor">{t('forms.floorSizeSqmOptional')}</Label>
                    <Input
                      id="new-br-floor"
                      type="number"
                      min={0}
                      step="any"
                      value={createBranchForm.floorSizeSqm}
                      onChange={(e) =>
                        setCreateBranchForm((s) => ({
                          ...s,
                          floorSizeSqm: e.target.value,
                        }))
                      }
                      placeholder={t('placeholders.floorSize')}
                      className={CREATE_BRANCH_INPUT_CLASS}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="new-br-cp">{t('forms.contactPerson')}</Label>
                    <Input
                      id="new-br-cp"
                      value={createBranchForm.contactPerson}
                      onChange={(e) =>
                        setCreateBranchForm((s) => ({
                          ...s,
                          contactPerson: e.target.value,
                        }))
                      }
                      placeholder={formPlaceholder(tCommon, 'fullName')}
                      className={CREATE_BRANCH_INPUT_CLASS}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="new-br-web">{t('forms.website')}</Label>
                    <Input
                      id="new-br-web"
                      value={createBranchForm.website}
                      onChange={(e) =>
                        setCreateBranchForm((s) => ({ ...s, website: e.target.value }))
                      }
                      placeholder={t('placeholders.websiteZa')}
                      className={CREATE_BRANCH_INPUT_CLASS}
                    />
                  </div>
                  {(
                    [
                      ['street', t('forms.street'), createBranchForm.street, t('placeholders.branchStreet')],
                      ['suburb', t('forms.suburb'), createBranchForm.suburb, t('placeholders.branchSuburb')],
                      ['city', t('forms.city'), createBranchForm.city, t('placeholders.branchCity')],
                      ['state', t('forms.state'), createBranchForm.state, t('placeholders.branchProvince')],
                      ['country', t('forms.country'), createBranchForm.country, t('placeholders.branchCountry')],
                      [
                        'postalCode',
                        t('forms.postalCodeZa'),
                        createBranchForm.postalCode,
                        t('placeholders.branchPostalCode'),
                      ],
                    ] as const
                  ).map(([key, label, val, placeholder]) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={`new-br-${key}`}>{label}</Label>
                      <Input
                        id={`new-br-${key}`}
                        value={val}
                        onChange={(e) =>
                          setCreateBranchForm((s) => ({
                            ...s,
                            [key]: e.target.value,
                          }))
                        }
                        placeholder={placeholder}
                        className={CREATE_BRANCH_INPUT_CLASS}
                      />
                    </div>
                  ))}
                </div>
                <DialogFooter className="gap-2">
                  <Button
                    type="button"
                    variant="cancel"
                    onClick={() => setAddBranchOpen(false)}
                  >
                    {tCommon('cancel')}
                  </Button>
                  <Button
                    type="button"
                    className="bg-purple-600 text-white hover:bg-purple-700"
                    onClick={() => createBranchMut.mutate()}
                    disabled={createBranchMut.isPending}
                  >
                    {t('chrome.sections.branches.create')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </>
          )}

          {activeTab === 'calendar' && (
            <div className="space-y-6">
              <OrganisationCalendarSettingsSection orgRef={orgRef} />
              <CalendarIntegrationsSection />
            </div>
          )}

          {activeTab === 'scrapping' && (
            <ApifyLeadJobsSection
              orgTimezone={settingsQuery.data?.settings?.regional?.timezone}
            />
          )}

          {activeTab === 'notices' && (
            <OrganisationNoticesSection />
          )}

          {activeTab === 'banners' && (
            <OrganisationBannersSection />
          )}

          {activeTab === 'performance-policy' && orgRef && (
            <PerformancePolicySettingsSection orgRef={orgRef} />
          )}

          {activeTab === 'call-quality' && orgRef && (
            <CallQualitySettingsSection orgRef={orgRef} />
          )}
          {activeTab === 'webhooks' && canManageWebhooks(backendUserData?.accessLevel) ? <WebhooksSection /> : null}
        </>
      )}
    </div>
  );
}

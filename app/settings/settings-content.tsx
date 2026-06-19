'use client';

import { useCallback, useEffect, useState } from 'react';
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
} from 'lucide-react';
import { CalendarIntegrationsSection } from '@/components/settings/calendar-integrations-section';
import { OrganisationNoticesSection } from '@/components/settings/organisation-notices-section';
import { canAccessOrgSettings } from '@/lib/access';

const WEEKDAYS: { key: WeekdayKey; label: string }[] = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
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

type SettingsTab = 'profile' | 'appearance' | 'regional' | 'hours' | 'branches' | 'calendar' | 'notices';

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
    street: formatAddressForDisplay(b.address?.street),
    suburb: formatAddressForDisplay(b.address?.suburb),
    city: formatAddressForDisplay(b.address?.city),
    state: formatAddressForDisplay(b.address?.state),
    addrCountry: formatAddressForDisplay(b.address?.country),
    postalCode: addressPostalCode(b.address).trim(),
  };
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
      <div className="container mx-auto flex w-full flex-col gap-6 px-2 py-8 sm:px-6">
        <div data-tour="settings-page-header">
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect your Outlook or Google Calendar using your LORO account email.
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
          Select an organisation in Clerk, then open Settings again.
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
    <div className="container mx-auto flex w-full flex-col gap-6 px-2 py-8 sm:px-6">
      <div data-tour="settings-page-header">
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage organisation profile, appearance, regional defaults, hours, branches, and notices.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
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
              Profile
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('appearance')}
              className={tabBtnClass('appearance')}
            >
              <Palette className="mr-2 size-4" />
              Appearance
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('regional')}
              className={tabBtnClass('regional')}
            >
              <Globe className="mr-2 size-4" />
              Regional &amp; preferences
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('hours')}
              className={tabBtnClass('hours')}
            >
              <Clock className="mr-2 size-4" />
              Hours
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('branches')}
              className={tabBtnClass('branches')}
            >
              <Building2 className="mr-2 size-4" />
              Branches
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('calendar')}
              className={tabBtnClass('calendar')}
            >
              <CalendarDays className="mr-2 size-4" />
              Calendar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('notices')}
              className={tabBtnClass('notices')}
            >
              <Megaphone className="mr-2 size-4" />
              Notices
            </Button>
          </div>

          {activeTab === 'profile' && (
            <div className={PANEL_CLASS} data-tour="settings-active-panel">
              <div className="px-6 pt-6">
                <h2 className="text-lg font-medium">Organisation profile</h2>
                <p className="text-sm text-muted-foreground">
                  Legal name, contact, and address shown across the product.
                </p>
              </div>
              <Separator className="mt-4" />
              <div className="px-6">
                <Row title="Name" description="Official organisation name.">
                  <Input
                    id="org-name"
                    value={profileForm.name}
                    onChange={(e) =>
                      setProfileForm((s) => ({ ...s, name: e.target.value }))
                    }
                    aria-required
                  />
                </Row>
                <Separator />
                <Row title="Alias" description="Short internal display name (optional).">
                  <Input
                    id="org-alias"
                    value={profileForm.alias}
                    onChange={(e) =>
                      setProfileForm((s) => ({ ...s, alias: e.target.value }))
                    }
                  />
                </Row>
                <Separator />
                <Row title="Status" description="Organisation lifecycle state.">
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
                      <SelectValue placeholder="Status" />
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
                <Row title="Contact" description="Email, phone, website, and organisation logo.">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="org-email">Email</Label>
                      <Input
                        id="org-email"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) =>
                          setProfileForm((s) => ({ ...s, email: e.target.value }))
                        }
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-phone">Phone</Label>
                      <Input
                        id="org-phone"
                        value={profileForm.phone}
                        onChange={(e) =>
                          setProfileForm((s) => ({ ...s, phone: e.target.value }))
                        }
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="org-website">Website</Label>
                      <Input
                        id="org-website"
                        value={profileForm.website}
                        onChange={(e) =>
                          setProfileForm((s) => ({ ...s, website: e.target.value }))
                        }
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-foreground">Logo</Label>
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
                <Row title="Address" description="Head office location.">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ['street', 'Street', profileForm.street],
                      ['suburb', 'Suburb', profileForm.suburb],
                      ['city', 'City', profileForm.city],
                      ['state', 'State / province', profileForm.state],
                      ['country', 'Country', profileForm.country],
                      ['postalCode', 'Postal code', profileForm.postalCode],
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
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="success"
                  onClick={() => patchProfileMut.mutate()}
                  disabled={!profileOrg || patchProfileMut.isPending}
                >
                  Save changes
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className={PANEL_CLASS} data-tour="settings-active-panel">
              <div className="px-6 pt-6">
                <h2 className="text-lg font-medium">Appearance</h2>
                <p className="text-sm text-muted-foreground">
                  Brand colours and logo for your organisation theme.
                </p>
              </div>
              <Separator className="mt-4" />
              <div className="px-6">
                <Row
                  title="Brand colour"
                  description="Primary colour for buttons and highlights."
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="color"
                      aria-label="Primary colour"
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
                      aria-label="Primary colour hex"
                    />
                  </div>
                </Row>
                <Separator />
                <Row title="Additional colours" description="Secondary, accent, status colours.">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        ['secondaryColor', 'Secondary'],
                        ['accentColor', 'Accent'],
                        ['errorColor', 'Error'],
                        ['successColor', 'Success'],
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
                          placeholder="#000000"
                          className="font-mono text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </Row>
                <Separator />
                <Row title="Logo" description="Logo image and accessible label.">
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
                      <Label htmlFor="appearance-logo-alt">Alt text</Label>
                      <Input
                        id="appearance-logo-alt"
                        value={appearanceForm.logoAltText}
                        onChange={(e) =>
                          setAppearanceForm((s) => ({
                            ...s,
                            logoAltText: e.target.value,
                          }))
                        }
                        placeholder="Alt text"
                        className="bg-background border-border"
                      />
                    </div>
                  </div>
                </Row>
                <Separator />
                <Row
                  title="Public dashboard options"
                  description="Chart layout and cookie banner (coming soon)."
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Card className="border-dashed p-4 opacity-60">
                      <p className="text-sm font-medium">Dashboard charts</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Not configured in API yet. Store under settings preferences in a
                        future release.
                      </p>
                    </Card>
                    <Card className="border-dashed p-4 opacity-60">
                      <p className="text-sm font-medium">Cookie banner</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Requires product spec and persisted fields.
                      </p>
                    </Card>
                  </div>
                </Row>
              </div>
              <div
                className="flex justify-end gap-2 border-t border-border px-6 py-4"
                data-tour="settings-panel-actions"
              >
                <Button type="button" variant="cancel" onClick={resetAppearance}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="success"
                  onClick={() => saveAppearanceMut.mutate()}
                  disabled={saveAppearanceMut.isPending}
                >
                  Save changes
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'regional' && (
            <div className={PANEL_CLASS} data-tour="settings-active-panel">
              <div className="px-6 pt-6">
                <h2 className="text-lg font-medium">Regional &amp; preferences</h2>
                <p className="text-sm text-muted-foreground">
                  Language, timezone, notifications, UI defaults, and geofence defaults.
                </p>
              </div>
              <Separator className="mt-4" />
              <div className="px-6">
                <Row title="Regional" description="Localisation for dates, time, and currency.">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="lang">Language</Label>
                      <Input
                        id="lang"
                        value={regionalForm.language}
                        onChange={(e) =>
                          setRegionalForm((s) => ({ ...s, language: e.target.value }))
                        }
                        placeholder="en-ZA"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tz">Timezone</Label>
                      <Input
                        id="tz"
                        value={regionalForm.timezone}
                        onChange={(e) =>
                          setRegionalForm((s) => ({ ...s, timezone: e.target.value }))
                        }
                        placeholder="Africa/Johannesburg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cur">Currency</Label>
                      <Input
                        id="cur"
                        value={regionalForm.currency}
                        onChange={(e) =>
                          setRegionalForm((s) => ({ ...s, currency: e.target.value }))
                        }
                        placeholder="ZAR"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="df">Date format</Label>
                      <Input
                        id="df"
                        value={regionalForm.dateFormat}
                        onChange={(e) =>
                          setRegionalForm((s) => ({ ...s, dateFormat: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tf">Time format</Label>
                      <Input
                        id="tf"
                        value={regionalForm.timeFormat}
                        onChange={(e) =>
                          setRegionalForm((s) => ({ ...s, timeFormat: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </Row>
                <Separator />
                <Row title="Notifications" description="Channels for org-wide alerts.">
                  <div className="flex flex-wrap gap-4">
                    {(
                      [
                        ['notifEmail', 'Email'],
                        ['notifSms', 'SMS'],
                        ['notifPush', 'Push'],
                        ['notifWhatsapp', 'WhatsApp'],
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
                <Row title="Preferences" description="Default UI behaviour.">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Theme</Label>
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
                          {THEME_SELECT_OPTIONS.map(({ value, label, Icon }) => (
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
                      <Label htmlFor="dv">Default view</Label>
                      <Input
                        id="dv"
                        value={regionalForm.defaultView}
                        onChange={(e) =>
                          setRegionalForm((s) => ({
                            ...s,
                            defaultView: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ipp">Items per page</Label>
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
                      Menu collapsed by default
                    </label>
                  </div>
                </Row>
                <Separator />
                <Row title="Tasks &amp; feedback" description="Operational toggles.">
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
                      Send task notifications
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
                      Create follow-up task when a lead is created
                    </label>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Task deadline reminders</p>
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
                        24 hours before deadline
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
                        1 hour before deadline
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
                        15 minutes before deadline
                      </label>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ft">Feedback token expiry (days)</Label>
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
                      />
                    </div>
                  </div>
                </Row>
                <Separator />
                <Row title="Geofence defaults" description="Check-in radius behaviour.">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="gdef">Default radius (m)</Label>
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
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gmax">Max radius (m)</Label>
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
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gmin">Min radius (m)</Label>
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
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gtype">Default notification type</Label>
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
                      Geofence enabled by default for new resources
                    </label>
                  </div>
                </Row>
                <Separator />
                <Collapsible className="rounded-md border border-border bg-gray-50/50 px-3 py-2">
                  <CollapsibleTrigger className="flex w-full items-center justify-between text-left text-sm font-medium text-foreground outline-none">
                    <span>Contact &amp; address (settings JSON)</span>
                    <ChevronDown className="size-4 shrink-0 opacity-70" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="s-contact-email">Contact email</Label>
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
                          className="border-border bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s-phone-code">Phone country code</Label>
                        <Input
                          id="s-phone-code"
                          value={regionalForm.contactPhoneCode}
                          onChange={(e) =>
                            setRegionalForm((s) => ({
                              ...s,
                              contactPhoneCode: e.target.value,
                            }))
                          }
                          placeholder="+27"
                          className="border-border bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s-phone-num">Phone number</Label>
                        <Input
                          id="s-phone-num"
                          value={regionalForm.contactPhoneNumber}
                          onChange={(e) =>
                            setRegionalForm((s) => ({
                              ...s,
                              contactPhoneNumber: e.target.value,
                            }))
                          }
                          className="border-border bg-background"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="s-contact-web">Website</Label>
                        <Input
                          id="s-contact-web"
                          value={regionalForm.contactWebsite}
                          onChange={(e) =>
                            setRegionalForm((s) => ({
                              ...s,
                              contactWebsite: e.target.value,
                            }))
                          }
                          className="border-border bg-background"
                        />
                      </div>
                      {(
                        [
                          ['contactAddrStreet', 'Street'],
                          ['contactAddrSuburb', 'Suburb'],
                          ['contactAddrCity', 'City'],
                          ['contactAddrState', 'State'],
                          ['contactAddrCountry', 'Country'],
                          ['contactAddrPostal', 'Postal code'],
                        ] as const
                      ).map(([key, label]) => (
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
                            className="border-border bg-background"
                          />
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible className="mt-3 rounded-md border border-border bg-gray-50/50 px-3 py-2">
                  <CollapsibleTrigger className="flex w-full items-center justify-between text-left text-sm font-medium text-foreground outline-none">
                    <span>Branding (settings JSON, separate from Appearance tab)</span>
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
                          ['brandingLogo', 'Logo URL'],
                          ['brandingLogoAlt', 'Logo alt text'],
                          ['brandingFavicon', 'Favicon URL'],
                          ['brandingPrimary', 'Primary colour (hex)'],
                          ['brandingSecondary', 'Secondary colour (hex)'],
                          ['brandingAccent', 'Accent colour (hex)'],
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
                            className="border-border bg-background"
                          />
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible className="mt-3 rounded-md border border-border bg-gray-50/50 px-3 py-2">
                  <CollapsibleTrigger className="flex w-full items-center justify-between text-left text-sm font-medium text-foreground outline-none">
                    <span>Business profile</span>
                    <ChevronDown className="size-4 shrink-0 opacity-70" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="s-bus-name">Legal name</Label>
                        <Input
                          id="s-bus-name"
                          value={regionalForm.businessName}
                          onChange={(e) =>
                            setRegionalForm((s) => ({
                              ...s,
                              businessName: e.target.value,
                            }))
                          }
                          className="border-border bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s-bus-reg">Registration number</Label>
                        <Input
                          id="s-bus-reg"
                          value={regionalForm.businessReg}
                          onChange={(e) =>
                            setRegionalForm((s) => ({
                              ...s,
                              businessReg: e.target.value,
                            }))
                          }
                          className="border-border bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s-bus-tax">Tax / VAT ID</Label>
                        <Input
                          id="s-bus-tax"
                          value={regionalForm.businessTaxId}
                          onChange={(e) =>
                            setRegionalForm((s) => ({
                              ...s,
                              businessTaxId: e.target.value,
                            }))
                          }
                          className="border-border bg-background"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="s-bus-ind">Industry</Label>
                        <Input
                          id="s-bus-ind"
                          value={regionalForm.businessIndustry}
                          onChange={(e) =>
                            setRegionalForm((s) => ({
                              ...s,
                              businessIndustry: e.target.value,
                            }))
                          }
                          className="border-border bg-background"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Organisation size</Label>
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
                            <SelectValue placeholder="Not set" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Not set</SelectItem>
                            <SelectItem value="small">Small</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="large">Large</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible className="mt-3 rounded-md border border-border bg-gray-50/50 px-3 py-2">
                  <CollapsibleTrigger className="flex w-full items-center justify-between text-left text-sm font-medium text-foreground outline-none">
                    <span>Social links &amp; performance targets</span>
                    <ChevronDown className="size-4 shrink-0 opacity-70" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(
                        [
                          ['socialFacebook', 'Facebook URL'],
                          ['socialTwitter', 'Twitter / X URL'],
                          ['socialInstagram', 'Instagram URL'],
                          ['socialLinkedin', 'LinkedIn URL'],
                          ['socialYoutube', 'YouTube URL'],
                          ['socialWebsite', 'Website URL'],
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
                            className="border-border bg-background"
                          />
                        </div>
                      ))}
                      <div className="space-y-2 sm:col-span-2 border-t border-border pt-3">
                        <p className="text-xs font-medium text-muted-foreground">
                          Revenue targets (optional numbers)
                        </p>
                      </div>
                      {(
                        [
                          ['perfDaily', 'Daily target'],
                          ['perfWeekly', 'Weekly target'],
                          ['perfMonthly', 'Monthly target'],
                          ['perfYearly', 'Yearly target'],
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
                            className="border-border bg-background"
                          />
                        </div>
                      ))}
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Target calculation</Label>
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
                            <SelectValue placeholder="Not set" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Not set</SelectItem>
                            <SelectItem value="fixed">Fixed</SelectItem>
                            <SelectItem value="dynamic">Dynamic</SelectItem>
                            <SelectItem value="historical">Historical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s-perf-hist">Historical period (days)</Label>
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
                          className="border-border bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s-perf-gr">Growth target (%)</Label>
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
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="success"
                  onClick={() => saveSettingsMut.mutate()}
                  disabled={saveSettingsMut.isPending}
                >
                  Save changes
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'hours' && (
            <div className={PANEL_CLASS} data-tour="settings-active-panel">
              <div className="px-6 pt-6">
                <h2 className="text-lg font-medium">Operating hours</h2>
                <p className="text-sm text-muted-foreground">
                  Default schedule and holiday mode for the organisation.
                </p>
              </div>
              <Separator className="mt-4" />
              <div className="px-6">
                <Row title="Default times" description="Fallback open/close when using weekly flags.">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="ot">Open</Label>
                      <Input
                        id="ot"
                        value={hoursForm.openTime}
                        onChange={(e) =>
                          setHoursForm((s) => ({ ...s, openTime: e.target.value }))
                        }
                        placeholder="07:00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ct">Close</Label>
                      <Input
                        id="ct"
                        value={hoursForm.closeTime}
                        onChange={(e) =>
                          setHoursForm((s) => ({ ...s, closeTime: e.target.value }))
                        }
                        placeholder="16:30"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="htz">Timezone</Label>
                      <Input
                        id="htz"
                        value={hoursForm.timezone}
                        onChange={(e) =>
                          setHoursForm((s) => ({ ...s, timezone: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </Row>
                <Separator />
                <Row title="Working days" description="Toggle standard working days.">
                  <div className="flex flex-wrap gap-3">
                    {WEEKDAYS.map(({ key, label }) => (
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
                        {label}
                      </label>
                    ))}
                  </div>
                </Row>
                <Separator />
                <Row title="Holiday mode" description="Temporarily mark the org as closed.">
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={hoursForm.holidayMode}
                        onChange={(e) =>
                          setHoursForm((s) => ({ ...s, holidayMode: e.target.checked }))
                        }
                      />
                      Holiday mode active
                    </label>
                    <div className="space-y-2">
                      <Label htmlFor="hu">Until (local)</Label>
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
                    <span>Detailed weekly schedule</span>
                    <ChevronDown className="size-4 shrink-0 transition-transform" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-2">
                    <p className="text-sm text-muted-foreground">
                      Per-day open and close times (HH:mm). Used when you need different hours per weekday.
                    </p>
                    <div className="space-y-3">
                      {WEEKDAYS.map(({ key, label }) => (
                        <div
                          key={key}
                          className="grid gap-3 rounded-md border border-gray-100 p-3 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end"
                        >
                          <div className="text-sm font-medium text-foreground">{label}</div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Open</Label>
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
                              placeholder="07:00"
                              className="font-mono text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Close</Label>
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
                              placeholder="16:30"
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
                            Closed
                          </label>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
                <Separator />
                <Row
                  title="Special hours"
                  description="Exceptions for public holidays or one-off closures (date in YYYY-MM-DD)."
                >
                  <div className="space-y-3">
                    {hoursForm.specialHours.map((row, idx) => (
                      <div
                        key={idx}
                        className="grid gap-3 rounded-md border border-gray-100 p-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]"
                      >
                        <div className="space-y-1">
                          <Label className="text-xs">Date</Label>
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
                          <Label className="text-xs">Open</Label>
                          <Input
                            value={row.openTime}
                            onChange={(e) =>
                              setHoursForm((s) => {
                                const next = [...s.specialHours];
                                next[idx] = { ...next[idx], openTime: e.target.value };
                                return { ...s, specialHours: next };
                              })
                            }
                            placeholder="09:00"
                            className="font-mono text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Close</Label>
                          <Input
                            value={row.closeTime}
                            onChange={(e) =>
                              setHoursForm((s) => {
                                const next = [...s.specialHours];
                                next[idx] = { ...next[idx], closeTime: e.target.value };
                                return { ...s, specialHours: next };
                              })
                            }
                            placeholder="17:00"
                            className="font-mono text-sm"
                          />
                        </div>
                        <div className="space-y-1 md:col-span-1">
                          <Label className="text-xs">Reason (optional)</Label>
                          <Input
                            value={row.reason}
                            onChange={(e) =>
                              setHoursForm((s) => {
                                const next = [...s.specialHours];
                                next[idx] = { ...next[idx], reason: e.target.value };
                                return { ...s, specialHours: next };
                              })
                            }
                          />
                        </div>
                        <div className="flex items-end justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            aria-label="Remove row"
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
                      Add special hours row
                    </Button>
                  </div>
                </Row>
              </div>
              <div
                className="flex justify-end gap-2 border-t border-border px-6 py-4"
                data-tour="settings-panel-actions"
              >
                <Button type="button" variant="cancel" onClick={resetHours}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="success"
                  onClick={() => saveHoursMut.mutate()}
                  disabled={saveHoursMut.isPending}
                >
                  Save changes
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'branches' && (
            <>
            <div className={PANEL_CLASS} data-tour="settings-active-panel">
              <div className="flex flex-col gap-3 px-6 pt-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-medium">Branches</h2>
                  <p className="text-sm text-muted-foreground">
                    Select a branch to edit contact details and address.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="default"
                  className="shrink-0 gap-2 bg-purple-600 text-white hover:bg-purple-700 [&_svg]:text-white"
                  onClick={openAddBranchDialog}
                >
                  <Plus className="size-4" />
                  Add branch
                </Button>
              </div>
              <Separator className="mt-4" />
              <div className="px-6">
                <Row title="Branch" description="Search and choose a location to update.">
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
                            ? 'No branches'
                            : 'Select branch…'}
                        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[min(100vw-2rem,36rem)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search branches…" />
                        <CommandList>
                          <CommandEmpty>No branch found.</CommandEmpty>
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
                  <h3 className="text-lg font-medium text-foreground mb-4">Details</h3>
                  <p className="text-sm text-muted-foreground mb-4 -mt-2">
                    Naming and contacts for the selected branch.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="br-name">Name</Label>
                      <Input
                        id="br-name"
                        value={branchForm.name}
                        onChange={(e) =>
                          setBranchFormUser((s) => ({ ...s, name: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="br-alias">Alias</Label>
                      <Input
                        id="br-alias"
                        value={branchForm.alias}
                        onChange={(e) =>
                          setBranchFormUser((s) => ({ ...s, alias: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="br-email">Email</Label>
                      <Input
                        id="br-email"
                        type="email"
                        value={branchForm.email}
                        onChange={(e) =>
                          setBranchFormUser((s) => ({ ...s, email: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="br-phone">Phone</Label>
                      <Input
                        id="br-phone"
                        value={branchForm.phone}
                        onChange={(e) =>
                          setBranchFormUser((s) => ({ ...s, phone: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="br-cp">Contact person</Label>
                      <Input
                        id="br-cp"
                        value={branchForm.contactPerson}
                        onChange={(e) =>
                          setBranchFormUser((s) => ({
                            ...s,
                            contactPerson: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="br-web">Website</Label>
                      <Input
                        id="br-web"
                        value={branchForm.website}
                        onChange={(e) =>
                          setBranchFormUser((s) => ({ ...s, website: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
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
                      <Label htmlFor="br-country">Country code</Label>
                      <Input
                        id="br-country"
                        value={branchForm.country}
                        onChange={(e) =>
                          setBranchFormUser((s) => ({ ...s, country: e.target.value }))
                        }
                        placeholder="SA"
                      />
                    </div>
                  </div>
                </section>
                <Separator />
                <section className="py-2">
                  <h3 className="text-lg font-medium text-foreground mb-4">Address</h3>
                  <p className="text-sm text-muted-foreground mb-4 -mt-2">
                    Branch location on maps and documents.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        ['street', 'Street', branchForm.street],
                        ['suburb', 'Suburb', branchForm.suburb],
                        ['city', 'City', branchForm.city],
                        ['state', 'State', branchForm.state],
                        ['addrCountry', 'Country', branchForm.addrCountry],
                        ['postalCode', 'Postal code', branchForm.postalCode],
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
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="success"
                  onClick={() => saveBranchMut.mutate()}
                  disabled={!branchRef || saveBranchMut.isPending}
                >
                  Save changes
                </Button>
              </div>
            </div>

            <Dialog open={addBranchOpen} onOpenChange={setAddBranchOpen}>
              <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add branch</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 py-2 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="new-br-ref">Reference (unique)</Label>
                    <Input
                      id="new-br-ref"
                      value={createBranchForm.ref}
                      onChange={(e) =>
                        setCreateBranchForm((s) => ({ ...s, ref: e.target.value }))
                      }
                      placeholder="Auto-generated if unchanged"
                      className={cn(CREATE_BRANCH_INPUT_CLASS, 'font-mono')}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="new-br-name">Name</Label>
                    <Input
                      id="new-br-name"
                      value={createBranchForm.name}
                      onChange={(e) =>
                        setCreateBranchForm((s) => ({ ...s, name: e.target.value }))
                      }
                      placeholder="e.g. Sandton Branch"
                      className={CREATE_BRANCH_INPUT_CLASS}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-br-alias">Alias (optional)</Label>
                    <Input
                      id="new-br-alias"
                      value={createBranchForm.alias}
                      onChange={(e) =>
                        setCreateBranchForm((s) => ({ ...s, alias: e.target.value }))
                      }
                      placeholder="Short name (optional)"
                      className={CREATE_BRANCH_INPUT_CLASS}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-br-email">Email</Label>
                    <Input
                      id="new-br-email"
                      type="email"
                      value={createBranchForm.email}
                      onChange={(e) =>
                        setCreateBranchForm((s) => ({ ...s, email: e.target.value }))
                      }
                      placeholder="branch@company.co.za"
                      className={CREATE_BRANCH_INPUT_CLASS}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-br-phone">Phone</Label>
                    <Input
                      id="new-br-phone"
                      value={createBranchForm.phone}
                      onChange={(e) =>
                        setCreateBranchForm((s) => ({ ...s, phone: e.target.value }))
                      }
                      placeholder="0712345678"
                      className={CREATE_BRANCH_INPUT_CLASS}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="new-br-cp">Contact person</Label>
                    <Input
                      id="new-br-cp"
                      value={createBranchForm.contactPerson}
                      onChange={(e) =>
                        setCreateBranchForm((s) => ({
                          ...s,
                          contactPerson: e.target.value,
                        }))
                      }
                      placeholder="Full name"
                      className={CREATE_BRANCH_INPUT_CLASS}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="new-br-web">Website</Label>
                    <Input
                      id="new-br-web"
                      value={createBranchForm.website}
                      onChange={(e) =>
                        setCreateBranchForm((s) => ({ ...s, website: e.target.value }))
                      }
                      placeholder="https://www.company.co.za"
                      className={CREATE_BRANCH_INPUT_CLASS}
                    />
                  </div>
                  {(
                    [
                      ['street', 'Street', createBranchForm.street, 'e.g. 123 Main Street'],
                      ['suburb', 'Suburb', createBranchForm.suburb, 'e.g. Sandton'],
                      ['city', 'City', createBranchForm.city, 'e.g. Johannesburg'],
                      ['state', 'State', createBranchForm.state, 'e.g. Gauteng'],
                      ['country', 'Country', createBranchForm.country, 'e.g. South Africa'],
                      [
                        'postalCode',
                        'Postal code (4 digits, ZA)',
                        createBranchForm.postalCode,
                        'e.g. 2196',
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
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="bg-purple-600 text-white hover:bg-purple-700"
                    onClick={() => createBranchMut.mutate()}
                    disabled={createBranchMut.isPending}
                  >
                    Create branch
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </>
          )}

          {activeTab === 'calendar' && (
            <CalendarIntegrationsSection />
          )}

          {activeTab === 'notices' && (
            <OrganisationNoticesSection />
          )}
        </>
      )}
    </div>
  );
}

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
import { getBranches, patchBranch } from '@/api/endpoints/branch';
import type {
  OrganisationHoursRecord,
  OrganisationHoursWeeklySchedule,
} from '@/api/types/organisation';
import type { BranchListItem } from '@/api/types/branch';
import type { WeekdayKey } from './settings-types';
import {
  BRANCHES_LIST_QUERY_KEY,
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
  Palette,
  Plus,
  Trash2,
  User,
} from 'lucide-react';

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

/** GeneralStatus string values (matches server enum). */
const ORG_STATUS_OPTIONS = [
  'active',
  'inactive',
  'deleted',
  'banned',
  'deactivated',
  'expired',
  'pending',
  'rejected',
  'approved',
  'converted',
] as const;

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

type SettingsTab = 'profile' | 'appearance' | 'regional' | 'hours' | 'branches';

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
    street: b.address?.street ?? '',
    suburb: b.address?.suburb ?? '',
    city: b.address?.city ?? '',
    state: b.address?.state ?? '',
    addrCountry: b.address?.country ?? '',
    postalCode: b.address?.postalCode ?? '',
  };
}

const PANEL_CLASS = 'rounded border border-gray-200 bg-white';

export function SettingsContent() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const { backendUserData } = useSessionSync();
  const { isTokenReady } = useTokenReady();
  const orgRef = backendUserData?.organisationRef ?? '';
  const enabled = Boolean(orgRef) && isTokenReady;
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);

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
    setProfileForm({
      name: o.name ?? '',
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
  }, [profileQuery.data?.organisation]);

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
    feedbackTokenExpiryDays: 30,
    geofenceDefaultRadius: 500,
    geofenceEnabledByDefault: false,
    geofenceDefaultNotificationType: 'NOTIFY',
    geofenceMaxRadius: 5000,
    geofenceMinRadius: 100,
  });

  useEffect(() => {
    const s = settingsQuery.data?.settings;
    if (!s) return;
    const r = s.regional;
    const n = s.notifications;
    const p = s.preferences;
    setRegionalForm({
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
      feedbackTokenExpiryDays: s.feedbackTokenExpiryDays ?? 30,
      geofenceDefaultRadius: s.geofenceDefaultRadius ?? 500,
      geofenceEnabledByDefault: s.geofenceEnabledByDefault ?? false,
      geofenceDefaultNotificationType: s.geofenceDefaultNotificationType ?? 'NOTIFY',
      geofenceMaxRadius: s.geofenceMaxRadius ?? 5000,
      geofenceMinRadius: s.geofenceMinRadius ?? 100,
    });
  }, [settingsQuery.data?.settings]);

  const buildSettingsPayload = useCallback(
    () => ({
      regional: {
        language: regionalForm.language || undefined,
        timezone: regionalForm.timezone || undefined,
        currency: regionalForm.currency || undefined,
        dateFormat: regionalForm.dateFormat || undefined,
        timeFormat: regionalForm.timeFormat || undefined,
      },
      notifications: {
        email: regionalForm.notifEmail,
        sms: regionalForm.notifSms,
        push: regionalForm.notifPush,
        whatsapp: regionalForm.notifWhatsapp,
      },
      preferences: {
        theme: regionalForm.theme,
        defaultView: regionalForm.defaultView || undefined,
        itemsPerPage: regionalForm.itemsPerPage,
        menuCollapsed: regionalForm.menuCollapsed,
      },
      sendTaskNotifications: regionalForm.sendTaskNotifications,
      feedbackTokenExpiryDays: regionalForm.feedbackTokenExpiryDays,
      geofenceDefaultRadius: regionalForm.geofenceDefaultRadius,
      geofenceEnabledByDefault: regionalForm.geofenceEnabledByDefault,
      geofenceDefaultNotificationType: regionalForm.geofenceDefaultNotificationType,
      geofenceMaxRadius: regionalForm.geofenceMaxRadius,
      geofenceMinRadius: regionalForm.geofenceMinRadius,
    }),
    [regionalForm]
  );

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

  useEffect(() => {
    const first = branches.find((b) => b.ref)?.ref ?? '';
    if (first && !branchRef) setBranchRef(first);
  }, [branches, branchRef]);

  useEffect(() => {
    const b = branches.find((x) => x.ref === branchRef) as BranchListItem | undefined;
    if (!b?.ref) return;
    setBranchForm(branchListItemToForm(b));
  }, [branchRef, branches]);

  const saveBranchMut = useMutation({
    mutationFn: async () =>
      patchBranch(client, branchRef, {
        name: branchForm.name,
        alias: branchForm.alias || undefined,
        email: branchForm.email,
        phone: branchForm.phone,
        contactPerson: branchForm.contactPerson,
        website: branchForm.website,
        status: branchForm.status,
        country: branchForm.country,
        address: {
          street: branchForm.street,
          suburb: branchForm.suburb,
          city: branchForm.city,
          state: branchForm.state,
          country: branchForm.addrCountry,
          postalCode: branchForm.postalCode,
        },
      }),
    onSuccess: () => {
      toast.success('Branch saved');
      queryClient.invalidateQueries({ queryKey: settingsOrgBranchesKey(orgRef) });
      queryClient.invalidateQueries({ queryKey: BRANCHES_LIST_QUERY_KEY });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to save'),
  });

  const resetProfile = useCallback(() => {
    const o = profileQuery.data?.organisation;
    if (!o) return;
    setProfileForm({
      name: o.name ?? '',
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
  }, [profileQuery.data?.organisation]);

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
    const r = s.regional;
    const n = s.notifications;
    const p = s.preferences;
    setRegionalForm({
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
      feedbackTokenExpiryDays: s.feedbackTokenExpiryDays ?? 30,
      geofenceDefaultRadius: s.geofenceDefaultRadius ?? 500,
      geofenceEnabledByDefault: s.geofenceEnabledByDefault ?? false,
      geofenceDefaultNotificationType: s.geofenceDefaultNotificationType ?? 'NOTIFY',
      geofenceMaxRadius: s.geofenceMaxRadius ?? 5000,
      geofenceMinRadius: s.geofenceMinRadius ?? 100,
    });
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
    const res = await branchesQuery.refetch();
    const list = res.data?.branches ?? branchesQuery.data?.branches ?? [];
    const b = list.find((x) => x.ref === branchRef);
    if (b?.ref) setBranchForm(branchListItemToForm(b));
  }, [branchRef, branchesQuery]);

  const loading =
    !enabled ||
    profileQuery.isLoading ||
    appearanceQuery.isLoading ||
    settingsQuery.isLoading ||
    hoursQuery.isLoading ||
    branchesQuery.isLoading;

  const profileOrg = profileQuery.data?.organisation;

  const branchTabs = branches.filter((b) => b.ref);
  const selectedBranch = branchTabs.find((b) => b.ref === branchRef);

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
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage organisation profile, appearance, regional defaults, hours, and branches.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
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
          </div>

          {activeTab === 'profile' && (
            <div className={PANEL_CLASS}>
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
                    <SelectTrigger id="org-status" className="max-w-xs bg-white border-gray-200">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORG_STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
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
                        className="bg-white border-gray-200"
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
                        className="bg-white border-gray-200"
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
                        className="bg-white border-gray-200"
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
              <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
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
            <div className={PANEL_CLASS}>
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
                        className="bg-white border-gray-200"
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
              <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
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
            <div className={PANEL_CLASS}>
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
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
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
                      <Input
                        id="gtype"
                        value={regionalForm.geofenceDefaultNotificationType}
                        onChange={(e) =>
                          setRegionalForm((s) => ({
                            ...s,
                            geofenceDefaultNotificationType: e.target.value,
                          }))
                        }
                      />
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
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
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
            <div className={PANEL_CLASS}>
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
                            : 'border-gray-200'
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
                <Collapsible defaultOpen className="space-y-3">
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border border-gray-200 bg-muted/30 px-4 py-3 text-left text-sm font-medium hover:bg-muted/50 [&[data-state=open]>svg]:rotate-180">
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
                      className="gap-2 bg-white"
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
              <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
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
            <div className={PANEL_CLASS}>
              <div className="px-6 pt-6">
                <h2 className="text-lg font-medium">Branches</h2>
                <p className="text-sm text-muted-foreground">
                  Select a branch to edit contact details and address.
                </p>
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
                        className="h-10 w-full max-w-xl justify-between bg-white border-gray-200 font-normal"
                        disabled={branchTabs.length === 0}
                      >
                        {selectedBranch
                          ? (selectedBranch.name ?? selectedBranch.ref)
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
                                value={`${b.name ?? ''} ${b.ref ?? ''} ${b.email ?? ''}`}
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
                                  {b.name ?? b.ref}
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
                          setBranchForm((s) => ({ ...s, name: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="br-alias">Alias</Label>
                      <Input
                        id="br-alias"
                        value={branchForm.alias}
                        onChange={(e) =>
                          setBranchForm((s) => ({ ...s, alias: e.target.value }))
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
                          setBranchForm((s) => ({ ...s, email: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="br-phone">Phone</Label>
                      <Input
                        id="br-phone"
                        value={branchForm.phone}
                        onChange={(e) =>
                          setBranchForm((s) => ({ ...s, phone: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="br-cp">Contact person</Label>
                      <Input
                        id="br-cp"
                        value={branchForm.contactPerson}
                        onChange={(e) =>
                          setBranchForm((s) => ({
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
                          setBranchForm((s) => ({ ...s, website: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={branchForm.status}
                        onValueChange={(v) =>
                          setBranchForm((s) => ({ ...s, status: v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="br-country">Country code</Label>
                      <Input
                        id="br-country"
                        value={branchForm.country}
                        onChange={(e) =>
                          setBranchForm((s) => ({ ...s, country: e.target.value }))
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
                            setBranchForm((s) => ({
                              ...s,
                              [key]: e.target.value,
                            }))
                          }
                          className="bg-white border-gray-200"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
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
          )}
        </>
      )}
    </div>
  );
}

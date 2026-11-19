'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import {
  useUser,
  usePatchUser,
  useDeleteUser,
  useRestoreUser,
  useDeleteUserPermanently,
  useBranches,
  useAllUsers,
  useClients,
  useSalesAssignedClients,
  useSessionSync,
  useProvisionUserMutation,
  useReInviteUserMutation,
  getBranchDisplayLabel,
} from '@/api/hooks';
import type { UserListItem, UserResponse } from '@/api/endpoints/user';
import type { BranchListItem } from '@/api/types/branch';
import type { ClientListItem } from '@/api/types/clients';
import { Loader2Icon, ChevronLeftIcon, ChevronDownIcon, MapPinIcon } from '@/lib/icons';
import { CalendarDays } from 'lucide-react';
import { CallTargetSplitDialog } from '@/components/staff/call-target-split-dialog';
import { FuelAllowanceReadout } from './fuel-allowance-readout';
import {
  Check,
  CheckCircle,
  XCircle,
  PauseCircle,
  User,
  Shield,
  Crown,
  UserCheck,
  Briefcase,
  ChevronsUpDown,
  Mail,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePickerField } from '@/components/ui/date-picker-field';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CollapsibleFormSection } from '@/components/collapsible-form-section';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { AccessLevel, WorkforceType } from '@/api/types';
import { cn } from '@/lib/utils';
import { canManageStaffUsers } from '@/lib/access';
import {
  getStaffInheritedFromBranches,
  pruneStaffCoveredByBranches,
} from '@/lib/user-form/managed-staff';
import { PlanClientVisitsDialog } from './plan-client-visits-dialog';
import { ActiveVisitSchedules } from './active-visit-schedules';
import { UserWarningsCard } from './user-warnings-card';
import { PerformanceWarningsCard } from './performance-warnings-card';
import { PolicyAgreementForm } from '@/app/reports/components/policy-agreement-form';
import { PrimaryVehicleSection } from './primary-vehicle-section';
import { PersonnelDetailsCard } from './personnel-details-card';
import { JobInformationCard } from './job-information-card';
import { ApprovableTypesPicker } from '@/components/approvable-types-picker';
import {
  CURRENCY_OPTIONS,
  TARGET_PERIOD_OPTIONS,
  targetFormSchema,
  userFormSchema,
  buildPatchBody,
  buildUserTargetPatchBody,
  getDefaultTargetValues,
  parseFormDateInput,
  preserveAssignedVehicleUids,
  normalizePrimaryBranchUid,
  getEmptyEmploymentProfile,
  getEmptyPersonnelProfile,
  mapEmploymentFromApi,
  mapProfileFromApi,
  savedFieldPlaceholder,
  type TargetFormValues,
  type UserFormValues,
} from '@/lib/user-form';

function userSettingsMatchesSearch(haystack: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystack.toLowerCase().includes(q);
}

function getClientSearchHaystack(c: ClientListItem): string {
  const r = c as Record<string, unknown>;
  const str = (k: string) => (typeof r[k] === 'string' ? (r[k] as string) : '');
  return [
    c.name,
    c.email,
    c.contactPerson,
    String(c.uid),
    str('erpClientCode'),
    str('clientCode'),
    str('code'),
  ]
    .filter((x) => x != null && String(x).trim() !== '')
    .join(' ');
}

function getBranchSearchHaystack(b: BranchListItem): string {
  const addr = b.address;
  return [
    getBranchDisplayLabel(b),
    String(b.uid),
    b.ref,
    b.name,
    b.alias ?? '',
    b.email,
    b.contactPerson,
    addr?.city,
    addr?.suburb,
  ]
    .filter((x) => x != null && String(x).trim() !== '')
    .join(' ');
}

function getStaffSearchHaystack(u: UserListItem): string {
  const full = `${u.name} ${u.surname}`.trim();
  return [full, u.name, u.surname, u.email, String(u.uid)]
    .filter((x) => x != null && String(x).trim() !== '')
    .join(' ');
}

/** Icons for user status options in the form. */
const USER_STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  active: CheckCircle,
  inactive: XCircle,
  suspended: PauseCircle,
};

/** Icons for access level / role options (same enum list); fallback to User. */
const ACCESS_LEVEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  owner: Crown,
  admin: Shield,
  manager: UserCheck,
  supervisor: UserCheck,
  member: User,
  user: User,
  developer: Briefcase,
  support: UserCheck,
  analyst: Briefcase,
  accountant: Briefcase,
  auditor: Briefcase,
  consultant: Briefcase,
  coordinator: UserCheck,
  specialist: User,
  technician: User,
  trainer: User,
  researcher: User,
  officer: User,
  executive: Crown,
  cashier: User,
  receptionist: User,
  secretary: User,
  security: Shield,
  cleaner: User,
  maintenance: User,
  'event planner': User,
  marketing: Briefcase,
  hr: User,
  client: User,
  finance: Briefcase,
  accounting: Briefcase,
  legal: Briefcase,
  operations: Briefcase,
  it: Briefcase,
  development: Briefcase,
  design: Briefcase,
};

function workforceTypeRowIcon(value: string): React.ComponentType<{ className?: string }> {
  if (value.includes('sales')) return Briefcase;
  if (value === WorkforceType.MANAGEMENT) return Crown;
  if (value === WorkforceType.SECURITY) return Shield;
  if (value === WorkforceType.FIELD_EMPLOYEE || value === WorkforceType.DRIVER) return MapPinIcon;
  return User;
}

const formSchema = userFormSchema;
type FormValues = UserFormValues;

function formValuesFromUser(user: UserResponse): FormValues {
  const profile = user.userProfile ?? null;
  const emp = user.userEmployeementProfile ?? null;
  const empEmail = typeof emp?.email === 'string' ? emp.email.trim() : '';
  const empContact = typeof emp?.contactNumber === 'string' ? emp.contactNumber.trim() : '';
  const primaryEmail = (user.email?.trim() || empEmail || '') as string;
  const primaryPhone = (user.phone?.trim() || empContact || null) as string | null;
  return {
    name: user.name ?? '',
    surname: user.surname ?? '',
    email: primaryEmail,
    phone: primaryPhone,
    pbxExtension: user.pbxExtension ?? null,
    userref: user.userref ?? null,
    hrID: user.hrID ?? null,
    role: (user.role as string) ?? '',
    status: (user.status as string) ?? 'active',
    accessLevel: (user.accessLevel as string) ?? '',
    workforceType: user.workforceType ?? '',
    departmentId: (user.departmentId as number) ?? null,
    branchUid: normalizePrimaryBranchUid(user.branch?.uid ?? user.branchUid ?? null),
    managedBranches: user.managedBranches ?? [],
    managedStaff: user.managedStaff ?? [],
    approvableTypes: Array.isArray(user.approvableTypes) ? user.approvableTypes : [],
    canAccessPerformanceTracking: user.canAccessPerformanceTracking === true,
    businesscardURL: user.businesscardURL ?? null,
    profile: mapProfileFromApi(profile, parseFormDateInput),
    employmentProfile: mapEmploymentFromApi(emp, parseFormDateInput),
    assignedClientIds: user.assignedClientIds ?? [],
  };
}

/** Format enum value for display (e.g. "event planner" -> "Event planner"). */
function formatEnumLabel(value: string): string {
  return value
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function UserSettingsPage() {
  const { t } = useTranslation('screens');
  const params = useParams();
  const router = useRouter();
  const ref = typeof params.ref === 'string' ? params.ref : null;
  const { backendUserData: sessionUser } = useSessionSync();
  // Use clerk ID or "me" when viewing own profile so server hits cache (guard already loaded by clerk ID)
  const effectiveRef =
    ref && sessionUser && (String(sessionUser.uid) === ref || sessionUser.clerkUserId === ref)
      ? (sessionUser.clerkUserId ?? 'me')
      : ref;
  const { data: user, isLoading: userLoading, error: userError } = useUser(effectiveRef, {
    includeDeleted: true,
    includeAssignedClients: false, // Settings page loads clients via useClients
  });
  const patchUser = usePatchUser(ref);
  const deleteUserMutation = useDeleteUser(ref);
  const restoreUserMutation = useRestoreUser(ref);
  const deletePermanentMutation = useDeleteUserPermanently(ref);
  const provisionUserMutation = useProvisionUserMutation();
  const reInviteUserMutation = useReInviteUserMutation();
  const { data: branches = [] } = useBranches({ enabled: !!ref });
  // All pages: a single page is capped at 100 by the server, which hid staff from the picker.
  const { data: users = [] } = useAllUsers({ enabled: !!ref });
  const { data: clients = [] } = useClients({ enabled: !!ref, limit: 100 });
  const { data: salesAssigned } = useSalesAssignedClients(ref ?? undefined, { enabled: !!ref });

  const [permanentConfirmText, setPermanentConfirmText] = useState('');
  const [softDeleteOpen, setSoftDeleteOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [permanentOpen, setPermanentOpen] = useState(false);

  const [primaryBranchOpen, setPrimaryBranchOpen] = useState(false);
  const [clientsPickerOpen, setClientsPickerOpen] = useState(false);
  const [clientsSearch, setClientsSearch] = useState('');
  const [planVisitsOpen, setPlanVisitsOpen] = useState(false);
  const [managedBranchesPickerOpen, setManagedBranchesPickerOpen] = useState(false);
  const [managedBranchesSearch, setManagedBranchesSearch] = useState('');
  const [managedStaffPickerOpen, setManagedStaffPickerOpen] = useState(false);
  const [managedStaffSearch, setManagedStaffSearch] = useState('');

  const clientLabelById = useMemo(() => {
    const map = new Map<number, { name: string; hasAddress: boolean }>();
    for (const client of salesAssigned?.clients ?? []) {
      map.set(client.uid, { name: client.name, hasAddress: client.hasAddress });
    }
    for (const client of clients) {
      if (map.has(client.uid)) continue;
      const address = client.address;
      const hasText = [address?.street, address?.suburb, address?.city].some(
        (part) => typeof part === 'string' && part.trim().length > 0
      );
      const latitude = Number(client.latitude);
      const longitude = Number(client.longitude);
      const hasCoordinates =
        Number.isFinite(latitude) && Number.isFinite(longitude) && !(latitude === 0 && longitude === 0);
      map.set(client.uid, {
        name: client.name?.trim() || 'Client',
        hasAddress: hasText || hasCoordinates,
      });
    }
    return map;
  }, [salesAssigned?.clients, clients]);

  const planningClients = useMemo(() => {
    const byId = new Map<
      number,
      {
        uid: number;
        name: string;
        hasAddress: boolean;
        latitude: number | null;
        longitude: number | null;
        email?: string | null;
        contactPerson?: string | null;
      }
    >();
    for (const client of salesAssigned?.clients ?? []) {
      byId.set(client.uid, {
        uid: client.uid,
        name: client.name,
        hasAddress: client.hasAddress,
        latitude: client.latitude,
        longitude: client.longitude,
      });
    }
    for (const client of clients) {
      const existing = byId.get(client.uid);
      const address = client.address;
      const hasText = [address?.street, address?.suburb, address?.city].some(
        (part) => typeof part === 'string' && part.trim().length > 0
      );
      const latitude = Number(client.latitude);
      const longitude = Number(client.longitude);
      const hasCoordinates =
        Number.isFinite(latitude) && Number.isFinite(longitude) && !(latitude === 0 && longitude === 0);
      byId.set(client.uid, {
        uid: client.uid,
        name: existing?.name || client.name?.trim() || 'Client',
        hasAddress: existing?.hasAddress || hasText || hasCoordinates,
        latitude: existing?.latitude ?? (hasCoordinates ? latitude : null),
        longitude: existing?.longitude ?? (hasCoordinates ? longitude : null),
        email: client.email,
        contactPerson: client.contactPerson,
      });
    }
    return [...byId.values()];
  }, [salesAssigned?.clients, clients]);

  const visitOrigin = useMemo(() => {
    const branch = user?.branch as { latitude?: number | null; longitude?: number | null } | undefined;
    const latitude = Number(branch?.latitude);
    const longitude = Number(branch?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || (latitude === 0 && longitude === 0)) {
      return null;
    }
    return { latitude, longitude };
  }, [user?.branch]);

  const filteredClientsForPicker = useMemo(
    () =>
      clients.filter((c) =>
        userSettingsMatchesSearch(getClientSearchHaystack(c), clientsSearch)
      ),
    [clients, clientsSearch]
  );

  const filteredBranchesForManagedPicker = useMemo(
    () =>
      branches.filter((b) =>
        userSettingsMatchesSearch(getBranchSearchHaystack(b), managedBranchesSearch)
      ),
    [branches, managedBranchesSearch]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      surname: '',
      email: '',
      phone: null,
      pbxExtension: null,
      userref: null,
      hrID: null,
      role: '',
      status: 'active',
      accessLevel: '',
      workforceType: '',
      departmentId: null,
      branchUid: null,
      managedBranches: [],
      managedStaff: [],
      approvableTypes: [],
      canAccessPerformanceTracking: false,
      businesscardURL: null,
      profile: getEmptyPersonnelProfile(),
      employmentProfile: getEmptyEmploymentProfile(),
      assignedClientIds: [],
    },
  });

  // Staff who join this user's team automatically via managed branches (mirrors the server).
  const watchedManagedBranches = form.watch('managedBranches');
  const inheritedStaff = useMemo(
    () => getStaffInheritedFromBranches(users, watchedManagedBranches, user?.uid),
    [users, watchedManagedBranches, user?.uid]
  );
  const inheritedStaffUids = useMemo(
    () => new Set(inheritedStaff.map((u) => u.uid)),
    [inheritedStaff]
  );

  // Picker only offers staff that are NOT already covered by a managed branch.
  const filteredStaffForPicker = useMemo(() => {
    const list = users.filter((u) => u.uid !== user?.uid && !inheritedStaffUids.has(u.uid));
    return list.filter((u) =>
      userSettingsMatchesSearch(getStaffSearchHaystack(u), managedStaffSearch)
    );
  }, [users, user?.uid, inheritedStaffUids, managedStaffSearch]);

  /** Set managed branches and drop explicit staff that the new branches already cover. */
  function handleManagedBranchesChange(next: number[]) {
    form.setValue('managedBranches', next, { shouldDirty: true });
    const nextInherited = getStaffInheritedFromBranches(users, next, user?.uid);
    const currentStaff = form.getValues('managedStaff') ?? [];
    const prunedStaff = pruneStaffCoveredByBranches(currentStaff, nextInherited);
    if (prunedStaff.length !== currentStaff.length) {
      form.setValue('managedStaff', prunedStaff, { shouldDirty: true });
    }
  }

  useEffect(() => {
    if (user) {
      form.reset(formValuesFromUser(user));
    }
  }, [user, form]);

  const targetForm = useForm<TargetFormValues>({
    resolver: zodResolver(targetFormSchema),
    defaultValues: getDefaultTargetValues(null),
  });
  const { dirtyFields: targetDirtyFields } = targetForm.formState;
  const lastHydratedTargetUid = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const ut = (user as { userTarget?: Record<string, unknown> | null })?.userTarget ?? null;
    const shouldHydrate =
      lastHydratedTargetUid.current !== user.uid || !targetForm.formState.isDirty;
    if (!shouldHydrate) return;
    const incoming = getDefaultTargetValues(ut);
    const next = preserveAssignedVehicleUids(incoming, targetForm.getValues(), {
      sameUser: lastHydratedTargetUid.current === user.uid,
    });
    targetForm.reset(next);
    lastHydratedTargetUid.current = user.uid;
  }, [user, targetForm]);

  const onSubmit = (values: FormValues) => {
    const body = buildPatchBody(user ?? undefined, values);
    const targetBaseline = getDefaultTargetValues(
      (user as { userTarget?: Record<string, unknown> | null })?.userTarget ?? null
    );
    const targetPayload = buildUserTargetPatchBody(
      targetBaseline,
      targetForm.getValues(),
      targetDirtyFields
    );
    if (targetPayload) {
      body.userTarget = targetPayload;
    }
    const hasUserChanges = Object.keys(body).some((k) => k !== 'userTarget');
    const hasTargetChanges = body.userTarget != null;
    const hasChanges = hasUserChanges || hasTargetChanges;
    if (!hasChanges) {
      toast.success(t('chrome.staff.settings.toasts.noChanges'));
      return;
    }
    patchUser.mutate(body, {
      onSuccess: (result) => {
        if (hasUserChanges && hasTargetChanges) {
          toast.success(t('chrome.staff.settings.toasts.userAndTargetsUpdated'));
        } else if (hasTargetChanges) {
          toast.success(t('chrome.staff.settings.toasts.targetsUpdated'));
        } else {
          toast.success(t('chrome.staff.settings.toasts.userUpdated'));
        }
        if (result.user) {
          form.reset(formValuesFromUser(result.user));
          const savedTarget = result.user.userTarget;
          if (savedTarget && typeof savedTarget === 'object') {
            const incoming = getDefaultTargetValues(savedTarget as Record<string, unknown>);
            const next = preserveAssignedVehicleUids(incoming, targetForm.getValues(), {
              sameUser: lastHydratedTargetUid.current === result.user.uid,
            });
            targetForm.reset(next);
            lastHydratedTargetUid.current = result.user.uid;
          }
        }
      },
      onError: (err: Error) => {
        toast.error(err.message || t('chrome.staff.settings.toasts.failedToUpdate'));
      },
    });
  };

  if (!ref) {
    return (
      <div className="h-full overflow-auto flex flex-col items-center justify-center px-4">
        <p className="text-muted-foreground">{t('chrome.staff.settings.invalidRef')}</p>
        <Link href="/staff" className="text-primary hover:underline mt-2 inline-block">
          {t('chrome.staff.settings.backToStaff')}
        </Link>
      </div>
    );
  }

  if (userLoading || !user) {
    return (
      <div className="h-full overflow-auto flex flex-col items-center justify-center px-4">
        {userError ? (
          <div>
            <p className="text-destructive">{userError.message}</p>
            <Link href="/staff" className="text-primary hover:underline mt-2 inline-block">
              {t('chrome.staff.settings.backToStaff')}
            </Link>
          </div>
        ) : (
          <Loader2Icon className="size-8 animate-spin text-primary" />
        )}
      </div>
    );
  }

  const accessLevels = Object.values(AccessLevel).filter(
    (v) => typeof v === 'string'
  ) as string[];
  const workforceTypeOptions = Object.values(WorkforceType).filter(
    (v) => typeof v === 'string'
  ) as string[];

  const canInviteOthers = canManageStaffUsers(sessionUser?.accessLevel);
  const isSelfProfile =
    sessionUser?.uid != null && user.uid != null && sessionUser.uid === user.uid;
  const hasClerkLink = Boolean(user.clerkUserId?.trim());
  const invitePending =
    provisionUserMutation.isPending || reInviteUserMutation.isPending;
  const userUid = user.uid;

  async function handleSendInvite() {
    try {
      if (hasClerkLink) {
        const res = await reInviteUserMutation.mutateAsync(userUid);
        toast.success(res.message);
      } else {
        const res = await provisionUserMutation.mutateAsync(userUid);
        toast.success(t('chrome.staff.settings.toasts.inviteSentTo', { email: res.user.email }));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('chrome.staff.settings.toasts.failedToSendInvite'));
    }
  }

  return (
    <div className="h-full overflow-auto flex flex-col items-center">
      <div className="max-w-4xl w-full mx-auto px-3 py-5 sm:px-4 sm:py-8">
        <Link
          href="/staff"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 sm:mb-6 sm:text-sm"
        >
          <ChevronLeftIcon className="size-4" />
          {t('chrome.staff.settings.backToStaff')}
        </Link>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
            {canInviteOthers && !isSelfProfile && (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Badge
                  className={cn(
                    'border-0 text-white',
                    hasClerkLink
                      ? 'bg-green-600 hover:bg-green-600'
                      : 'bg-red-600 hover:bg-red-600'
                  )}
                >
                  {hasClerkLink ? t('chrome.staff.settings.clerkLinked') : t('chrome.staff.settings.pendingSignIn')}
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  className="gap-2 bg-purple-600 text-white hover:bg-purple-700 [&_svg]:text-white"
                  disabled={invitePending}
                  onClick={handleSendInvite}
                >
                  {invitePending ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <Mail className="size-4" />
                  )}
                  {hasClerkLink ? t('chrome.staff.settings.reInviteUser') : t('chrome.staff.settings.inviteUser')}
                </Button>
              </div>
            )}

            <CollapsibleFormSection
              title={t('chrome.staff.settings.sections.basicDetails')}
              description={t('chrome.staff.settings.sections.basicDetailsDesc')}
              contentClassName="space-y-3 sm:space-y-4"
            >
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('chrome.staff.settings.firstName')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={savedFieldPlaceholder(field.value, 'Jane')} autoComplete="given-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="surname"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('chrome.staff.settings.surname')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={savedFieldPlaceholder(field.value, 'Smith')} autoComplete="family-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('chrome.staff.settings.email')}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          {...field}
                          placeholder={savedFieldPlaceholder(field.value, 'jane.smith@example.com')}
                          autoComplete="email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('chrome.staff.settings.phone')}</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                          placeholder={savedFieldPlaceholder(field.value, '+27 64 123 4567')}
                          autoComplete="tel"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pbxExtension"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('chrome.staff.settings.pbxExtension')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                          placeholder={savedFieldPlaceholder(field.value, '2007')}
                          autoComplete="off"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="businesscardURL"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('chrome.staff.settings.businessCardUrl')}</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder={savedFieldPlaceholder(field.value, 'https://...')}
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleFormSection>

            <CollapsibleFormSection
              title={t('chrome.staff.settings.sections.identityAccess')}
              description={t('chrome.staff.settings.sections.identityAccessDesc')}
              contentClassName="space-y-3 sm:space-y-4"
            >
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="userref"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('chrome.staff.settings.userRef')}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(e.target.value || null)
                            }
                            placeholder={savedFieldPlaceholder(field.value, 'e.g. USR123456')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hrID"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('chrome.staff.settings.hrId')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              field.onChange(v === '' ? null : Number(v));
                            }}
                            placeholder={savedFieldPlaceholder(field.value, 'HR system ID')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('chrome.staff.settings.role')}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? ''}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full min-w-0">
                              <SelectValue placeholder={savedFieldPlaceholder(field.value, 'Role')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accessLevels.map((role) => {
                              const RoleIcon = ACCESS_LEVEL_ICONS[role] ?? User;
                              return (
                                <SelectItem key={role} value={role}>
                                  <span className="flex items-center gap-2">
                                    <RoleIcon className="size-4 shrink-0" />
                                    {formatEnumLabel(role)}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="accessLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('chrome.staff.settings.accessLevel')}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? ''}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full min-w-0">
                              <SelectValue placeholder={savedFieldPlaceholder(field.value, 'Access level')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accessLevels.map((level) => {
                              const LevelIcon = ACCESS_LEVEL_ICONS[level] ?? User;
                              return (
                                <SelectItem key={level} value={level}>
                                  <span className="flex items-center gap-2">
                                    <LevelIcon className="size-4 shrink-0" />
                                    {formatEnumLabel(level)}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('tables.status')}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? 'active'}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full min-w-0">
                              <SelectValue placeholder={savedFieldPlaceholder(field.value, 'Status')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(['active', 'inactive', 'suspended'] as const).map((statusValue) => {
                              const StatusIcon = USER_STATUS_ICONS[statusValue] ?? User;
                              const label = t(`chrome.staff.settings.status${statusValue.charAt(0).toUpperCase() + statusValue.slice(1)}`);
                              return (
                                <SelectItem key={statusValue} value={statusValue}>
                                  <span className="flex items-center gap-2">
                                    <StatusIcon className="size-4 shrink-0" />
                                    {label}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="workforceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('chrome.staff.settings.workforceType')}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? ''}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full min-w-0">
                              <SelectValue placeholder={savedFieldPlaceholder(field.value, 'Workforce type')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {workforceTypeOptions.map((wt) => {
                              const WtIcon = workforceTypeRowIcon(wt);
                              return (
                                <SelectItem key={wt} value={wt}>
                                  <span className="flex items-center gap-2">
                                    <WtIcon className="size-4 shrink-0" />
                                    {formatEnumLabel(wt)}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem className="max-w-xs">
                      <FormLabel>{t('chrome.staff.settings.departmentId')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            field.onChange(v === '' ? null : Number(v));
                          }}
                          placeholder={savedFieldPlaceholder(field.value, 'e.g. 12')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="approvableTypes"
                  render={({ field }) => (
                    <ApprovableTypesPicker
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <FormField
                  control={form.control}
                  name="canAccessPerformanceTracking"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border p-3">
                      <div className="space-y-1">
                        <FormLabel>{t('chrome.staff.settings.performanceTracking')}</FormLabel>
                        <FormDescription>
                          {t('chrome.staff.settings.performanceTrackingDesc')}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CollapsibleFormSection>

            <CollapsibleFormSection
              title={t('chrome.staff.settings.sections.primaryBranch')}
              description={t('chrome.staff.settings.sections.primaryBranchDesc')}
            >
                <FormField
                  control={form.control}
                  name="branchUid"
                  render={({ field }) => {
                    const normalizedBranch = normalizePrimaryBranchUid(field.value ?? null);
                    const selectedLabel =
                      normalizedBranch != null
                        ? (() => {
                            const b = branches.find((x) => x.uid === normalizedBranch);
                            return b
                              ? getBranchDisplayLabel(b) || `Branch ${b.uid}`
                              : `Branch ${normalizedBranch}`;
                          })()
                        : null;
                    return (
                      <FormItem>
                        <FormLabel>{t('chrome.staff.settings.branch')}</FormLabel>
                        <Popover
                          open={primaryBranchOpen}
                          onOpenChange={setPrimaryBranchOpen}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                aria-expanded={primaryBranchOpen}
                                className={cn(
                                  'w-full justify-between font-normal',
                                  !selectedLabel && 'text-muted-foreground'
                                )}
                              >
                                <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                                  {selectedLabel ? (
                                    <>
                                      <MapPinIcon className="size-4 shrink-0" />
                                      {selectedLabel}
                                    </>
                                  ) : (
                                    t('chrome.staff.settings.selectBranch')
                                  )}
                                </span>
                                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[var(--radix-popover-trigger-width)] min-w-[200px] max-w-[min(100vw-2rem,24rem)] p-0"
                            align="start"
                          >
                            <Command>
                              <CommandInput placeholder={t('chrome.staff.settings.searchBranches')} />
                              <CommandList>
                                <CommandEmpty>{t('actions.noBranchFound')}</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value="none unassigned"
                                    onSelect={() => {
                                      field.onChange(null);
                                      setPrimaryBranchOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        'size-4 shrink-0',
                                        normalizedBranch == null ? 'opacity-100' : 'opacity-0'
                                      )}
                                    />
                                    <span>{t('chrome.staff.settings.none')}</span>
                                  </CommandItem>
                                  {branches.map((b) => {
                                    const label =
                                      getBranchDisplayLabel(b) || `Branch ${b.uid}`;
                                    return (
                                      <CommandItem
                                        key={b.uid}
                                        value={`${label} ${b.uid} ${b.ref ?? ''} ${b.name ?? ''}`}
                                        onSelect={() => {
                                          field.onChange(b.uid);
                                          setPrimaryBranchOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            'size-4 shrink-0',
                                            normalizedBranch === b.uid
                                              ? 'opacity-100'
                                              : 'opacity-0'
                                          )}
                                        />
                                        <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                                          <MapPinIcon className="size-4 shrink-0" />
                                          {label}
                                        </span>
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </CollapsibleFormSection>

            <PersonnelDetailsCard control={form.control} />

            <JobInformationCard control={form.control} />

            <CollapsibleFormSection
              title={t('chrome.staff.settings.sections.assignedClients')}
              description={t('chrome.staff.settings.sections.assignedClientsDesc')}
            >
                <FormField
                  control={form.control}
                  name="assignedClientIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('chrome.staff.settings.assignedClients')}</FormLabel>
                      <Popover
                        open={clientsPickerOpen}
                        onOpenChange={(open) => {
                          setClientsPickerOpen(open);
                          if (!open) setClientsSearch('');
                        }}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              aria-expanded={clientsPickerOpen}
                              className={cn(
                                'w-full justify-between font-normal',
                                !field.value?.length && 'text-muted-foreground'
                              )}
                            >
                              {field.value?.length
                                ? `${field.value.length} selected`
                                : t('chrome.staff.settings.selectClients')}
                              <ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder={t('chrome.staff.settings.searchClients')}
                              value={clientsSearch}
                              onValueChange={setClientsSearch}
                            />
                            <CommandList className="max-h-[200px]">
                              <CommandGroup className="p-2">
                                {clients.length === 0 ? (
                                  <p className="text-xs sm:text-sm text-muted-foreground py-3 text-center sm:py-4">
                                    {t('chrome.staff.settings.noClientsAvailable')}
                                  </p>
                                ) : filteredClientsForPicker.length === 0 ? (
                                  <p className="text-xs sm:text-sm text-muted-foreground py-3 text-center sm:py-4">
                                    {t('chrome.staff.settings.noClientsFound')}
                                  </p>
                                ) : (
                                  filteredClientsForPicker.map((c) => {
                                    const selected =
                                      field.value?.includes(c.uid) ?? false;
                                    return (
                                      <label
                                        key={c.uid}
                                        className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted"
                                      >
                                        <Checkbox
                                          checked={selected}
                                          onCheckedChange={(checked) => {
                                            const current = field.value ?? [];
                                            if (checked) {
                                              field.onChange([...current, c.uid]);
                                            } else {
                                              field.onChange(
                                                current.filter((id) => id !== c.uid)
                                              );
                                            }
                                          }}
                                        />
                                        <span className="flex min-w-0 items-center gap-1.5">
                                          {clientLabelById.get(c.uid)?.hasAddress ? (
                                            <MapPinIcon className="size-3.5 shrink-0 text-muted-foreground" aria-label="Has address" />
                                          ) : null}
                                          <span className="truncate">{clientLabelById.get(c.uid)?.name ?? c.name ?? 'Client'}</span>
                                        </span>
                                      </label>
                                    );
                                  })
                                )}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {field.value && field.value.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {field.value.map((uid) => {
                            const c = clients.find((x) => x.uid === uid);
                            return (
                              <Badge
                                key={uid}
                                variant="secondary"
                                className="cursor-pointer gap-1"
                                onClick={() =>
                                  field.onChange(field.value?.filter((id) => id !== uid) ?? [])
                                }
                              >
                                {clientLabelById.get(uid)?.hasAddress ? (
                                  <MapPinIcon className="size-3 shrink-0" aria-label="Has address" />
                                ) : null}
                                {clientLabelById.get(uid)?.name ?? c?.name ?? 'Client'} ×
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
                  <p className="text-xs text-muted-foreground flex-1 min-w-[200px]">
                    {t('chrome.staff.settings.planVisitsHint')}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setPlanVisitsOpen(true)}
                  >
                    <CalendarDays className="size-4" />
                    {t('chrome.staff.settings.planVisitSchedule')}
                  </Button>
                </div>

                {ref ? <ActiveVisitSchedules userRef={ref} /> : null}
            </CollapsibleFormSection>

            {ref ? (
              <PlanClientVisitsDialog
                open={planVisitsOpen}
                onOpenChange={setPlanVisitsOpen}
                userRef={ref}
                assignedClientIds={form.watch('assignedClientIds') ?? []}
                clients={planningClients}
                origin={visitOrigin}
                onClientsAssigned={(clientIds) =>
                  form.setValue('assignedClientIds', clientIds, { shouldDirty: true })
                }
              />
            ) : null}

            {/* Performance warnings (staff-card chip) */}
            {ref ? (
              <PerformanceWarningsCard
                userRef={ref}
                canManage={canInviteOthers}
              />
            ) : null}

            {/* Formal HR warnings */}
            {user.uid != null ? (
              <UserWarningsCard
                userRef={user.clerkUserId?.trim() || user.uid}
                recipientClerkId={user.clerkUserId}
                canManage={canInviteOthers}
              />
            ) : null}

            <CollapsibleFormSection
              title={t('chrome.staff.settings.sections.userTargets')}
              description={t('chrome.staff.settings.sections.userTargetsDesc')}
            >
                <Form {...targetForm}>
                  <div className="space-y-3 sm:space-y-4">
                    <FormField
                      control={targetForm.control}
                      name="performanceWarningLevel"
                      render={({ field }) => (
                        <FormItem className="max-w-md">
                          <FormLabel>{t('chrome.staff.settings.performanceWarningTier')}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value ?? 'none'}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full min-w-0">
                                <SelectValue placeholder={savedFieldPlaceholder(field.value, 'None')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">{t('chrome.staff.settings.warningNone')}</SelectItem>
                              <SelectItem value="1">{t('chrome.staff.settings.warningLevel1')}</SelectItem>
                              <SelectItem value="2">{t('chrome.staff.settings.warningLevel2')}</SelectItem>
                              <SelectItem value="3">{t('chrome.staff.settings.warningLevel3')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            {t('chrome.staff.settings.warningHint')}
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                      <FormField
                        control={targetForm.control}
                        name="targetSalesAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('chrome.staff.settings.targetSales')}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="any"
                                placeholder={savedFieldPlaceholder(field.value, '0')}
                                {...field}
                                value={field.value ?? ''}
                                onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={targetForm.control}
                        name="targetQuotationsAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('chrome.staff.settings.targetQuotations')}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="any"
                                placeholder={savedFieldPlaceholder(field.value, '0')}
                                {...field}
                                value={field.value ?? ''}
                                onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={targetForm.control}
                        name="targetCurrency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('chrome.staff.settings.currency')}</FormLabel>
                            <Select
                              onValueChange={(v) =>
                                field.onChange(v === '__none__' ? null : v)
                              }
                              value={
                                field.value != null && field.value !== ''
                                  ? field.value
                                  : '__none__'
                              }
                            >
                              <FormControl>
                                <SelectTrigger className="w-full min-w-0">
                                  <SelectValue placeholder={savedFieldPlaceholder(field.value, t('chrome.staff.settings.selectCurrency'))} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="__none__">
                                  {t('chrome.staff.settings.selectCurrency')}
                                </SelectItem>
                                {CURRENCY_OPTIONS.map((opt) => (
                                  <SelectItem
                                    key={opt.value}
                                    value={opt.value}
                                  >
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={targetForm.control}
                        name="targetHoursWorked"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('chrome.staff.settings.targetHours')}</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder={savedFieldPlaceholder(field.value, '0')} {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={targetForm.control}
                        name="targetNewClients"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('chrome.staff.settings.targetNewClients')}</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder={savedFieldPlaceholder(field.value, '0')} {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={targetForm.control}
                        name="targetNewLeads"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('chrome.staff.settings.targetNewLeads')}</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder={savedFieldPlaceholder(field.value, '0')} {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={targetForm.control}
                        name="targetCheckIns"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('chrome.staff.settings.targetCheckIns')}</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder={savedFieldPlaceholder(field.value, '0')} {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="sm:col-span-2 lg:col-span-3">
                        <CallTargetSplitDialog />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                      <FormField
                        control={targetForm.control}
                        name="targetPeriod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('chrome.staff.settings.targetPeriod')}</FormLabel>
                            <Select
                              onValueChange={(v) =>
                                field.onChange(v === '__none__' ? null : v)
                              }
                              value={
                                field.value != null && field.value !== ''
                                  ? field.value
                                  : '__none__'
                              }
                            >
                              <FormControl>
                                <SelectTrigger className="w-full min-w-0">
                                  <SelectValue placeholder={savedFieldPlaceholder(field.value, t('chrome.staff.settings.selectPeriod'))} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="__none__">
                                  {t('chrome.staff.settings.selectPeriod')}
                                </SelectItem>
                                {TARGET_PERIOD_OPTIONS.map((opt) => (
                                  <SelectItem
                                    key={opt.value}
                                    value={opt.value}
                                  >
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={targetForm.control}
                        name="periodStartDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('chrome.staff.settings.periodStart')}</FormLabel>
                            <FormControl>
                              <DatePickerField
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={savedFieldPlaceholder(field.value, 'DD/MM/YYYY')}
                          />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={targetForm.control}
                        name="periodEndDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('chrome.staff.settings.periodEnd')}</FormLabel>
                            <FormControl>
                              <DatePickerField
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={savedFieldPlaceholder(field.value, 'DD/MM/YYYY')}
                          />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={targetForm.control}
                        name="recurringInterval"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('chrome.staff.settings.recurringInterval')}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ?? ''}>
                              <FormControl>
                                <SelectTrigger className="w-full min-w-0">
                                  <SelectValue placeholder={savedFieldPlaceholder(field.value, 'Interval')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="daily">{t('chrome.staff.settings.daily')}</SelectItem>
                                <SelectItem value="weekly">{t('chrome.staff.settings.weekly')}</SelectItem>
                                <SelectItem value="monthly">{t('chrome.staff.settings.monthly')}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={targetForm.control}
                        name="isRecurring"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center gap-2 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="font-normal">{t('chrome.staff.settings.recurring')}</FormLabel>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={targetForm.control}
                        name="carryForwardUnfulfilled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center gap-2 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="font-normal">{t('chrome.staff.settings.carryForward')}</FormLabel>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium text-muted-foreground mb-3">{t('chrome.staff.settings.costBreakdown')}</p>
                      <PrimaryVehicleSection
                        control={targetForm.control}
                        userUid={user.uid}
                        userRef={effectiveRef ?? ref ?? String(user.uid)}
                        clerkUserId={user.clerkUserId}
                        branchUid={normalizePrimaryBranchUid(
                          (user as { branchUid?: number | null }).branchUid ??
                            user.branch?.uid ??
                            form.getValues('branchUid')
                        )}
                      />
                      {user.clerkUserId ? (
                        <div className="mt-4">
                          <PolicyAgreementForm clerkUserId={user.clerkUserId} />
                        </div>
                      ) : null}
                      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 mt-3">
                        <FormField
                          control={targetForm.control}
                          name="baseSalary"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('chrome.staff.settings.baseSalary')}</FormLabel>
                              <FormControl>
                                <Input type="number" step="any" placeholder={savedFieldPlaceholder(field.value, '0')} {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={targetForm.control}
                          name="carInstalment"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('chrome.staff.settings.carInstalment')}</FormLabel>
                              <FormControl>
                                <Input type="number" step="any" placeholder={savedFieldPlaceholder(field.value, '0')} {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={targetForm.control}
                          name="carInsurance"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('chrome.staff.settings.carInsurance')}</FormLabel>
                              <FormControl>
                                <Input type="number" step="any" placeholder={savedFieldPlaceholder(field.value, '0')} {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={targetForm.control}
                          name="fuel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('chrome.staff.settings.fuel')}</FormLabel>
                              <FormControl>
                                <Input type="number" step="any" placeholder={savedFieldPlaceholder(field.value, '0')} {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={targetForm.control}
                          name="fuelPricePerLitreZar"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('chrome.staff.settings.fuelPriceOverride')}</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="any"
                                  min={0}
                                  placeholder={savedFieldPlaceholder(field.value, 'Country price')}
                                  {...field}
                                  value={field.value ?? ''}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    field.onChange(v === '' ? null : Number(v));
                                  }}
                                />
                              </FormControl>
                              <FormDescription>
                                {t('chrome.staff.settings.fuelPriceDesc')}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="sm:col-span-2 lg:col-span-3">
                          <FuelAllowanceReadout userRef={effectiveRef ?? ref ?? String(user.uid)} />
                        </div>
                        <FormField
                          control={targetForm.control}
                          name="cellPhoneAllowance"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('chrome.staff.settings.cellPhoneAllowance')}</FormLabel>
                              <FormControl>
                                <Input type="number" step="any" placeholder={savedFieldPlaceholder(field.value, '0')} {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={targetForm.control}
                          name="carMaintenance"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('chrome.staff.settings.carMaintenance')}</FormLabel>
                              <FormControl>
                                <Input type="number" step="any" placeholder={savedFieldPlaceholder(field.value, '0')} {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={targetForm.control}
                          name="cgicCosts"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('chrome.staff.settings.cgicCosts')}</FormLabel>
                              <FormControl>
                                <Input type="number" step="any" placeholder={savedFieldPlaceholder(field.value, '0')} {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={targetForm.control}
                          name="totalCost"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('chrome.staff.settings.totalCost')}</FormLabel>
                              <FormControl>
                                <Input type="number" step="any" placeholder={savedFieldPlaceholder(field.value, '0')} {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={targetForm.control}
                          name="erpSalesRepCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('chrome.staff.settings.erpSalesRepCode')}</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} placeholder={savedFieldPlaceholder(field.value, 'e.g. REP001')} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </Form>
              </CollapsibleFormSection>

            <CollapsibleFormSection
              title={t('chrome.staff.settings.sections.managedBranches')}
              description={t('chrome.staff.settings.sections.managedBranchesDesc')}
            >
                <FormField
                  control={form.control}
                  name="managedBranches"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('chrome.staff.settings.managedBranches')}</FormLabel>
                      <Popover
                        open={managedBranchesPickerOpen}
                        onOpenChange={(open) => {
                          setManagedBranchesPickerOpen(open);
                          if (!open) setManagedBranchesSearch('');
                        }}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              aria-expanded={managedBranchesPickerOpen}
                              className={cn(
                                'w-full justify-between font-normal',
                                !field.value?.length && 'text-muted-foreground'
                              )}
                            >
                              {field.value?.length
                                ? `${field.value.length} selected`
                                : t('chrome.staff.settings.selectBranches')}
                              <ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder={t('chrome.staff.settings.searchBranches')}
                              value={managedBranchesSearch}
                              onValueChange={setManagedBranchesSearch}
                            />
                            <CommandList className="max-h-[200px]">
                              <CommandGroup className="p-2">
                                {branches.length === 0 ? (
                                  <p className="text-xs sm:text-sm text-muted-foreground py-3 text-center sm:py-4">
                                    {t('chrome.staff.settings.noBranchesAvailable')}
                                  </p>
                                ) : filteredBranchesForManagedPicker.length === 0 ? (
                                  <p className="text-xs sm:text-sm text-muted-foreground py-3 text-center sm:py-4">
                                    {t('chrome.staff.settings.noBranchesFound')}
                                  </p>
                                ) : (
                                  filteredBranchesForManagedPicker.map((b) => {
                                    const selected =
                                      field.value?.includes(b.uid) ?? false;
                                    return (
                                      <label
                                        key={b.uid}
                                        className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted"
                                      >
                                        <Checkbox
                                          checked={selected}
                                          onCheckedChange={(checked) => {
                                            const current = field.value ?? [];
                                            if (checked) {
                                              handleManagedBranchesChange([...current, b.uid]);
                                            } else {
                                              handleManagedBranchesChange(
                                                current.filter((id) => id !== b.uid)
                                              );
                                            }
                                          }}
                                        />
                                        <span>
                                          {getBranchDisplayLabel(b) ||
                                            `Branch ${b.uid}`}
                                        </span>
                                      </label>
                                    );
                                  })
                                )}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {field.value && field.value.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {field.value.map((uid) => {
                            const b = branches.find((x) => x.uid === uid);
                            return (
                              <Badge
                                key={uid}
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={() =>
                                  handleManagedBranchesChange(
                                    field.value?.filter((id) => id !== uid) ?? []
                                  )
                                }
                              >
                                {b
                                  ? getBranchDisplayLabel(b) || `Branch ${uid}`
                                  : uid}{' '}
                                ×
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleFormSection>

            <CollapsibleFormSection
              title={t('chrome.staff.settings.sections.managedStaff')}
              description={t('chrome.staff.settings.sections.managedStaffDesc')}
            >
                <FormField
                  control={form.control}
                  name="managedStaff"
                  render={({ field }) => {
                    // Explicit picks only; branch-covered staff are shown separately and never saved twice.
                    const explicitStaffUids = (field.value ?? []).filter(
                      (uid) => !inheritedStaffUids.has(uid)
                    );
                    return (
                    <FormItem>
                      <FormLabel>{t('chrome.staff.settings.managedStaff')}</FormLabel>
                      {inheritedStaff.length > 0 && (
                        <div className="rounded-md border border-dashed p-3 mb-2">
                          <p className="text-xs text-muted-foreground mb-2">
                            {t('chrome.staff.settings.inheritedStaffHint', { count: inheritedStaff.length })}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {inheritedStaff.map((u) => (
                              <Badge key={u.uid} variant="outline" title="Via managed branch">
                                {`${u.name} ${u.surname}`.trim() || u.email}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <Popover
                        open={managedStaffPickerOpen}
                        onOpenChange={(open) => {
                          setManagedStaffPickerOpen(open);
                          if (!open) setManagedStaffSearch('');
                        }}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              aria-expanded={managedStaffPickerOpen}
                              className={cn(
                                'w-full justify-between font-normal',
                                !explicitStaffUids.length && 'text-muted-foreground'
                              )}
                            >
                              {explicitStaffUids.length
                                ? `${explicitStaffUids.length} selected`
                                : t('chrome.staff.settings.selectAdditionalStaff')}
                              <ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder={t('chrome.staff.settings.searchStaff')}
                              value={managedStaffSearch}
                              onValueChange={setManagedStaffSearch}
                            />
                            <CommandList className="max-h-[200px]">
                              <CommandGroup className="p-2">
                                {users.filter(
                                  (u) => u.uid !== user?.uid && !inheritedStaffUids.has(u.uid)
                                ).length === 0 ? (
                                  <p className="text-xs sm:text-sm text-muted-foreground py-3 text-center sm:py-4">
                                    {t('chrome.staff.settings.noUsersAvailable')}
                                  </p>
                                ) : filteredStaffForPicker.length === 0 ? (
                                  <p className="text-xs sm:text-sm text-muted-foreground py-3 text-center sm:py-4">
                                    {t('chrome.staff.settings.noStaffFound')}
                                  </p>
                                ) : (
                                  filteredStaffForPicker.map((u) => {
                                    const selected =
                                      field.value?.includes(u.uid) ?? false;
                                    const label =
                                      `${u.name} ${u.surname}`.trim() || u.email;
                                    return (
                                      <label
                                        key={u.uid}
                                        className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted"
                                      >
                                        <Checkbox
                                          checked={selected}
                                          onCheckedChange={(checked) => {
                                            const current = field.value ?? [];
                                            if (checked) {
                                              field.onChange([...current, u.uid]);
                                            } else {
                                              field.onChange(
                                                current.filter((id) => id !== u.uid)
                                              );
                                            }
                                          }}
                                        />
                                        <span className="truncate">{label}</span>
                                      </label>
                                    );
                                  })
                                )}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {explicitStaffUids.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {explicitStaffUids.map((uid) => {
                            const u = users.find((x) => x.uid === uid);
                            const label = u
                              ? `${u.name} ${u.surname}`.trim() || u.email
                              : `User ${uid}`;
                            return (
                              <Badge
                                key={uid}
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={() =>
                                  field.onChange(
                                    field.value?.filter((id) => id !== uid) ?? []
                                  )
                                }
                              >
                                {label} ×
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                    );
                  }}
                />
              </CollapsibleFormSection>

            <CollapsibleFormSection
              title={t('chrome.staff.settings.sections.dangerZone')}
              description={t('chrome.staff.settings.sections.dangerZoneDesc')}
              titleClassName="text-destructive"
              cardClassName="border-destructive/50"
              contentClassName="flex flex-col gap-3"
            >
                {(user as { isDeleted?: boolean })?.isDeleted ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setRestoreOpen(true)}
                        disabled={restoreUserMutation.isPending}
                      >
                        {restoreUserMutation.isPending ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          t('chrome.staff.settings.restoreUser')
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => {
                          setPermanentConfirmText('');
                          setPermanentOpen(true);
                        }}
                        disabled={deletePermanentMutation.isPending}
                      >
                        {deletePermanentMutation.isPending ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          t('chrome.staff.settings.permanentlyDelete')
                        )}
                      </Button>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t('chrome.staff.settings.deletedHint')}
                    </p>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setSoftDeleteOpen(true)}
                      disabled={deleteUserMutation.isPending}
                    >
                      {deleteUserMutation.isPending ? (
                        <Loader2Icon className="size-4 animate-spin" />
                      ) : (
                        t('chrome.staff.settings.removeFromSystem')
                      )}
                    </Button>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t('chrome.staff.settings.activeHint')}
                    </p>
                  </>
                )}
              </CollapsibleFormSection>

            <div className="flex flex-row gap-2">
              <Button
                type="button"
                variant="cancel"
                className="flex-1 sm:flex-none"
                onClick={() => router.push('/staff')}
              >
                {t('actions.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={patchUser.isPending}
                className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 text-white"
              >
                {patchUser.isPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  t('actions.save')
                )}
              </Button>
            </div>
          </form>
        </Form>

        {/* Soft delete confirmation */}
        <AlertDialog open={softDeleteOpen} onOpenChange={setSoftDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('chrome.staff.settings.removeUserTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('chrome.staff.settings.removeUserDesc')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={(e) => {
                  e.preventDefault();
                  deleteUserMutation.mutate(undefined, {
                    onSuccess: () => {
                      toast.success(t('chrome.staff.settings.toasts.userRemoved'));
                      setSoftDeleteOpen(false);
                      router.push('/staff');
                    },
                    onError: (err: Error) => {
                      toast.error(err.message || t('chrome.staff.settings.toasts.failedToRemove'));
                    },
                  });
                }}
              >
                {t('chrome.staff.settings.removeFromSystem')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Restore confirmation */}
        <AlertDialog open={restoreOpen} onOpenChange={setRestoreOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('chrome.staff.settings.restoreUserTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('chrome.staff.settings.restoreUserDesc')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                variant="success"
                onClick={(e) => {
                  e.preventDefault();
                  restoreUserMutation.mutate(undefined, {
                    onSuccess: () => {
                      toast.success(t('chrome.staff.settings.toasts.userRestored'));
                      setRestoreOpen(false);
                    },
                    onError: (err: Error) => {
                      toast.error(err.message || t('chrome.staff.settings.toasts.failedToRestore'));
                    },
                  });
                }}
              >
                {t('chrome.staff.settings.restoreAction')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Permanent delete confirmation */}
        <AlertDialog
          open={permanentOpen}
          onOpenChange={(open) => {
            setPermanentOpen(open);
            if (!open) setPermanentConfirmText('');
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('chrome.staff.settings.permanentDeleteTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('chrome.staff.settings.permanentDeleteDesc')}
                {' '}
                <span dangerouslySetInnerHTML={{ __html: t('chrome.staff.settings.permanentDeleteTypeHint') }} />
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Input
                placeholder={t('chrome.staff.settings.permanentDeleteConfirm')}
                value={permanentConfirmText}
                onChange={(e) => setPermanentConfirmText(e.target.value)}
                className="font-mono"
                data-testid="permanent-delete-confirm"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={permanentConfirmText !== 'PERMANENT'}
                onClick={(e) => {
                  e.preventDefault();
                  if (permanentConfirmText !== 'PERMANENT') return;
                  deletePermanentMutation.mutate(undefined, {
                    onSuccess: () => {
                      toast.success(t('chrome.staff.settings.toasts.userPermanentlyDeleted'));
                      setPermanentOpen(false);
                      setPermanentConfirmText('');
                      router.push('/staff');
                    },
                    onError: (err: Error) => {
                      toast.error(err.message || t('chrome.staff.settings.toasts.failedToPermanentlyDelete'));
                    },
                  });
                }}
              >
                {t('chrome.staff.settings.permanentlyDelete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

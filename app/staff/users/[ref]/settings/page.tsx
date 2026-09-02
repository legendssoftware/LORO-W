'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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
  useUsers,
  useClients,
  useSessionSync,
  useProvisionUserMutation,
  useReInviteUserMutation,
  getBranchDisplayLabel,
} from '@/api/hooks';
import type { UserListItem } from '@/api/endpoints/user';
import type { BranchListItem } from '@/api/types/branch';
import type { ClientListItem } from '@/api/types/clients';
import { Loader2Icon, ChevronLeftIcon, ChevronDownIcon, MapPinIcon } from '@/lib/icons';
import { CalendarDays } from 'lucide-react';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { PlanClientVisitsDialog } from './plan-client-visits-dialog';
import { ActiveVisitSchedules } from './active-visit-schedules';
import { UserWarningsCard } from './user-warnings-card';
import { PerformanceWarningsCard } from './performance-warnings-card';
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
  normalizePrimaryBranchUid,
  getEmptyEmploymentProfile,
  getEmptyPersonnelProfile,
  mapEmploymentFromApi,
  mapProfileFromApi,
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

/** Format enum value for display (e.g. "event planner" -> "Event planner"). */
function formatEnumLabel(value: string): string {
  return value
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function UserSettingsPage() {
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
  const { data: users = [] } = useUsers({ enabled: !!ref, limit: 200 });
  const { data: clients = [] } = useClients({ enabled: !!ref, limit: 100 });

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

  const filteredStaffForPicker = useMemo(() => {
    const list = users.filter((u) => u.uid !== user?.uid);
    return list.filter((u) =>
      userSettingsMatchesSearch(getStaffSearchHaystack(u), managedStaffSearch)
    );
  }, [users, user?.uid, managedStaffSearch]);

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
      businesscardURL: null,
      profile: getEmptyPersonnelProfile(),
      employmentProfile: getEmptyEmploymentProfile(),
      assignedClientIds: [],
    },
  });

  useEffect(() => {
    if (user) {
      const up = user as {
        userProfile?: Record<string, unknown> | null;
        userEmployeementProfile?: Record<string, unknown> | null;
        businesscardURL?: string | null;
        assignedClientIds?: number[];
        [key: string]: unknown;
      };
      const profile = up.userProfile ?? null;
      const emp = up.userEmployeementProfile ?? null;
      const empEmail = (emp?.email as string | undefined)?.trim();
      const empContact = (emp?.contactNumber as string | undefined)?.trim();
      const primaryEmail = (user.email?.trim() || empEmail || '') as string;
      const primaryPhone =
        (user.phone?.trim() || empContact || null) as string | null;
      form.reset({
        name: user.name ?? '',
        surname: user.surname ?? '',
        email: primaryEmail,
        phone: primaryPhone,
        pbxExtension: user.pbxExtension ?? null,
        userref: (user as { userref?: string }).userref ?? null,
        hrID: (user as { hrID?: number }).hrID ?? null,
        role: (user.role as string) ?? '',
        status: (user.status as string) ?? 'active',
        accessLevel: (user.accessLevel as string) ?? '',
        workforceType: (user as { workforceType?: string | null }).workforceType ?? '',
        departmentId: (user.departmentId as number) ?? null,
        branchUid: normalizePrimaryBranchUid(user.branch?.uid ?? user.branchUid ?? null),
        managedBranches: (user as { managedBranches?: number[] }).managedBranches ?? [],
        managedStaff: (user as { managedStaff?: number[] }).managedStaff ?? [],
        approvableTypes: Array.isArray((user as { approvableTypes?: string[] }).approvableTypes)
          ? ((user as { approvableTypes?: string[] }).approvableTypes ?? [])
          : [],
        businesscardURL: up.businesscardURL ?? null,
        profile: mapProfileFromApi(profile, parseFormDateInput),
        employmentProfile: mapEmploymentFromApi(emp, parseFormDateInput),
        assignedClientIds: up.assignedClientIds ?? [],
      });
    }
  }, [user, form]);

  const targetForm = useForm<TargetFormValues>({
    resolver: zodResolver(targetFormSchema),
    defaultValues: getDefaultTargetValues(null),
  });
  const { dirtyFields: targetDirtyFields } = targetForm.formState;

  useEffect(() => {
    const ut = (user as { userTarget?: Record<string, unknown> | null })?.userTarget ?? null;
    targetForm.reset(getDefaultTargetValues(ut));
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
      toast.success('No changes to save');
      return;
    }
    patchUser.mutate(body, {
      onSuccess: () => {
        if (hasUserChanges && hasTargetChanges) {
          toast.success('User and targets updated');
        } else if (hasTargetChanges) {
          toast.success('Targets updated');
        } else {
          toast.success('User updated');
        }
        router.push('/staff');
      },
      onError: (err: Error) => {
        toast.error(err.message || 'Failed to update user');
      },
    });
  };

  if (!ref) {
    return (
      <div className="h-full overflow-auto flex flex-col items-center justify-center px-4">
        <p className="text-muted-foreground">Invalid user reference.</p>
        <Link href="/staff" className="text-primary hover:underline mt-2 inline-block">
          Back to Staff
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
              Back to Staff
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
        toast.success(`Invite sent to ${res.user.email}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invite');
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
          Back to Staff
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
                  {hasClerkLink ? 'Clerk linked' : 'Pending sign-in'}
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
                  {hasClerkLink ? 'Re-Invite User' : 'Invite User'}
                </Button>
              </div>
            )}

            {/* Basic details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">Basic details</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Name, contact and email.
                </p>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Jane" autoComplete="given-name" />
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
                        <FormLabel>Surname</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Smith" autoComplete="family-name" />
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          {...field}
                          placeholder="jane.smith@example.com"
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
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                          placeholder="+27 64 123 4567"
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
                      <FormLabel>PBX extension</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                          placeholder="2007"
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
                      <FormLabel>Business card URL</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://..."
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
              </CardContent>
            </Card>

            {/* Identity & access */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">Identity & access</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  User reference, HR ID, role, access level, workforce type, status, and what they can approve.
                </p>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="userref"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User ref</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(e.target.value || null)
                            }
                            placeholder="e.g. USR123456"
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
                        <FormLabel>HR ID</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              field.onChange(v === '' ? null : Number(v));
                            }}
                            placeholder="HR system ID"
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
                        <FormLabel>Role</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? ''}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full min-w-0">
                              <SelectValue placeholder="Role" />
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
                        <FormLabel>Access level</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? ''}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full min-w-0">
                              <SelectValue placeholder="Access level" />
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
                        <FormLabel>Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? 'active'}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full min-w-0">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(['active', 'inactive', 'suspended'] as const).map((statusValue) => {
                              const StatusIcon = USER_STATUS_ICONS[statusValue] ?? User;
                              const label = statusValue === 'active' ? 'Active' : statusValue === 'inactive' ? 'Inactive' : 'Suspended';
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
                        <FormLabel>Workforce type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? ''}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full min-w-0">
                              <SelectValue placeholder="Workforce type" />
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
                      <FormLabel>Department ID</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            field.onChange(v === '' ? null : Number(v));
                          }}
                          placeholder="e.g. 12"
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
              </CardContent>
            </Card>

            {/* Primary branch */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">Primary branch</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  The branch this user is assigned to.
                </p>
              </CardHeader>
              <CardContent>
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
                        <FormLabel>Branch</FormLabel>
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
                                    'Select branch'
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
                              <CommandInput placeholder="Search branches…" />
                              <CommandList>
                                <CommandEmpty>No branch found.</CommandEmpty>
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
                                    <span>None</span>
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
              </CardContent>
            </Card>

            <PersonnelDetailsCard control={form.control} />

            <JobInformationCard control={form.control} />

            {/* Assigned clients */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">Assigned clients</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Clients this user has access to.
                </p>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="assignedClientIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned clients</FormLabel>
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
                                : 'Select clients'}
                              <ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Search clients…"
                              value={clientsSearch}
                              onValueChange={setClientsSearch}
                            />
                            <CommandList className="max-h-[200px]">
                              <CommandGroup className="p-2">
                                {clients.length === 0 ? (
                                  <p className="text-xs sm:text-sm text-muted-foreground py-3 text-center sm:py-4">
                                    No clients available
                                  </p>
                                ) : filteredClientsForPicker.length === 0 ? (
                                  <p className="text-xs sm:text-sm text-muted-foreground py-3 text-center sm:py-4">
                                    No clients found.
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
                                        <span>{c.name ?? `Client ${c.uid}`}</span>
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
                                className="cursor-pointer"
                                onClick={() =>
                                  field.onChange(field.value?.filter((id) => id !== uid) ?? [])
                                }
                              >
                                {c?.name ?? uid} ×
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
                    Split assigned clients into weekly visit batches and create planning tasks.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setPlanVisitsOpen(true)}
                  >
                    <CalendarDays className="size-4" />
                    Plan visit schedule
                  </Button>
                </div>

                {ref ? <ActiveVisitSchedules userRef={ref} /> : null}
              </CardContent>
            </Card>

            {ref ? (
              <PlanClientVisitsDialog
                open={planVisitsOpen}
                onOpenChange={setPlanVisitsOpen}
                userRef={ref}
                assignedClientIds={form.watch('assignedClientIds') ?? []}
                clients={clients}
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

            {/* User targets */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">User targets</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Performance targets and cost breakdown. Use the &quot;Save&quot; button at the bottom of the page to persist these together with the rest of the user (creates targets if the user has none).
                </p>
              </CardHeader>
              <CardContent>
                <Form {...targetForm}>
                  <div className="space-y-3 sm:space-y-4">
                    <FormField
                      control={targetForm.control}
                      name="performanceWarningLevel"
                      render={({ field }) => (
                        <FormItem className="max-w-md">
                          <FormLabel>Performance warning tier</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value ?? 'none'}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full min-w-0">
                                <SelectValue placeholder="None" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None (cleared when saved)</SelectItem>
                              <SelectItem value="1">Level 1 — first warning (green)</SelectItem>
                              <SelectItem value="2">Level 2 — second warning (amber)</SelectItem>
                              <SelectItem value="3">Level 3 — final warning (red)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Persisted with the bottom Save when changed. Employee must acknowledge in-app before the benchmarks dialog.
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
                            <FormLabel>Target sales (amount)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="any"
                                placeholder="0"
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
                            <FormLabel>Target quotations</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="any"
                                placeholder="0"
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
                            <FormLabel>Currency</FormLabel>
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
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="__none__">
                                  Select currency
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
                            <FormLabel>Target hours</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="0" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
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
                            <FormLabel>Target new clients</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="0" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
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
                            <FormLabel>Target new leads</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="0" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
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
                            <FormLabel>Target check-ins</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="0" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={targetForm.control}
                        name="targetCalls"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target calls</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="0" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                      <FormField
                        control={targetForm.control}
                        name="targetPeriod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target period</FormLabel>
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
                                  <SelectValue placeholder="Select period" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="__none__">
                                  Select period
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
                            <FormLabel>Period start</FormLabel>
                            <FormControl>
                              <DatePickerField
                            value={field.value}
                            onChange={field.onChange}
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
                            <FormLabel>Period end</FormLabel>
                            <FormControl>
                              <DatePickerField
                            value={field.value}
                            onChange={field.onChange}
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
                            <FormLabel>Recurring interval</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ?? ''}>
                              <FormControl>
                                <SelectTrigger className="w-full min-w-0">
                                  <SelectValue placeholder="Interval" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
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
                            <FormLabel className="font-normal">Recurring</FormLabel>
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
                            <FormLabel className="font-normal">Carry forward unfulfilled</FormLabel>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium text-muted-foreground mb-3">Cost breakdown (ZAR)</p>
                      <PrimaryVehicleSection
                        control={targetForm.control}
                        userUid={user.uid}
                        clerkUserId={user.clerkUserId}
                        branchUid={normalizePrimaryBranchUid(
                          (user as { branchUid?: number | null }).branchUid ??
                            user.branch?.uid ??
                            form.getValues('branchUid')
                        )}
                      />
                      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 mt-3">
                        <FormField
                          control={targetForm.control}
                          name="baseSalary"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Base salary</FormLabel>
                              <FormControl>
                                <Input type="number" step="any" placeholder="0" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
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
                              <FormLabel>Car instalment</FormLabel>
                              <FormControl>
                                <Input type="number" step="any" placeholder="0" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
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
                              <FormLabel>Car insurance</FormLabel>
                              <FormControl>
                                <Input type="number" step="any" placeholder="0" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
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
                              <FormLabel>Fuel</FormLabel>
                              <FormControl>
                                <Input type="number" step="any" placeholder="0" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={targetForm.control}
                          name="cellPhoneAllowance"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cell phone allowance</FormLabel>
                              <FormControl>
                                <Input type="number" step="any" placeholder="0" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
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
                              <FormLabel>Car maintenance</FormLabel>
                              <FormControl>
                                <Input type="number" step="any" placeholder="0" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
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
                              <FormLabel>CGIC costs</FormLabel>
                              <FormControl>
                                <Input type="number" step="any" placeholder="0" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
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
                              <FormLabel>Total cost</FormLabel>
                              <FormControl>
                                <Input type="number" step="any" placeholder="0" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
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
                              <FormLabel>ERP sales rep code</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} placeholder="e.g. REP001" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </Form>
              </CardContent>
            </Card>

            {/* Managed branches */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">Managed branches</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Branches this user manages (managers/supervisors).
                </p>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="managedBranches"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Managed branches</FormLabel>
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
                                : 'Select branches'}
                              <ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Search branches…"
                              value={managedBranchesSearch}
                              onValueChange={setManagedBranchesSearch}
                            />
                            <CommandList className="max-h-[200px]">
                              <CommandGroup className="p-2">
                                {branches.length === 0 ? (
                                  <p className="text-xs sm:text-sm text-muted-foreground py-3 text-center sm:py-4">
                                    No branches available
                                  </p>
                                ) : filteredBranchesForManagedPicker.length === 0 ? (
                                  <p className="text-xs sm:text-sm text-muted-foreground py-3 text-center sm:py-4">
                                    No branches found.
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
                                              field.onChange([...current, b.uid]);
                                            } else {
                                              field.onChange(
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
                                  field.onChange(
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
              </CardContent>
            </Card>

            {/* Managed staff */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">Managed staff</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Staff members this user manages.
                </p>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="managedStaff"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Managed staff</FormLabel>
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
                                !field.value?.length && 'text-muted-foreground'
                              )}
                            >
                              {field.value?.length
                                ? `${field.value.length} selected`
                                : 'Select staff'}
                              <ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Search staff…"
                              value={managedStaffSearch}
                              onValueChange={setManagedStaffSearch}
                            />
                            <CommandList className="max-h-[200px]">
                              <CommandGroup className="p-2">
                                {users.filter((u) => u.uid !== user?.uid).length ===
                                0 ? (
                                  <p className="text-xs sm:text-sm text-muted-foreground py-3 text-center sm:py-4">
                                    No users available
                                  </p>
                                ) : filteredStaffForPicker.length === 0 ? (
                                  <p className="text-xs sm:text-sm text-muted-foreground py-3 text-center sm:py-4">
                                    No staff found.
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
                      {field.value && field.value.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {field.value.map((uid) => {
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
                  )}
                />
              </CardContent>
            </Card>

            {/* Danger zone: remove / restore / permanent delete */}
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-sm sm:text-base text-destructive">Danger zone</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Remove user from the system or restore a removed user. Permanent delete cannot be undone.
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
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
                          'Restore user'
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
                          'Permanently delete'
                        )}
                      </Button>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      This user is removed from the system. You can restore them or permanently delete their account.
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
                        'Remove from system'
                      )}
                    </Button>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Deactivate this user. They can be restored later. For permanent removal, remove first then use
                      &quot;Permanently delete&quot; from this page.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-row gap-2">
              <Button
                type="button"
                variant="cancel"
                className="flex-1 sm:flex-none"
                onClick={() => router.push('/staff')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={patchUser.isPending}
                className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 text-white"
              >
                {patchUser.isPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </form>
        </Form>

        {/* Soft delete confirmation */}
        <AlertDialog open={softDeleteOpen} onOpenChange={setSoftDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove user from system?</AlertDialogTitle>
              <AlertDialogDescription>
                This will deactivate the user. They will no longer be able to sign in. You can restore them later from
                this page. Related records (leads, orders, etc.) will be kept and still linked to this user.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={(e) => {
                  e.preventDefault();
                  deleteUserMutation.mutate(undefined, {
                    onSuccess: () => {
                      toast.success('User removed from system');
                      setSoftDeleteOpen(false);
                      router.push('/staff');
                    },
                    onError: (err: Error) => {
                      toast.error(err.message || 'Failed to remove user');
                    },
                  });
                }}
              >
                Remove from system
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Restore confirmation */}
        <AlertDialog open={restoreOpen} onOpenChange={setRestoreOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restore user?</AlertDialogTitle>
              <AlertDialogDescription>
                This will restore the user so they can sign in again. Their status will be set to inactive until you
                update it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="success"
                onClick={(e) => {
                  e.preventDefault();
                  restoreUserMutation.mutate(undefined, {
                    onSuccess: () => {
                      toast.success('User restored');
                      setRestoreOpen(false);
                    },
                    onError: (err: Error) => {
                      toast.error(err.message || 'Failed to restore user');
                    },
                  });
                }}
              >
                Restore
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
              <AlertDialogTitle>Permanently delete user?</AlertDialogTitle>
              <AlertDialogDescription>
                This cannot be undone. The user row will be removed from the database. Related records (leads,
                quotations, etc.) will be kept but no longer linked to this user. Type <strong>PERMANENT</strong> below
                to confirm.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Input
                placeholder="Type PERMANENT to confirm"
                value={permanentConfirmText}
                onChange={(e) => setPermanentConfirmText(e.target.value)}
                className="font-mono"
                data-testid="permanent-delete-confirm"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={permanentConfirmText !== 'PERMANENT'}
                onClick={(e) => {
                  e.preventDefault();
                  if (permanentConfirmText !== 'PERMANENT') return;
                  deletePermanentMutation.mutate(undefined, {
                    onSuccess: () => {
                      toast.success('User permanently deleted');
                      setPermanentOpen(false);
                      setPermanentConfirmText('');
                      router.push('/staff');
                    },
                    onError: (err: Error) => {
                      toast.error(err.message || 'Failed to permanently delete user');
                    },
                  });
                }}
              >
                Permanently delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

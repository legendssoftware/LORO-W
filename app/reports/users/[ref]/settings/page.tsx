'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  useUser,
  usePatchUser,
  usePatchUserTarget,
  useDeleteUser,
  useRestoreUser,
  useDeleteUserPermanently,
  useBranches,
  useUsers,
  useClients,
} from '@/api/hooks';
import type { PatchUserBody, PatchUserTargetBody } from '@/api/endpoints/user';
import { Loader2Icon, ChevronLeftIcon, ChevronDownIcon } from '@/lib/icons';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { AccessLevel, UserRole } from '@/api/types';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  height: z.string().optional().nullable(),
  weight: z.string().optional().nullable(),
  hairColor: z.string().optional().nullable(),
  eyeColor: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
});

const employmentProfileSchema = z.object({
  branchref: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isCurrentlyEmployed: z.boolean().optional().nullable(),
  email: z.string().optional().nullable(),
  contactNumber: z.string().optional().nullable(),
});

/** User targets form schema (PATCH /user/:ref/target). */
const targetFormSchema = z.object({
  targetSalesAmount: z.number().optional().nullable(),
  targetQuotationsAmount: z.number().optional().nullable(),
  currentSalesAmount: z.number().optional().nullable(),
  currentQuotationsAmount: z.number().optional().nullable(),
  currentOrdersAmount: z.number().optional().nullable(),
  targetCurrency: z.string().optional().nullable(),
  targetHoursWorked: z.number().optional().nullable(),
  currentHoursWorked: z.number().optional().nullable(),
  targetNewClients: z.number().optional().nullable(),
  currentNewClients: z.number().optional().nullable(),
  targetNewLeads: z.number().optional().nullable(),
  currentNewLeads: z.number().optional().nullable(),
  targetCheckIns: z.number().optional().nullable(),
  currentCheckIns: z.number().optional().nullable(),
  targetCalls: z.number().optional().nullable(),
  currentCalls: z.number().optional().nullable(),
  targetPeriod: z.string().optional().nullable(),
  periodStartDate: z.string().optional().nullable(),
  periodEndDate: z.string().optional().nullable(),
  isRecurring: z.boolean().optional().nullable(),
  recurringInterval: z.enum(['daily', 'weekly', 'monthly']).optional().nullable(),
  carryForwardUnfulfilled: z.boolean().optional().nullable(),
  baseSalary: z.number().optional().nullable(),
  carInstalment: z.number().optional().nullable(),
  carInsurance: z.number().optional().nullable(),
  fuel: z.number().optional().nullable(),
  cellPhoneAllowance: z.number().optional().nullable(),
  carMaintenance: z.number().optional().nullable(),
  cgicCosts: z.number().optional().nullable(),
  totalCost: z.number().optional().nullable(),
  erpSalesRepCode: z.string().optional().nullable(),
});

type TargetFormValues = z.infer<typeof targetFormSchema>;

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  surname: z.string().min(1, 'Surname is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional().nullable(),
  userref: z.string().optional().nullable(),
  hrID: z.union([z.number(), z.null()]).optional(),
  role: z.string().optional(),
  status: z.string().optional(),
  accessLevel: z.string().optional(),
  departmentId: z.union([z.number(), z.null()]).optional(),
  branchUid: z.union([z.number(), z.null()]).optional(),
  managedBranches: z.array(z.number()).optional(),
  managedStaff: z.array(z.number()).optional(),
  businesscardURL: z.string().optional().nullable(),
  profile: profileSchema.optional().nullable(),
  employmentProfile: employmentProfileSchema.optional().nullable(),
  assignedClientIds: z.array(z.number()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

/** Format enum value for display (e.g. "event planner" -> "Event planner"). */
function formatEnumLabel(value: string): string {
  return value
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** User shape used for diffing (subset of API response). */
type UserBaseline = {
  name?: string | null;
  surname?: string | null;
  email?: string | null;
  phone?: string | null;
  userref?: string | null;
  hrID?: number | null;
  role?: string | null;
  status?: string | null;
  accessLevel?: string | null;
  departmentId?: number | null;
  branch?: { uid?: number } | null;
  managedBranches?: number[];
  managedStaff?: number[];
  businesscardURL?: string | null;
  userProfile?: Record<string, unknown> | null;
  userEmployeementProfile?: Record<string, unknown> | null;
  assignedClientIds?: number[];
};

/** Build PATCH body with only fields that changed. Never sends empty string for enum fields. */
function buildPatchBody(user: UserBaseline | null | undefined, values: FormValues): PatchUserBody {
  if (!user) return {};

  const norm = (s: string | null | undefined) => (s ?? '').trim();
  const sameStr = (a: string | null | undefined, b: string | null | undefined) =>
    norm(a) === norm(b);
  const sameNum = (a: number | null | undefined, b: number | null | undefined) =>
    (a ?? null) === (b ?? null);
  const sameArr = (a?: number[], b?: number[]) => {
    const x = [...(a ?? [])].sort((i, j) => i - j);
    const y = [...(b ?? [])].sort((i, j) => i - j);
    return x.length === y.length && x.every((v, i) => v === y[i]);
  };

  const body: PatchUserBody = {};

  if (!sameStr(user.name, values.name)) body.name = values.name;
  if (!sameStr(user.surname, values.surname)) body.surname = values.surname;
  if (!sameStr(user.email, values.email)) body.email = values.email;
  if (norm(user.phone) !== norm(values.phone ?? null))
    body.phone = values.phone ?? undefined;
  if (norm(user.userref) !== norm(values.userref ?? null))
    body.userref = values.userref ?? undefined;
  if (!sameNum(user.hrID, values.hrID)) body.hrID = values.hrID ?? undefined;

  if (!sameStr(user.role, values.role))
    body.role = values.role?.trim() || undefined;
  if (!sameStr(user.status, values.status))
    body.status = values.status?.trim() || undefined;
  if (!sameStr(user.accessLevel, values.accessLevel))
    body.accessLevel = values.accessLevel?.trim() || undefined;

  if (!sameNum(user.departmentId ?? undefined, values.departmentId))
    body.departmentId = values.departmentId ?? undefined;

  const userBranchUid = user.branch?.uid ?? null;
  if (!sameNum(userBranchUid, values.branchUid))
    body.branch = values.branchUid != null ? { uid: values.branchUid } : undefined;

  if (!sameArr(user.managedBranches, values.managedBranches))
    body.managedBranches =
      values.managedBranches?.length ? values.managedBranches : undefined;
  if (!sameArr(user.managedStaff, values.managedStaff))
    body.managedStaff = values.managedStaff?.length ? values.managedStaff : undefined;

  if (norm(user.businesscardURL ?? null) !== norm(values.businesscardURL ?? null))
    body.businesscardURL = values.businesscardURL ?? undefined;

  const sameProfile = (
    a: Record<string, unknown> | null | undefined,
    b: FormValues['profile'] | FormValues['employmentProfile']
  ) => {
    if (!a && !b) return true;
    if (!a || !b) return false;
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      const av = (a as Record<string, unknown>)[k];
      const bv = (b as Record<string, unknown>)[k];
      const as = av === null || av === undefined ? '' : String(av).trim();
      const bs = bv === null || bv === undefined ? '' : String(bv).trim();
      if (as !== bs) return false;
    }
    return true;
  };
  if (!sameProfile(user.userProfile ?? null, values.profile ?? null) && values.profile)
    body.profile = values.profile as PatchUserBody['profile'];
  if (!sameProfile(user.userEmployeementProfile ?? null, values.employmentProfile ?? null) && values.employmentProfile)
    body.employmentProfile = {
      ...values.employmentProfile,
      isCurrentlyEmployed: values.employmentProfile.isCurrentlyEmployed ?? undefined,
    } as PatchUserBody['employmentProfile'];

  if (!sameArr(user.assignedClientIds, values.assignedClientIds))
    body.assignedClientIds = values.assignedClientIds?.length ? values.assignedClientIds : undefined;

  return body;
}

/** Default form values for user targets from API userTarget or null. */
function getDefaultTargetValues(ut: Record<string, unknown> | null): TargetFormValues {
  const num = (v: unknown): number | null =>
    v === null || v === undefined ? null : typeof v === 'number' && !Number.isNaN(v) ? v : null;
  const str = (v: unknown): string | null =>
    v === null || v === undefined ? null : typeof v === 'string' ? v : null;
  const dateStr = (v: unknown): string | null => {
    if (v === null || v === undefined) return null;
    if (typeof v === 'string') return v.slice(0, 10);
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return null;
  };
  const bool = (v: unknown): boolean | null =>
    v === null || v === undefined ? null : typeof v === 'boolean' ? v : null;
  if (!ut) {
    return {
      targetSalesAmount: null, targetQuotationsAmount: null, currentSalesAmount: null,
      currentQuotationsAmount: null, currentOrdersAmount: null, targetCurrency: null,
      targetHoursWorked: null, currentHoursWorked: null, targetNewClients: null, currentNewClients: null,
      targetNewLeads: null, currentNewLeads: null, targetCheckIns: null, currentCheckIns: null,
      targetCalls: null, currentCalls: null, targetPeriod: null, periodStartDate: null, periodEndDate: null,
      isRecurring: null, recurringInterval: null, carryForwardUnfulfilled: null,
      baseSalary: null, carInstalment: null, carInsurance: null, fuel: null, cellPhoneAllowance: null,
      carMaintenance: null, cgicCosts: null, totalCost: null, erpSalesRepCode: null,
    };
  }
  return {
    targetSalesAmount: num(ut.targetSalesAmount),
    targetQuotationsAmount: num(ut.targetQuotationsAmount),
    currentSalesAmount: num(ut.currentSalesAmount),
    currentQuotationsAmount: num(ut.currentQuotationsAmount),
    currentOrdersAmount: num(ut.currentOrdersAmount),
    targetCurrency: str(ut.targetCurrency),
    targetHoursWorked: num(ut.targetHoursWorked),
    currentHoursWorked: num(ut.currentHoursWorked),
    targetNewClients: num(ut.targetNewClients),
    currentNewClients: num(ut.currentNewClients),
    targetNewLeads: num(ut.targetNewLeads),
    currentNewLeads: num(ut.currentNewLeads),
    targetCheckIns: num(ut.targetCheckIns),
    currentCheckIns: num(ut.currentCheckIns),
    targetCalls: num(ut.targetCalls),
    currentCalls: num(ut.currentCalls),
    targetPeriod: str(ut.targetPeriod),
    periodStartDate: dateStr(ut.periodStartDate),
    periodEndDate: dateStr(ut.periodEndDate),
    isRecurring: bool(ut.isRecurring),
    recurringInterval: (ut.recurringInterval === 'daily' || ut.recurringInterval === 'weekly' || ut.recurringInterval === 'monthly') ? ut.recurringInterval : null,
    carryForwardUnfulfilled: bool(ut.carryForwardUnfulfilled),
    baseSalary: num(ut.baseSalary),
    carInstalment: num(ut.carInstalment),
    carInsurance: num(ut.carInsurance),
    fuel: num(ut.fuel),
    cellPhoneAllowance: num(ut.cellPhoneAllowance),
    carMaintenance: num(ut.carMaintenance),
    cgicCosts: num(ut.cgicCosts),
    totalCost: num(ut.totalCost),
    erpSalesRepCode: str(ut.erpSalesRepCode),
  };
}

export default function UserSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const ref = typeof params.ref === 'string' ? params.ref : null;
  const { data: user, isLoading: userLoading, error: userError } = useUser(ref, {
    includeDeleted: true,
  });
  const patchUser = usePatchUser(ref);
  const patchUserTargetMutation = usePatchUserTarget(ref);
  const deleteUserMutation = useDeleteUser(ref);
  const restoreUserMutation = useRestoreUser(ref);
  const deletePermanentMutation = useDeleteUserPermanently(ref);
  const { data: branches = [] } = useBranches({ enabled: !!ref });
  const { data: users = [] } = useUsers({ enabled: !!ref, limit: 200 });
  const { data: clients = [] } = useClients({ enabled: !!ref, limit: 500 });

  const [permanentConfirmText, setPermanentConfirmText] = useState('');
  const [softDeleteOpen, setSoftDeleteOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [permanentOpen, setPermanentOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      surname: '',
      email: '',
      phone: null,
      userref: null,
      hrID: null,
      role: '',
      status: 'active',
      accessLevel: '',
      departmentId: null,
      branchUid: null,
      managedBranches: [],
      managedStaff: [],
      businesscardURL: null,
      profile: { height: null, weight: null, hairColor: null, eyeColor: null, gender: null, dateOfBirth: null, address: null, city: null, country: null },
      employmentProfile: { branchref: null, position: null, department: null, startDate: null, endDate: null, isCurrentlyEmployed: null, email: null, contactNumber: null },
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
      form.reset({
        name: user.name ?? '',
        surname: user.surname ?? '',
        email: user.email ?? '',
        phone: user.phone ?? null,
        userref: (user as { userref?: string }).userref ?? null,
        hrID: (user as { hrID?: number }).hrID ?? null,
        role: (user.role as string) ?? '',
        status: (user.status as string) ?? 'active',
        accessLevel: (user.accessLevel as string) ?? '',
        departmentId: (user.departmentId as number) ?? null,
        branchUid: user.branch?.uid ?? null,
        managedBranches: (user as { managedBranches?: number[] }).managedBranches ?? [],
        managedStaff: (user as { managedStaff?: number[] }).managedStaff ?? [],
        businesscardURL: up.businesscardURL ?? null,
        profile: profile ? {
          height: (profile.height as string) ?? null,
          weight: (profile.weight as string) ?? null,
          hairColor: (profile.hairColor as string) ?? null,
          eyeColor: (profile.eyeColor as string) ?? null,
          gender: (profile.gender as string) ?? null,
          dateOfBirth: profile.dateOfBirth ? (typeof profile.dateOfBirth === 'string' ? profile.dateOfBirth : new Date(profile.dateOfBirth as Date).toISOString().slice(0, 10)) : null,
          address: (profile.address as string) ?? null,
          city: (profile.city as string) ?? null,
          country: (profile.country as string) ?? null,
        } : { height: null, weight: null, hairColor: null, eyeColor: null, gender: null, dateOfBirth: null, address: null, city: null, country: null },
        employmentProfile: emp ? {
          branchref: (emp.branchref as string) ?? null,
          position: (emp.position as string) ?? null,
          department: (emp.department as string) ?? null,
          startDate: emp.startDate ? (typeof emp.startDate === 'string' ? emp.startDate : new Date(emp.startDate as Date).toISOString().slice(0, 10)) : null,
          endDate: emp.endDate ? (typeof emp.endDate === 'string' ? emp.endDate : new Date(emp.endDate as Date).toISOString().slice(0, 10)) : null,
          isCurrentlyEmployed: (emp.isCurrentlyEmployed as boolean) ?? null,
          email: (emp.email as string) ?? null,
          contactNumber: (emp.contactNumber as string) ?? null,
        } : { branchref: null, position: null, department: null, startDate: null, endDate: null, isCurrentlyEmployed: null, email: null, contactNumber: null },
        assignedClientIds: up.assignedClientIds ?? [],
      });
    }
  }, [user, form]);

  const targetForm = useForm<TargetFormValues>({
    resolver: zodResolver(targetFormSchema),
    defaultValues: getDefaultTargetValues(null),
  });

  useEffect(() => {
    const ut = (user as { userTarget?: Record<string, unknown> | null })?.userTarget ?? null;
    targetForm.reset(getDefaultTargetValues(ut));
  }, [user, targetForm]);

  const onTargetSubmit = (values: TargetFormValues) => {
    const body: PatchUserTargetBody = {};
    const keys: (keyof PatchUserTargetBody)[] = [
      'targetSalesAmount', 'targetQuotationsAmount', 'currentSalesAmount', 'currentQuotationsAmount', 'currentOrdersAmount',
      'targetCurrency', 'targetHoursWorked', 'currentHoursWorked', 'targetNewClients', 'currentNewClients',
      'targetNewLeads', 'currentNewLeads', 'targetCheckIns', 'currentCheckIns', 'targetCalls', 'currentCalls',
      'targetPeriod', 'periodStartDate', 'periodEndDate', 'isRecurring', 'recurringInterval', 'carryForwardUnfulfilled',
      'baseSalary', 'carInstalment', 'carInsurance', 'fuel', 'cellPhoneAllowance', 'carMaintenance', 'cgicCosts', 'totalCost', 'erpSalesRepCode',
    ];
    for (const k of keys) {
      const v = values[k as keyof TargetFormValues];
      if (v !== undefined && v !== null && v !== '') {
        (body as Record<string, unknown>)[k] = v;
      }
    }
    if (Object.keys(body).length === 0) {
      toast.success('No target changes to save');
      return;
    }
    patchUserTargetMutation.mutate(body, {
      onSuccess: () => {
        toast.success('Targets updated');
      },
      onError: (err: Error) => {
        toast.error(err.message || 'Failed to update targets');
      },
    });
  };

  const onSubmit = (values: FormValues) => {
    const body = buildPatchBody(user ?? undefined, values);
    const hasChanges = Object.keys(body).length > 0;
    if (!hasChanges) {
      toast.success('No changes to save');
      return;
    }
    patchUser.mutate(body, {
      onSuccess: () => {
        toast.success('User updated');
        router.push('/reports');
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
        <Link href="/reports" className="text-primary hover:underline mt-2 inline-block">
          Back to Reports
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
            <Link href="/reports" className="text-primary hover:underline mt-2 inline-block">
              Back to Reports
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
  const roles = Object.values(UserRole).filter(
    (v) => typeof v === 'string'
  ) as string[];

  return (
    <div className="h-full overflow-auto flex flex-col items-center">
      <div className="max-w-4xl w-full mx-auto px-4 py-8">
        <Link
          href="/reports"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeftIcon className="size-4" />
          Back to Reports
        </Link>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic details */}
            <Card>
              <CardHeader>
                <CardTitle>Basic details</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Name, contact and email.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First name</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                          <Input {...field} />
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
                        <Input type="email" {...field} />
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
                <CardTitle>Identity & access</CardTitle>
                <p className="text-sm text-muted-foreground">
                  User reference, HR ID, role, access level and status.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
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
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                            <SelectTrigger>
                              <SelectValue placeholder="Role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role} value={role}>
                                {formatEnumLabel(role)}
                              </SelectItem>
                            ))}
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
                            <SelectTrigger>
                              <SelectValue placeholder="Access level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accessLevels.map((level) => (
                              <SelectItem key={level} value={level}>
                                {formatEnumLabel(level)}
                              </SelectItem>
                            ))}
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
                            <SelectTrigger>
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
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
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Primary branch */}
            <Card>
              <CardHeader>
                <CardTitle>Primary branch</CardTitle>
                <p className="text-sm text-muted-foreground">
                  The branch this user is assigned to.
                </p>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="branchUid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch</FormLabel>
                      <Select
                        onValueChange={(v) =>
                          field.onChange(v === '__none__' ? null : Number(v))
                        }
                        value={
                          field.value != null ? String(field.value) : '__none__'
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {branches.map((b) => (
                            <SelectItem
                              key={b.uid}
                              value={String(b.uid)}
                            >
                              {b.name ?? `Branch ${b.uid}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* User profile */}
            <Card>
              <CardHeader>
                <CardTitle>User profile</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Physical details and personal information.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="profile.height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="profile.weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="profile.hairColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hair color</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="profile.eyeColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Eye color</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="profile.gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} placeholder="e.g. Male, Female" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="profile.dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of birth</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="profile.address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="profile.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="profile.country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Employment profile */}
            <Card>
              <CardHeader>
                <CardTitle>Employment profile</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Position, department, and employment dates.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="employmentProfile.branchref"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch ref</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="employmentProfile.position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="employmentProfile.department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="employmentProfile.startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="employmentProfile.endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="employmentProfile.isCurrentlyEmployed"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value ?? false}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">Currently employed</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="employmentProfile.email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="employmentProfile.contactNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact number</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Assigned clients */}
            <Card>
              <CardHeader>
                <CardTitle>Assigned clients</CardTitle>
                <p className="text-sm text-muted-foreground">
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
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
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
                          <ScrollArea className="h-[200px]">
                            <div className="p-2 space-y-2">
                              {clients.map((c) => {
                                const selected = field.value?.includes(c.uid) ?? false;
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
                                          field.onChange(current.filter((id) => id !== c.uid));
                                        }
                                      }}
                                    />
                                    <span>{c.name ?? `Client ${c.uid}`}</span>
                                  </label>
                                );
                              })}
                              {clients.length === 0 && (
                                <p className="text-sm text-muted-foreground py-4 text-center">
                                  No clients available
                                </p>
                              )}
                            </div>
                          </ScrollArea>
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
              </CardContent>
            </Card>

            {/* User targets */}
            <Card>
              <CardHeader>
                <CardTitle>User targets</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Performance targets and cost breakdown. Save separately from the main profile.
                </p>
              </CardHeader>
              <CardContent>
                <Form {...targetForm}>
                  <form onSubmit={targetForm.handleSubmit(onTargetSubmit)} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                        name="currentSalesAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current sales (amount)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="any"
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
                        name="currentQuotationsAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current quotations</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="any"
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
                        name="currentOrdersAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current orders (amount)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="any"
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
                            <FormControl>
                              <Input {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} placeholder="e.g. ZAR" />
                            </FormControl>
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
                              <Input type="number" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={targetForm.control}
                        name="currentHoursWorked"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current hours</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
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
                              <Input type="number" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={targetForm.control}
                        name="currentNewClients"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current new clients</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
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
                              <Input type="number" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={targetForm.control}
                        name="currentNewLeads"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current new leads</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
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
                              <Input type="number" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={targetForm.control}
                        name="currentCheckIns"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current check-ins</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
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
                              <Input type="number" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={targetForm.control}
                        name="currentCalls"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current calls</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <FormField
                        control={targetForm.control}
                        name="targetPeriod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target period</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} placeholder="e.g. monthly" />
                            </FormControl>
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
                              <Input type="date" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} />
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
                              <Input type="date" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} />
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
                                <SelectTrigger>
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
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <FormField
                          control={targetForm.control}
                          name="baseSalary"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Base salary</FormLabel>
                              <FormControl>
                                <Input type="number" step="any" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
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
                                <Input type="number" step="any" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
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
                                <Input type="number" step="any" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
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
                                <Input type="number" step="any" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
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
                                <Input type="number" step="any" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
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
                                <Input type="number" step="any" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
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
                                <Input type="number" step="any" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
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
                                <Input type="number" step="any" {...field} value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : Number(v)); }} />
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
                                <Input {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    <Button type="submit" disabled={patchUserTargetMutation.isPending}>
                      {patchUserTargetMutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : 'Save targets'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Managed branches */}
            <Card>
              <CardHeader>
                <CardTitle>Managed branches</CardTitle>
                <p className="text-sm text-muted-foreground">
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
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
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
                          <ScrollArea className="h-[200px]">
                            <div className="p-2 space-y-2">
                              {branches.map((b) => {
                                const selected = field.value?.includes(b.uid) ?? false;
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
                                    <span>{b.name ?? `Branch ${b.uid}`}</span>
                                  </label>
                                );
                              })}
                              {branches.length === 0 && (
                                <p className="text-sm text-muted-foreground py-4 text-center">
                                  No branches available
                                </p>
                              )}
                            </div>
                          </ScrollArea>
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
                                {b?.name ?? uid} ×
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
                <CardTitle>Managed staff</CardTitle>
                <p className="text-sm text-muted-foreground">
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
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
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
                          <ScrollArea className="h-[200px]">
                            <div className="p-2 space-y-2">
                              {users
                                .filter((u) => u.uid !== user?.uid)
                                .map((u) => {
                                  const selected =
                                    field.value?.includes(u.uid) ?? false;
                                  const label = `${u.name} ${u.surname}`.trim() || u.email;
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
                                })}
                              {users.length === 0 && (
                                <p className="text-sm text-muted-foreground py-4 text-center">
                                  No users available
                                </p>
                              )}
                            </div>
                          </ScrollArea>
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
                <CardTitle className="text-destructive">Danger zone</CardTitle>
                <p className="text-sm text-muted-foreground">
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
                    <p className="text-sm text-muted-foreground">
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
                    <p className="text-sm text-muted-foreground">
                      Deactivate this user. They can be restored later. For permanent removal, remove first then use
                      &quot;Permanently delete&quot; from this page.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button type="submit" disabled={patchUser.isPending}>
                {patchUser.isPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  'Save'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/reports')}
              >
                Cancel
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
                      router.push('/reports');
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
                      router.push('/reports');
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

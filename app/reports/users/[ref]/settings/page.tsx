'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  getBranchDisplayLabel,
} from '@/api/hooks';
import type { PatchUserBody, PatchUserTargetBody, UserListItem } from '@/api/endpoints/user';
import type { BranchListItem } from '@/api/types/branch';
import type { ClientListItem } from '@/api/types/clients';
import { Loader2Icon, ChevronLeftIcon, ChevronDownIcon, MapPinIcon } from '@/lib/icons';
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
  targetCurrency: z.string().optional().nullable(),
  targetHoursWorked: z.number().optional().nullable(),
  targetNewClients: z.number().optional().nullable(),
  targetNewLeads: z.number().optional().nullable(),
  targetCheckIns: z.number().optional().nullable(),
  targetCalls: z.number().optional().nullable(),
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
  performanceWarningLevel: z.enum(['none', '1', '2', '3']).optional().nullable(),
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
  workforceType: z.string().optional(),
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

/** Normalize API date strings (ISO or yyyy-mm-dd) for date inputs. */
function parseFormDateInput(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  }
  try {
    const d = new Date(v as string | number | Date);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

/** ISO 4217 currency options for target currency dropdown. */
const CURRENCY_OPTIONS = [
  { value: 'ZAR', label: 'ZAR - South African Rand' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'CHF', label: 'CHF - Swiss Franc' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'BWP', label: 'BWP - Botswana Pula' },
  { value: 'NAD', label: 'NAD - Namibian Dollar' },
  { value: 'SZL', label: 'SZL - Swazi Lilangeni' },
  { value: 'LSL', label: 'LSL - Lesotho Loti' },
  { value: 'NGN', label: 'NGN - Nigerian Naira' },
  { value: 'KES', label: 'KES - Kenyan Shilling' },
  { value: 'GHS', label: 'GHS - Ghanaian Cedi' },
  { value: 'MUR', label: 'MUR - Mauritian Rupee' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'CNY', label: 'CNY - Chinese Yuan' },
];

/** Target period options for dropdown. */
const TARGET_PERIOD_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

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
  workforceType?: string | null;
  departmentId?: number | null;
  branch?: { uid?: number } | null;
  branchUid?: number | null;
  managedBranches?: number[];
  managedStaff?: number[];
  businesscardURL?: string | null;
  userProfile?: Record<string, unknown> | null;
  userEmployeementProfile?: Record<string, unknown> | null;
  assignedClientIds?: number[];
};

/** Primary branch FK from API: treat non-positive / invalid as unassigned (never send uid 0 on PATCH). */
function normalizePrimaryBranchUid(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

/** Build userTarget object from target form values (only defined, non-empty). */
function buildUserTargetBody(values: TargetFormValues): PatchUserTargetBody | undefined {
  const keys: (keyof PatchUserTargetBody)[] = [
    'targetSalesAmount', 'targetQuotationsAmount',
    'targetCurrency', 'targetHoursWorked', 'targetNewClients',
    'targetNewLeads', 'targetCheckIns', 'targetCalls',
    'targetPeriod', 'periodStartDate', 'periodEndDate', 'isRecurring', 'recurringInterval', 'carryForwardUnfulfilled',
    'baseSalary', 'carInstalment', 'carInsurance', 'fuel', 'cellPhoneAllowance', 'carMaintenance', 'cgicCosts', 'totalCost', 'erpSalesRepCode',
  ];
  const body: PatchUserTargetBody = {};
  for (const k of keys) {
    const v = values[k as keyof TargetFormValues];
    if (v !== undefined && v !== null && v !== '') {
      (body as Record<string, unknown>)[k] = v;
    }
  }
  return Object.keys(body).length > 0 ? body : undefined;
}

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
  if (!sameStr(user.workforceType, values.workforceType))
    body.workforceType = values.workforceType?.trim() || undefined;

  if (!sameNum(user.departmentId ?? undefined, values.departmentId))
    body.departmentId = values.departmentId ?? undefined;

  const userBranchUid = normalizePrimaryBranchUid(user.branch?.uid ?? user.branchUid ?? null);
  const valuesBranchNorm = normalizePrimaryBranchUid(values.branchUid ?? null);
  if (!sameNum(userBranchUid, valuesBranchNorm))
    body.branch = valuesBranchNorm != null ? { uid: valuesBranchNorm } : undefined;

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
  const bool = (v: unknown): boolean | null =>
    v === null || v === undefined ? null : typeof v === 'boolean' ? v : null;

  const src =
    ut && typeof ut === 'object' && (ut as { personalTargets?: Record<string, unknown> }).personalTargets
      ? ((ut as { personalTargets: Record<string, unknown> }).personalTargets as Record<string, unknown>)
      : ut;

  const tw =
    (ut as { personalTargets?: { targetWarnings?: { level?: number } } })?.personalTargets?.targetWarnings ??
    (ut as { targetWarnings?: { level?: number } })?.targetWarnings;
  const lvl = tw?.level;
  const performanceWarningLevel: 'none' | '1' | '2' | '3' =
    lvl === 1 || lvl === 2 || lvl === 3 ? String(lvl) as '1' | '2' | '3' : 'none';

  if (!src) {
    return {
      targetSalesAmount: null, targetQuotationsAmount: null, targetCurrency: null,
      targetHoursWorked: null, targetNewClients: null,
      targetNewLeads: null, targetCheckIns: null, targetCalls: null, targetPeriod: null,
      periodStartDate: null, periodEndDate: null,
      isRecurring: null, recurringInterval: null, carryForwardUnfulfilled: null,
      baseSalary: null, carInstalment: null, carInsurance: null, fuel: null, cellPhoneAllowance: null,
      carMaintenance: null, cgicCosts: null, totalCost: null, erpSalesRepCode: null,
      performanceWarningLevel: 'none',
    };
  }
  return {
    targetSalesAmount: num(src.targetSalesAmount),
    targetQuotationsAmount: num(src.targetQuotationsAmount),
    targetCurrency: str(src.targetCurrency),
    targetHoursWorked: num(src.targetHoursWorked),
    targetNewClients: num(src.targetNewClients),
    targetNewLeads: num(src.targetNewLeads),
    targetCheckIns: num(src.targetCheckIns),
    targetCalls: num(src.targetCalls),
    targetPeriod: str(src.targetPeriod),
    periodStartDate: parseFormDateInput(src.periodStartDate),
    periodEndDate: parseFormDateInput(src.periodEndDate),
    isRecurring: bool(src.isRecurring),
    recurringInterval: (src.recurringInterval === 'daily' || src.recurringInterval === 'weekly' || src.recurringInterval === 'monthly') ? src.recurringInterval : null,
    carryForwardUnfulfilled: bool(src.carryForwardUnfulfilled),
    baseSalary: num(src.baseSalary),
    carInstalment: num(src.carInstalment),
    carInsurance: num(src.carInsurance),
    fuel: num(src.fuel),
    cellPhoneAllowance: num(src.cellPhoneAllowance),
    carMaintenance: num(src.carMaintenance),
    cgicCosts: num(src.cgicCosts),
    totalCost: num(src.totalCost),
    erpSalesRepCode: str(src.erpSalesRepCode),
    performanceWarningLevel,
  };
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
        businesscardURL: up.businesscardURL ?? null,
        profile: profile ? {
          height: (profile.height as string) ?? null,
          weight: (profile.weight as string) ?? null,
          hairColor: (profile.hairColor as string) ?? null,
          eyeColor: (profile.eyeColor as string) ?? null,
          gender: (profile.gender as string) ?? null,
          dateOfBirth: parseFormDateInput(profile.dateOfBirth),
          address: (profile.address as string) ?? null,
          city: (profile.city as string) ?? null,
          country: (profile.country as string) ?? null,
        } : { height: null, weight: null, hairColor: null, eyeColor: null, gender: null, dateOfBirth: null, address: null, city: null, country: null },
        employmentProfile: emp ? {
          branchref: (emp.branchref as string) ?? null,
          position: (emp.position as string) ?? null,
          department: (emp.department as string) ?? null,
          startDate: parseFormDateInput(emp.startDate),
          endDate: parseFormDateInput(emp.endDate),
          isCurrentlyEmployed: (emp.isCurrentlyEmployed as boolean) ?? null,
          email: empEmail || null,
          contactNumber: empContact || null,
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

  const onSubmit = (values: FormValues) => {
    const body = buildPatchBody(user ?? undefined, values);
    let targetPayload = buildUserTargetBody(targetForm.getValues());
    if (targetForm.formState.dirtyFields.performanceWarningLevel) {
      const v = targetForm.getValues().performanceWarningLevel;
      targetPayload = targetPayload ?? {};
      if (v && v !== 'none') {
        targetPayload.targetWarnings = {
          level: Number(v) as 1 | 2 | 3,
          issuedAt: new Date().toISOString(),
        };
      } else {
        targetPayload.targetWarnings = null;
      }
    }
    if (targetPayload) {
      body.userTarget = targetPayload;
    }
    const hasChanges = Object.keys(body).length > 0;
    if (!hasChanges) {
      toast.success('No changes to save');
      return;
    }
    patchUser.mutate(body, {
      onSuccess: () => {
        toast.success(body.userTarget ? 'User and targets updated' : 'User updated');
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
                <CardTitle className="text-sm sm:text-base">Identity & access</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  User reference, HR ID, role, access level, workforce type and status.
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

            {/* User profile */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">User profile</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Physical details and personal information.
                </p>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
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
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
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
                <CardTitle className="text-sm sm:text-base">Employment profile</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Position, department, and employment dates.
                </p>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
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
              </CardContent>
            </Card>

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
                      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
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

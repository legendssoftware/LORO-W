import type { PatchUserBody, PatchUserTargetBody } from '@/api/endpoints/user';
import type {
  AddUserWizardValues,
  TargetFormValues,
  UserFormValues,
} from './schemas';

/** Normalize API date strings (ISO or yyyy-mm-dd) for date inputs. */
export function parseFormDateInput(v: unknown): string | null {
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

/** Primary branch FK: treat non-positive / invalid as unassigned. */
export function normalizePrimaryBranchUid(
  value: number | null | undefined
): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

/** Build userTarget object from target form values (only defined, non-empty). */
export function buildUserTargetBody(
  values: TargetFormValues
): PatchUserTargetBody | undefined {
  const keys: (keyof PatchUserTargetBody)[] = [
    'targetSalesAmount',
    'targetQuotationsAmount',
    'targetCurrency',
    'targetHoursWorked',
    'targetNewClients',
    'targetNewLeads',
    'targetCheckIns',
    'targetCalls',
    'targetPeriod',
    'periodStartDate',
    'periodEndDate',
    'isRecurring',
    'recurringInterval',
    'carryForwardUnfulfilled',
    'baseSalary',
    'carInstalment',
    'carInsurance',
    'fuel',
    'cellPhoneAllowance',
    'carMaintenance',
    'cgicCosts',
    'totalCost',
    'erpSalesRepCode',
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

/** User shape used for diffing (subset of API response). */
export type UserBaseline = {
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

/** Build PATCH body with only fields that changed. */
export function buildPatchBody(
  user: UserBaseline | null | undefined,
  values: UserFormValues
): PatchUserBody {
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

  const userBranchUid = normalizePrimaryBranchUid(
    user.branch?.uid ?? user.branchUid ?? null
  );
  const valuesBranchNorm = normalizePrimaryBranchUid(values.branchUid ?? null);
  if (!sameNum(userBranchUid, valuesBranchNorm))
    body.branch =
      valuesBranchNorm != null ? { uid: valuesBranchNorm } : undefined;

  if (!sameArr(user.managedBranches, values.managedBranches))
    body.managedBranches = values.managedBranches?.length
      ? values.managedBranches
      : undefined;
  if (!sameArr(user.managedStaff, values.managedStaff))
    body.managedStaff = values.managedStaff?.length
      ? values.managedStaff
      : undefined;

  if (norm(user.businesscardURL ?? null) !== norm(values.businesscardURL ?? null))
    body.businesscardURL = values.businesscardURL ?? undefined;

  const sameProfile = (
    a: Record<string, unknown> | null | undefined,
    b: UserFormValues['profile'] | UserFormValues['employmentProfile']
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
  if (
    !sameProfile(user.userProfile ?? null, values.profile ?? null) &&
    values.profile
  )
    body.profile = values.profile as PatchUserBody['profile'];
  if (
    !sameProfile(
      user.userEmployeementProfile ?? null,
      values.employmentProfile ?? null
    ) &&
    values.employmentProfile
  )
    body.employmentProfile = {
      ...values.employmentProfile,
      isCurrentlyEmployed:
        values.employmentProfile.isCurrentlyEmployed ?? undefined,
    } as PatchUserBody['employmentProfile'];

  if (!sameArr(user.assignedClientIds, values.assignedClientIds))
    body.assignedClientIds = values.assignedClientIds?.length
      ? values.assignedClientIds
      : undefined;

  return body;
}

function hasEmploymentData(
  ep: NonNullable<UserFormValues['employmentProfile']>
): boolean {
  return Object.values(ep).some(
    (v) => v !== null && v !== undefined && v !== '' && v !== false
  );
}

function hasProfileData(
  profile: NonNullable<UserFormValues['profile']>
): boolean {
  return Object.values(profile).some(
    (v) => v !== null && v !== undefined && v !== ''
  );
}

/** Collect optional fields for post-invite PATCH (no diff against existing user). */
export function buildInviteFollowUpPatchBody(
  values: AddUserWizardValues
): PatchUserBody {
  const body: PatchUserBody = {};
  const norm = (s: string | null | undefined) => (s ?? '').trim();

  if (norm(values.userref)) body.userref = norm(values.userref);
  if (values.hrID != null) body.hrID = values.hrID;
  if (norm(values.status)) body.status = norm(values.status);
  if (values.departmentId != null) body.departmentId = values.departmentId;

  if (norm(values.businesscardURL))
    body.businesscardURL = norm(values.businesscardURL);

  if (values.managedBranches?.length)
    body.managedBranches = values.managedBranches;
  if (values.managedStaff?.length) body.managedStaff = values.managedStaff;
  if (values.assignedClientIds?.length)
    body.assignedClientIds = values.assignedClientIds;

  if (values.profile && hasProfileData(values.profile)) {
    body.profile = values.profile as PatchUserBody['profile'];
  }

  if (
    values.employmentProfile &&
    hasEmploymentData(values.employmentProfile)
  ) {
    body.employmentProfile = {
      ...values.employmentProfile,
      isCurrentlyEmployed:
        values.employmentProfile.isCurrentlyEmployed ?? undefined,
    } as PatchUserBody['employmentProfile'];
  }

  const targetPayload = buildUserTargetBody(values);
  if (targetPayload) body.userTarget = targetPayload;

  return body;
}

/** Default form values for user targets from API userTarget or null. */
export function getDefaultTargetValues(
  ut: Record<string, unknown> | null
): TargetFormValues {
  const num = (v: unknown): number | null =>
    v === null || v === undefined
      ? null
      : typeof v === 'number' && !Number.isNaN(v)
        ? v
        : null;
  const str = (v: unknown): string | null =>
    v === null || v === undefined
      ? null
      : typeof v === 'string'
        ? v
        : null;
  const bool = (v: unknown): boolean | null =>
    v === null || v === undefined
      ? null
      : typeof v === 'boolean'
        ? v
        : null;

  const src =
    ut &&
    typeof ut === 'object' &&
    (ut as { personalTargets?: Record<string, unknown> }).personalTargets
      ? ((ut as { personalTargets: Record<string, unknown> })
          .personalTargets as Record<string, unknown>)
      : ut;

  const tw =
    (ut as { personalTargets?: { targetWarnings?: { level?: number } } })
      ?.personalTargets?.targetWarnings ??
    (ut as { targetWarnings?: { level?: number } })?.targetWarnings;
  const lvl = tw?.level;
  const performanceWarningLevel: 'none' | '1' | '2' | '3' =
    lvl === 1 || lvl === 2 || lvl === 3
      ? (String(lvl) as '1' | '2' | '3')
      : 'none';

  if (!src) {
    return {
      targetSalesAmount: null,
      targetQuotationsAmount: null,
      targetCurrency: null,
      targetHoursWorked: null,
      targetNewClients: null,
      targetNewLeads: null,
      targetCheckIns: null,
      targetCalls: null,
      targetPeriod: null,
      periodStartDate: null,
      periodEndDate: null,
      isRecurring: null,
      recurringInterval: null,
      carryForwardUnfulfilled: null,
      baseSalary: null,
      carInstalment: null,
      carInsurance: null,
      fuel: null,
      cellPhoneAllowance: null,
      carMaintenance: null,
      cgicCosts: null,
      totalCost: null,
      erpSalesRepCode: null,
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
    recurringInterval:
      src.recurringInterval === 'daily' ||
      src.recurringInterval === 'weekly' ||
      src.recurringInterval === 'monthly'
        ? src.recurringInterval
        : null,
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

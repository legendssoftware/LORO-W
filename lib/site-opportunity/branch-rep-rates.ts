import type { TeamTargetMember } from '@/api/endpoints/erp-team-targets';
import type { TeamCompositionSlice } from '@/api/endpoints/user-team-composition';
import { getBranchDisplayLabel } from '@/api/types/branch';
import type { BranchListItem } from '@/api/types/branch';

export type WorkforceHeadcount = {
  internal: number;
  external: number;
  total: number;
};

export type BranchRepRateRow = {
  userId: number | null;
  fullName: string;
  personMonthSalesZAR: number;
  branchMonthSalesZAR: number | null;
  equalShareZAR: number;
  remainingToShareZAR: number;
};

/**
 * Filter team-target members to a branch by display label (Reports pattern).
 */
export function filterTeamMembersByBranchLabel(
  members: TeamTargetMember[] | undefined,
  branchLabel: string | null | undefined,
): TeamTargetMember[] {
  if (!members?.length) return [];
  const needle = (branchLabel ?? '').trim().toLowerCase();
  if (!needle) return [];
  return members.filter(
    (m) => (m.branchName ?? '').trim().toLowerCase() === needle,
  );
}

export function branchLabelForId(
  branches: BranchListItem[] | undefined,
  branchId: string | number | null | undefined,
): string | null {
  if (branchId == null || !branches?.length) return null;
  const uid = Number(branchId);
  if (!Number.isFinite(uid)) return null;
  const branch = branches.find((b) => b.uid === uid) ?? null;
  const label = getBranchDisplayLabel(branch);
  return label || null;
}

export function workforceHeadcountFromComposition(
  byWorkforce: TeamCompositionSlice[] | undefined,
  totalFallback?: number,
): WorkforceHeadcount {
  let internal = 0;
  let external = 0;
  for (const slice of byWorkforce ?? []) {
    const name = slice.name.trim().toLowerCase();
    if (name === 'internal') internal = slice.value;
    else if (name === 'external') external = slice.value;
  }
  const total =
    totalFallback != null && Number.isFinite(totalFallback)
      ? totalFallback
      : internal + external;
  return { internal, external, total };
}

export function personMonthSalesZAR(member: TeamTargetMember): number {
  return (
    Number(member.sales?.totalRevenue ?? member.targets?.sales?.current ?? 0) ||
    0
  );
}

/**
 * Equal share of model monthly target across branch reps.
 * Prefers filtered member count; falls back to composition total.
 */
export function equalShareMonthlyZAR(
  simulatedMonthlyZAR: number,
  branchRepCount: number,
): number {
  const n = Math.max(1, branchRepCount);
  if (!(simulatedMonthlyZAR > 0)) return 0;
  return simulatedMonthlyZAR / n;
}

export function branchGapToModelZAR(
  simulatedMonthlyZAR: number,
  actualMonthlyZAR: number | null | undefined,
): number | null {
  if (actualMonthlyZAR == null || !Number.isFinite(actualMonthlyZAR)) {
    return null;
  }
  return Math.max(0, simulatedMonthlyZAR - actualMonthlyZAR);
}

export function buildBranchRepRateRows(options: {
  members: TeamTargetMember[];
  simulatedMonthlyZAR: number;
  actualMonthlyZAR: number | null | undefined;
  compositionTotal?: number;
}): BranchRepRateRow[] {
  const { members, simulatedMonthlyZAR, actualMonthlyZAR, compositionTotal } =
    options;
  const repCount =
    members.length > 0
      ? members.length
      : Math.max(1, compositionTotal ?? 1);
  const equalShare = equalShareMonthlyZAR(simulatedMonthlyZAR, repCount);
  const branchMonth =
    actualMonthlyZAR != null && Number.isFinite(actualMonthlyZAR)
      ? actualMonthlyZAR
      : null;

  return members.map((m) => {
    const person = personMonthSalesZAR(m);
    return {
      userId: m.userId != null ? Number(m.userId) : null,
      fullName: (m.fullName ?? m.email ?? 'Sales rep').trim() || 'Sales rep',
      personMonthSalesZAR: person,
      branchMonthSalesZAR: branchMonth,
      equalShareZAR: equalShare,
      remainingToShareZAR: Math.max(0, equalShare - person),
    };
  });
}

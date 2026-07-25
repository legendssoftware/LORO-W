/**
 * Target progress helpers aligned with server `getUserTarget` pct():
 * progress = min(100, round((current / target) * 100)) when target > 0, else 0.
 *
 * Calls + leads use the combined engagement gate from
 * `server/src/user/shift-performance-warning.util.ts` (full either quota, or
 * combined total ≥ max of the two quotas — e.g. 30+30 when both are 60).
 */

export function targetNum(value: unknown): number {
  if (value == null) return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Matches server `pct(current, target)` in user.service getUserTarget. */
export function calcTargetProgress(current: unknown, target: unknown): number {
  const t = targetNum(target);
  if (t <= 0) return 0;
  const c = targetNum(current);
  return Math.min(100, Math.round((c / t) * 100));
}

export interface CallsLeadsEngagementInput {
  actualCalls: unknown;
  actualLeads: unknown;
  targetCalls: unknown;
  targetLeads: unknown;
}

/**
 * True when calls+leads engagement is met (mirror of server
 * `isMissedDailyCallsLeadsEngagement` inverted).
 */
export function isCallsLeadsEngagementMet(
  params: CallsLeadsEngagementInput
): boolean {
  const actualCalls = targetNum(params.actualCalls);
  const actualLeads = targetNum(params.actualLeads);
  const targetCalls = targetNum(params.targetCalls);
  const targetLeads = targetNum(params.targetLeads);
  const hasCalls = targetCalls > 0;
  const hasLeads = targetLeads > 0;

  if (!hasCalls && !hasLeads) return false;
  if (hasCalls && !hasLeads) return actualCalls >= targetCalls;
  if (hasLeads && !hasCalls) return actualLeads >= targetLeads;

  const combinedMin = Math.max(targetCalls, targetLeads);
  const metViaCalls = actualCalls >= targetCalls;
  const metViaLeads = actualLeads >= targetLeads;
  const metViaCombined = actualCalls + actualLeads >= combinedMin;
  return metViaCalls || metViaLeads || metViaCombined;
}

/**
 * Progress toward the calls+leads engagement gate (0–100).
 * When both quotas are set: 100 if met, else (calls+leads) / max(targets).
 * When only one quota is set: standard single-metric progress.
 */
export function calcCallsLeadsEngagementProgress(
  params: CallsLeadsEngagementInput
): number {
  const actualCalls = targetNum(params.actualCalls);
  const actualLeads = targetNum(params.actualLeads);
  const targetCalls = targetNum(params.targetCalls);
  const targetLeads = targetNum(params.targetLeads);
  const hasCalls = targetCalls > 0;
  const hasLeads = targetLeads > 0;

  if (!hasCalls && !hasLeads) return 0;
  if (hasCalls && !hasLeads) return calcTargetProgress(actualCalls, targetCalls);
  if (hasLeads && !hasCalls) return calcTargetProgress(actualLeads, targetLeads);

  if (
    isCallsLeadsEngagementMet({
      actualCalls,
      actualLeads,
      targetCalls,
      targetLeads,
    })
  ) {
    return 100;
  }

  const combinedMin = Math.max(targetCalls, targetLeads);
  return calcTargetProgress(actualCalls + actualLeads, combinedMin);
}

/**
 * Per-column progress for Calls/Leads cells.
 * When both quotas are set and engagement is met, both columns show 100 (Done).
 * Otherwise each column keeps its own current/target progress for transparency.
 */
export function resolveCallsLeadsCellProgress(
  params: CallsLeadsEngagementInput
): {
  callsProgress: number;
  leadsProgress: number;
  engagementProgress: number;
  engagementMet: boolean;
} {
  const actualCalls = targetNum(params.actualCalls);
  const actualLeads = targetNum(params.actualLeads);
  const targetCalls = targetNum(params.targetCalls);
  const targetLeads = targetNum(params.targetLeads);
  const hasCalls = targetCalls > 0;
  const hasLeads = targetLeads > 0;
  const engagementProgress = calcCallsLeadsEngagementProgress(params);
  const engagementMet = isCallsLeadsEngagementMet(params);

  if (hasCalls && hasLeads) {
    return {
      callsProgress: engagementMet
        ? 100
        : calcTargetProgress(actualCalls, targetCalls),
      leadsProgress: engagementMet
        ? 100
        : calcTargetProgress(actualLeads, targetLeads),
      engagementProgress,
      engagementMet,
    };
  }

  return {
    callsProgress: hasCalls ? calcTargetProgress(actualCalls, targetCalls) : 0,
    leadsProgress: hasLeads ? calcTargetProgress(actualLeads, targetLeads) : 0,
    engagementProgress,
    engagementMet,
  };
}

/**
 * Equal average of progress for metrics that have target > 0.
 * Returns 0 when no active metrics.
 */
export function calcOverallAchievement(
  metrics: ReadonlyArray<{ current: unknown; target: unknown; progress?: number | null }>
): number {
  const active = metrics.filter((m) => targetNum(m.target) > 0);
  if (active.length === 0) return 0;
  const sum = active.reduce((acc, m) => {
    if (typeof m.progress === 'number' && Number.isFinite(m.progress)) {
      return acc + Math.min(100, Math.max(0, Math.round(m.progress)));
    }
    return acc + calcTargetProgress(m.current, m.target);
  }, 0);
  return Math.min(100, Math.round(sum / active.length));
}

/**
 * Overall achievement where Calls+Leads (when both targets are set) count as
 * one engagement dimension instead of two independent 100% slots.
 */
export function calcOverallAchievementWithEngagement(params: {
  calls: { current: unknown; target: unknown; progress?: number | null };
  leads: { current: unknown; target: unknown; progress?: number | null };
  sales: { current: unknown; target: unknown; progress?: number | null };
  hours: { current: unknown; target: unknown; progress?: number | null };
}): number {
  const callTarget = targetNum(params.calls.target);
  const leadTarget = targetNum(params.leads.target);
  const hasCalls = callTarget > 0;
  const hasLeads = leadTarget > 0;

  if (hasCalls && hasLeads) {
    const actualCalls = targetNum(params.calls.current);
    const actualLeads = targetNum(params.leads.current);
    const engagementProgress = calcCallsLeadsEngagementProgress({
      actualCalls,
      actualLeads,
      targetCalls: callTarget,
      targetLeads: leadTarget,
    });
    return calcOverallAchievement([
      {
        current: actualCalls + actualLeads,
        target: Math.max(callTarget, leadTarget),
        progress: engagementProgress,
      },
      params.sales,
      params.hours,
    ]);
  }

  return calcOverallAchievement([
    params.calls,
    params.leads,
    params.sales,
    params.hours,
  ]);
}

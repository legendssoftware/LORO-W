import type {
  TargetWarningHistoryEntry,
  TargetWarningsPayload,
} from '@/api/endpoints/user';

export interface TargetWarningSummary {
  totalIssued: number;
  totalAcknowledged: number;
  pendingCount: number;
  currentLevel: 1 | 2 | 3 | null;
}

/** Normalize stored or legacy single-tier state into a chronological history list. */
export function getTargetWarningHistory(
  tw: TargetWarningsPayload | null | undefined
): TargetWarningHistoryEntry[] {
  if (tw == null) return [];
  if (tw.history?.length) return [...tw.history];
  if (tw.level == null) return [];

  const ackLevel = tw.acknowledgedLevel ?? 0;
  const ackAt = tw.acknowledgedAt;
  const issuedAt = tw.issuedAt ?? new Date(0).toISOString();
  const entries: TargetWarningHistoryEntry[] = [];

  for (let tier = 1; tier <= tw.level; tier++) {
    const level = tier as 1 | 2 | 3;
    entries.push({
      level,
      issuedAt: tier === tw.level ? issuedAt : issuedAt,
      ...(tier <= ackLevel && ackAt ? { acknowledgedAt: ackAt } : {}),
      source: 'manual',
    });
  }

  return entries;
}

export function summarizeTargetWarnings(
  tw: TargetWarningsPayload | null | undefined
): TargetWarningSummary {
  const history = getTargetWarningHistory(tw);
  const currentLevel = tw?.level ?? null;
  const pendingCount =
    currentLevel != null && currentLevel > (tw?.acknowledgedLevel ?? 0) ? 1 : 0;

  return {
    totalIssued: history.length,
    totalAcknowledged: history.filter((entry) => entry.acknowledgedAt).length,
    pendingCount,
    currentLevel,
  };
}

export function hasTargetWarningHistory(
  tw: TargetWarningsPayload | null | undefined
): boolean {
  return getTargetWarningHistory(tw).length > 0;
}

/**
 * Copy aligned with formal performance warning emails (tiers 1–3).
 * Mirror server/src/lib/utils/performance-warning-letter.ts when changing copy.
 */

export type PerformanceWarningLevel = 1 | 2 | 3;

export interface PerformanceWarningQuotaContext {
  dailyCalls: number | null;
  dailyVisits: number | null;
  dailyLeads: number | null;
  actualCalls?: number;
  actualVisits?: number;
  actualLeads?: number;
  missedVisits?: boolean;
  missedCallsLeadsEngagement?: boolean;
}

export function performanceWarningTitle(level: PerformanceWarningLevel): string {
  switch (level) {
    case 1:
      return 'Performance Warning – Activity Below Minimum Standard';
    case 2:
      return 'Second Warning – Failure to Meet Minimum Activity Requirements';
    case 3:
      return 'Final Warning – Non-Compliance with Performance Requirements';
    default: {
      const _exhaustive: never = level;
      void _exhaustive;
      return 'Performance warning';
    }
  }
}

export interface PerformanceWarningCopy {
  title: string;
  intro: string;
  bullets: string[];
  footerNote: string;
}

function interpolateName(text: string, employeeName: string): string {
  return text.replace(/\{employeeName\}/g, employeeName);
}

function formatQuota(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return (Math.round(n * 10) / 10).toFixed(1);
}

/** Build human-readable daily requirement lines from persisted miss context. */
export function buildDailyRequirementLines(
  quotas?: PerformanceWarningQuotaContext | null
): string[] {
  if (quotas == null) {
    return [
      '• Your configured minimum daily calls, visits, and/or leads targets',
      '• Activity is evaluated each workday against your personal targets',
    ];
  }

  const lines: string[] = [];
  const hasCalls = quotas.dailyCalls != null && quotas.dailyCalls > 0;
  const hasVisits = quotas.dailyVisits != null && quotas.dailyVisits > 0;
  const hasLeads = quotas.dailyLeads != null && quotas.dailyLeads > 0;

  if (hasCalls) {
    lines.push(`• ${formatQuota(quotas.dailyCalls!)} calls per day`);
  }
  if (hasVisits) {
    lines.push(`• ${formatQuota(quotas.dailyVisits!)} visits (physical check-ins) per day`);
  }
  if (hasLeads) {
    lines.push(`• ${formatQuota(quotas.dailyLeads!)} leads per day`);
  }
  if (hasCalls && hasLeads) {
    const combined = Math.max(quotas.dailyCalls!, quotas.dailyLeads!);
    lines.push(
      `• Or combined calls+leads engagement of at least ${formatQuota(combined)} (full either quota also counts)`
    );
  }

  if (quotas.missedVisits || quotas.missedCallsLeadsEngagement) {
    const actualBits: string[] = [];
    if (hasCalls || quotas.missedCallsLeadsEngagement) {
      actualBits.push(`${quotas.actualCalls ?? 0} calls`);
    }
    if (hasVisits || quotas.missedVisits) {
      actualBits.push(`${quotas.actualVisits ?? 0} visits`);
    }
    if (hasLeads || quotas.missedCallsLeadsEngagement) {
      actualBits.push(`${quotas.actualLeads ?? 0} leads`);
    }
    if (actualBits.length) {
      lines.push(`Your recorded activity for that day: ${actualBits.join(', ')}.`);
    }
  }

  return lines.length
    ? lines
    : [
        '• Your configured minimum daily calls, visits, and/or leads targets',
        '• Activity is evaluated each workday against your personal targets',
      ];
}

export function getPerformanceWarningCopy(
  level: PerformanceWarningLevel,
  employeeName: string,
  quotas?: PerformanceWarningQuotaContext | null
): PerformanceWarningCopy {
  const name = employeeName.trim() || 'there';
  const requirementLines = buildDailyRequirementLines(quotas);

  switch (level) {
    case 1:
      return {
        title: performanceWarningTitle(1),
        intro: interpolateName(
          'Dear {employeeName},\n\nThis serves as a formal notice that your current activity is below the minimum required standard.',
          name
        ),
        bullets: [
          'As communicated, your minimum daily requirement is:',
          ...requirementLines,
          'Your recent performance has not met these requirements.',
          'You are required to improve your performance immediately and consistently meet the minimum daily targets.',
          'We will monitor your activity closely over the next few days.',
          'Failure to improve will result in further disciplinary action.',
        ],
        footerNote: interpolateName('Regards,\nManagement', name),
      };
    case 2:
      return {
        title: performanceWarningTitle(2),
        intro: interpolateName(
          'Dear {employeeName},\n\nFollowing the previous warning issued, your performance continues to fall below the required minimum standards.',
          name
        ),
        bullets: [
          'You are still not achieving:',
          ...requirementLines,
          'This is a serious concern.',
          'Please understand:',
          '• These targets are not optional',
          '• They are the minimum acceptable level of performance for your role',
          'You are hereby given a final opportunity to correct your performance immediately.',
          'Your activity will be monitored daily.',
          'Failure to meet the required standards will result in a final warning and may lead to termination.',
        ],
        footerNote: interpolateName('Regards,\nManagement', name),
      };
    case 3:
      return {
        title: performanceWarningTitle(3),
        intro: interpolateName(
          'Dear {employeeName},\n\nDespite previous warnings, you have failed to meet the minimum required activity levels.',
          name
        ),
        bullets: [
          'This includes falling short of:',
          ...requirementLines,
          'At this stage, this is considered serious underperformance and non-compliance with your job requirements.',
          'You are hereby issued a Final Written Warning.',
          'Effective immediately:',
          '• You must meet the daily minimum targets without exception',
          '• Your performance will be monitored strictly on a daily basis',
          'Failure to improve immediately will result in termination of employment.',
        ],
        footerNote: interpolateName('Regards,\nManagement', name),
      };
    default: {
      const _exhaustive: never = level;
      void _exhaustive;
      return getPerformanceWarningCopy(1, name, quotas);
    }
  }
}

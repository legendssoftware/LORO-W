/**
 * Copy aligned with formal performance warning emails (tiers 1–3).
 */

export type PerformanceWarningLevel = 1 | 2 | 3;

export function performanceWarningTitle(level: PerformanceWarningLevel): string {
  switch (level) {
    case 1:
      return 'Performance Warning – Sales Activity Below Minimum Standard';
    case 2:
      return 'Second Warning – Failure to Meet Minimum Sales Requirements';
    case 3:
      return 'Final Warning – Non-Compliance with Sales Performance Requirements';
    default:
      return 'Performance warning';
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

export function getPerformanceWarningCopy(
  level: PerformanceWarningLevel,
  employeeName: string
): PerformanceWarningCopy {
  const name = employeeName.trim() || 'there';

  switch (level) {
    case 1:
      return {
        title: performanceWarningTitle(1),
        intro: interpolateName(
          'Dear {employeeName},\n\nThis serves as a formal notice that your current sales activity is below the minimum required standard.',
          name
        ),
        bullets: [
          'As communicated, the minimum daily requirement is:',
          '• 60 calls per day (internal sales)',
          '• Minimum expected quoting activity based on call conversion',
          'Your recent performance has not met these requirements.',
          'These benchmarks are realistic and achievable, based on:',
          '• Average call cycle time (2–4 minutes)',
          '• A full working day allowing for 60–120 calls',
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
          '• Minimum 60 calls per day',
          '• Expected quoting output based on activity',
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
          'Dear {employeeName},\n\nDespite previous warnings, you have failed to meet the minimum required sales activity levels.',
          name
        ),
        bullets: [
          'This includes:',
          '• Not achieving 60 calls per day',
          '• Insufficient quoting activity relative to expected conversion',
          'At this stage, this is considered serious underperformance and non-compliance with your job requirements.',
          'You are hereby issued a Final Written Warning.',
          'Effective immediately:',
          '• You must meet the daily minimum targets without exception',
          '• Your performance will be monitored strictly on a daily basis',
          'Failure to improve immediately will result in termination of employment.',
        ],
        footerNote: interpolateName('Regards,\nManagement', name),
      };
    default:
      return getPerformanceWarningCopy(1, name);
  }
}

import { ClipboardList, PhoneCall, ShieldCheck, Sparkles, Target } from 'lucide-react';

export type ReportsTabId = 'targets' | 'policy' | 'call-quality' | 'insights' | 'tasks';

export interface ReportsTabDefinition {
  id: ReportsTabId;
  label: string;
  icon: typeof Target;
}

export const REPORTS_TABS: readonly ReportsTabDefinition[] = [
  {
    id: 'targets',
    label: 'Targets',
    icon: Target,
  },
  {
    id: 'policy',
    label: 'Policy',
    icon: ShieldCheck,
  },
  {
    id: 'call-quality',
    label: 'Call quality',
    icon: PhoneCall,
  },
  {
    id: 'insights',
    label: 'Insights',
    icon: Sparkles,
  },
  {
    id: 'tasks',
    label: 'Tasks & planning',
    icon: ClipboardList,
  },
] as const;

export function reportsSubtitle(scope: 'org' | 'team' | 'self'): string {
  switch (scope) {
    case 'org':
      return 'Org performance targets, policy, call quality, tasks and planning, and activity intelligence.';
    case 'team':
      return 'Your team performance targets, policy, call quality, tasks and planning, and activity intelligence.';
    case 'self':
      return 'Your performance targets, policy, tasks and planning, and activity intelligence for the selected period.';
    default: {
      const _exhaustive: never = scope;
      return _exhaustive;
    }
  }
}

import type { ComponentType } from 'react';
import { ClipboardList, PhoneCall, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { ReportsOverviewTab } from '../components/reports-overview-tab';
import { ReportsCallQualityTab } from '../components/reports-call-quality-tab';
import { ReportsInsightsTab } from '../components/reports-insights-tab';
import { ReportsPolicyTab } from '../components/reports-policy-tab';
import { ReportsTasksTab } from '../components/reports-tasks-tab';

export type ReportsTabId = 'targets' | 'policy' | 'call-quality' | 'insights' | 'tasks';

export interface ReportsTabDefinition {
  id: ReportsTabId;
  label: string;
  icon: typeof Target;
  component: ComponentType;
}

export const REPORTS_TABS: readonly ReportsTabDefinition[] = [
  {
    id: 'targets',
    label: 'Targets',
    icon: Target,
    component: ReportsOverviewTab,
  },
  {
    id: 'policy',
    label: 'Policy',
    icon: ShieldCheck,
    component: ReportsPolicyTab,
  },
  {
    id: 'call-quality',
    label: 'Call quality',
    icon: PhoneCall,
    component: ReportsCallQualityTab,
  },
  {
    id: 'insights',
    label: 'Insights',
    icon: Sparkles,
    component: ReportsInsightsTab,
  },
  {
    id: 'tasks',
    label: 'Tasks & planning',
    icon: ClipboardList,
    component: ReportsTasksTab,
  },
] as const;

export function reportsSubtitle(
  scope: 'org' | 'team' | 'self'
): string {
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

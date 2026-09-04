import type { ComponentType } from 'react';
import { LayoutDashboard, PhoneCall, Sparkles, Target } from 'lucide-react';
import { ReportsProductivityTab } from '../components/reports-productivity-tab';
import { ReportsOverviewTab } from '../components/reports-overview-tab';
import { ReportsCallQualityTab } from '../components/reports-call-quality-tab';
import { ReportsInsightsTab } from '../components/reports-insights-tab';

export type ReportsTabId = 'productivity' | 'targets' | 'call-quality' | 'insights';

export interface ReportsTabDefinition {
  id: ReportsTabId;
  label: string;
  icon: typeof LayoutDashboard;
  component: ComponentType;
}

export const REPORTS_TABS: readonly ReportsTabDefinition[] = [
  {
    id: 'productivity',
    label: 'Productivity',
    icon: LayoutDashboard,
    component: ReportsProductivityTab,
  },
  {
    id: 'targets',
    label: 'Targets',
    icon: Target,
    component: ReportsOverviewTab,
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
] as const;

export function reportsSubtitle(
  scope: 'org' | 'team' | 'self'
): string {
  switch (scope) {
    case 'org':
      return 'Org metrics for calls, visits, leads, and sales targets — plus performance targets, call quality, and activity intelligence.';
    case 'team':
      return 'Your team metrics for calls, visits, leads, and sales targets — plus performance targets, call quality, and activity intelligence.';
    case 'self':
      return 'Your metrics, performance targets, and activity intelligence for the selected period.';
    default: {
      const _exhaustive: never = scope;
      return _exhaustive;
    }
  }
}

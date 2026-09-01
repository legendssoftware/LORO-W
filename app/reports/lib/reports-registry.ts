import type { ComponentType } from 'react';
import { LayoutDashboard, PhoneCall, Target } from 'lucide-react';
import { ReportsProductivityTab } from '../components/reports-productivity-tab';
import { ReportsOverviewTab } from '../components/reports-overview-tab';
import { ReportsCallQualityTab } from '../components/reports-call-quality-tab';

export type ReportsTabId = 'productivity' | 'targets' | 'call-quality';

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
] as const;

export function reportsSubtitle(
  scope: 'org' | 'team' | 'self'
): string {
  switch (scope) {
    case 'org':
      return 'Org metrics for calls, visits, leads, and sales targets — plus performance targets and call quality.';
    case 'team':
      return 'Your team metrics for calls, visits, leads, and sales targets — plus performance targets and call quality.';
    case 'self':
      return 'Your metrics and performance targets for the selected period.';
    default: {
      const _exhaustive: never = scope;
      return _exhaustive;
    }
  }
}

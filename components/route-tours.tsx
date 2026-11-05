'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';

const DashboardAttendanceTour = dynamic(() =>
  import('@/components/dashboard-attendance-tour').then((mod) => mod.DashboardAttendanceTour),
);
const LeadsTour = dynamic(() =>
  import('@/components/leads-tour').then((mod) => mod.LeadsTour),
);
const VisitsTour = dynamic(() =>
  import('@/components/visits-tour').then((mod) => mod.VisitsTour),
);
const StaffTour = dynamic(() =>
  import('@/components/staff-tour').then((mod) => mod.StaffTour),
);
const ClientsTour = dynamic(() =>
  import('@/components/clients-tour').then((mod) => mod.ClientsTour),
);
const PipelineTour = dynamic(() =>
  import('@/components/pipeline-tour').then((mod) => mod.PipelineTour),
);
const PlanningTour = dynamic(() =>
  import('@/components/planning-tour').then((mod) => mod.PlanningTour),
);
const SettingsTour = dynamic(() =>
  import('@/components/settings-tour').then((mod) => mod.SettingsTour),
);
const CallsTour = dynamic(() =>
  import('@/components/calls-tour').then((mod) => mod.CallsTour),
);
const ReportsTour = dynamic(() =>
  import('@/components/reports-tour').then((mod) => mod.ReportsTour),
);
const WellbeingTour = dynamic(() =>
  import('@/components/wellbeing-tour').then((mod) => mod.WellbeingTour),
);
const VisualiserTour = dynamic(() =>
  import('@/components/visualiser-tour').then((mod) => mod.VisualiserTour),
);
const PerformanceTour = dynamic(() =>
  import('@/components/performance-tour').then((mod) => mod.PerformanceTour),
);
const AssetsTour = dynamic(() =>
  import('@/components/assets-tour').then((mod) => mod.AssetsTour),
);
const MerchandiseTour = dynamic(() =>
  import('@/components/merchandise-tour').then((mod) => mod.MerchandiseTour),
);

const TOURS_BY_PATH: Record<string, ComponentType> = {
  '/dashboard': DashboardAttendanceTour,
  '/leads': LeadsTour,
  '/visits': VisitsTour,
  '/staff': StaffTour,
  '/clients': ClientsTour,
  '/pipeline': PipelineTour,
  '/planning': PlanningTour,
  '/settings': SettingsTour,
  '/calls': CallsTour,
  '/reports': ReportsTour,
  '/wellbeing': WellbeingTour,
  '/visualiser': VisualiserTour,
  '/performance': PerformanceTour,
  '/assets': AssetsTour,
  '/merchandise': MerchandiseTour,
};

/**
 * Loads the driver.js tour for the current page only.
 */
export function RouteTours() {
  const pathname = usePathname() ?? '';
  const Tour = TOURS_BY_PATH[pathname];
  if (!Tour) return null;
  return <Tour />;
}

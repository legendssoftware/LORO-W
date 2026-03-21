/**
 * Staff attendance status filter options with icons for dropdown display.
 * Aligned with StatusFilter in @/app/reports/types.
 */

import type { ComponentType } from 'react';
import {
  LayoutGrid,
  UserCheck,
  UserX,
  Clock,
  AlertCircle,
  CalendarOff,
  Building2,
  Home,
  House,
  MapPin,
  Car,
} from 'lucide-react';
import type { StatusFilter } from '@/app/reports/types';
import { OPTION_KEY_TO_LABEL } from '@/lib/clock-in-options';

type IconComponent = ComponentType<{ className?: string; size?: number }>;

export const STAFF_STATUS_FILTER_OPTIONS: {
  value: StatusFilter;
  label: string;
  icon: IconComponent;
}[] = [
  { value: 'all', label: 'All', icon: LayoutGrid },
  { value: 'present', label: 'Present', icon: UserCheck },
  { value: 'absent', label: 'Absent', icon: UserX },
  { value: 'late', label: 'Late', icon: Clock },
  { value: 'early', label: 'Early', icon: Clock },
  { value: 'behind_on_hours', label: 'Behind on hours', icon: AlertCircle },
  { value: 'idle', label: 'Idle (>7 days in-active)', icon: CalendarOff },
  { value: 'at_office', label: OPTION_KEY_TO_LABEL.at_office, icon: Building2 },
  { value: 'work_from_home', label: OPTION_KEY_TO_LABEL.work_from_home, icon: Home },
  { value: 'starting_from_home', label: OPTION_KEY_TO_LABEL.starting_from_home, icon: House },
  { value: 'offsite', label: OPTION_KEY_TO_LABEL.offsite, icon: MapPin },
  { value: 'driving', label: OPTION_KEY_TO_LABEL.driving, icon: Car },
];

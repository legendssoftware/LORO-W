/**
 * Task form options for dropdowns.
 * Aligned with server task enums.
 * Each option includes an icon component for dropdown display.
 */

import type { ComponentType } from 'react';
import type { TaskStatusValue, TaskPriorityValue, TaskTypeValue } from '@/api/types/tasks';
import {
  CircleIcon,
  Loader2Icon,
  CheckSquareIcon,
  XIcon,
  AlertCircleIcon,
  UsersIcon,
  VideoIcon,
  PhoneCallIcon,
  MailIcon,
  MessageSquareIcon,
  TargetIcon,
  FileCheckIcon,
  BarChart3Icon,
  BanknoteIcon,
  MapPinIcon,
  LightbulbIcon,
  CalendarIcon,
  CalendarOffIcon,
  ArrowDownIcon,
  MinusIcon,
  ArrowUpIcon,
} from '@/lib/icons';
import {
  LayoutGrid,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  XCircle,
  MessageCircle,
} from 'lucide-react';

type IconComponent = ComponentType<{ className?: string; size?: number }>;

/** Status options for forms (no "all"). */
export const TASK_STATUS_OPTIONS: {
  value: TaskStatusValue;
  label: string;
  icon: IconComponent;
}[] = [
  { value: 'PENDING', label: 'Pending', icon: CircleIcon },
  { value: 'IN_PROGRESS', label: 'In progress', icon: Loader2Icon },
  { value: 'COMPLETED', label: 'Completed', icon: CheckSquareIcon },
  { value: 'CANCELLED', label: 'Cancelled', icon: XIcon },
  { value: 'OVERDUE', label: 'Overdue', icon: AlertCircleIcon },
  { value: 'POSTPONED', label: 'Postponed', icon: CalendarClock },
  { value: 'MISSED', label: 'Missed', icon: XCircle },
];

/** Status options for filters (includes "all"). */
export const TASK_STATUS_OPTIONS_WITH_ALL: {
  value: TaskStatusValue | 'all';
  label: string;
  icon: IconComponent;
}[] = [
  { value: 'all', label: 'All statuses', icon: LayoutGrid },
  ...TASK_STATUS_OPTIONS,
];

/** Priority options for forms (no "all"). */
export const TASK_PRIORITY_OPTIONS: {
  value: TaskPriorityValue;
  label: string;
  icon: IconComponent;
}[] = [
  { value: 'LOW', label: 'Low', icon: ArrowDownIcon },
  { value: 'MEDIUM', label: 'Medium', icon: MinusIcon },
  { value: 'HIGH', label: 'High', icon: ArrowUpIcon },
  { value: 'URGENT', label: 'Urgent', icon: AlertCircleIcon },
];

/** Priority options for filters (includes "all"). */
export const TASK_PRIORITY_OPTIONS_WITH_ALL: {
  value: TaskPriorityValue | 'all';
  label: string;
  icon: IconComponent;
}[] = [
  { value: 'all', label: 'All priorities', icon: LayoutGrid },
  ...TASK_PRIORITY_OPTIONS,
];

export const REPETITION_TYPE_OPTIONS: {
  value: string;
  label: string;
  icon: IconComponent;
}[] = [
  { value: 'NONE', label: 'None', icon: CalendarOffIcon },
  { value: 'DAILY', label: 'Daily', icon: CalendarDays },
  { value: 'WEEKLY', label: 'Weekly', icon: CalendarIcon },
  { value: 'MONTHLY', label: 'Monthly', icon: CalendarRange },
  { value: 'YEARLY', label: 'Yearly', icon: CalendarClock },
];

export const TASK_TYPE_OPTIONS: {
  value: TaskTypeValue;
  label: string;
  icon: IconComponent;
}[] = [
  { value: 'IN_PERSON_MEETING', label: 'In-person meeting', icon: UsersIcon },
  { value: 'VIRTUAL_MEETING', label: 'Virtual meeting', icon: VideoIcon },
  { value: 'CALL', label: 'Call', icon: PhoneCallIcon },
  { value: 'EMAIL', label: 'Email', icon: MailIcon },
  { value: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquareIcon },
  { value: 'SMS', label: 'SMS', icon: MessageCircle },
  { value: 'FOLLOW_UP', label: 'Follow-up', icon: TargetIcon },
  { value: 'PROPOSAL', label: 'Proposal', icon: FileCheckIcon },
  { value: 'REPORT', label: 'Report', icon: BarChart3Icon },
  { value: 'QUOTATION', label: 'Quotation', icon: BanknoteIcon },
  { value: 'VISIT', label: 'Visit', icon: MapPinIcon },
  { value: 'OTHER', label: 'Other', icon: LightbulbIcon },
];

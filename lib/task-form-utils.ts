/**
 * Task form options for dropdowns.
 * Aligned with server task enums.
 * Each option includes an icon component for dropdown display.
 *
 * Options carry `labelKey` (i18n key under `screens` namespace) instead of a
 * hard-coded English string.  Render sites call `t(o.labelKey)`.
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

export interface TaskOption<V extends string = string> {
  value: V;
  labelKey: string;
  icon: IconComponent;
}

/** Status options for forms (no "all"). */
export const TASK_STATUS_OPTIONS: TaskOption<TaskStatusValue>[] = [
  { value: 'PENDING', labelKey: 'chrome.planning.status.pending', icon: CircleIcon },
  { value: 'IN_PROGRESS', labelKey: 'chrome.planning.status.inProgress', icon: Loader2Icon },
  { value: 'COMPLETED', labelKey: 'chrome.planning.status.completed', icon: CheckSquareIcon },
  { value: 'CANCELLED', labelKey: 'chrome.planning.status.cancelled', icon: XIcon },
  { value: 'OVERDUE', labelKey: 'chrome.planning.status.overdue', icon: AlertCircleIcon },
  { value: 'POSTPONED', labelKey: 'chrome.planning.status.postponed', icon: CalendarClock },
  { value: 'MISSED', labelKey: 'chrome.planning.status.missed', icon: XCircle },
];

/** Status options for filters (includes "all"). */
export const TASK_STATUS_OPTIONS_WITH_ALL: TaskOption<TaskStatusValue | 'all'>[] = [
  { value: 'all', labelKey: 'actions.allStatuses', icon: LayoutGrid },
  ...TASK_STATUS_OPTIONS,
];

/** Priority options for forms (no "all"). */
export const TASK_PRIORITY_OPTIONS: TaskOption<TaskPriorityValue>[] = [
  { value: 'LOW', labelKey: 'chrome.planning.priority.low', icon: ArrowDownIcon },
  { value: 'MEDIUM', labelKey: 'chrome.planning.priority.medium', icon: MinusIcon },
  { value: 'HIGH', labelKey: 'chrome.planning.priority.high', icon: ArrowUpIcon },
  { value: 'URGENT', labelKey: 'chrome.planning.priority.urgent', icon: AlertCircleIcon },
];

/** Priority options for filters (includes "all"). */
export const TASK_PRIORITY_OPTIONS_WITH_ALL: TaskOption<TaskPriorityValue | 'all'>[] = [
  { value: 'all', labelKey: 'chrome.planning.allPriorities', icon: LayoutGrid },
  ...TASK_PRIORITY_OPTIONS,
];

export const REPETITION_TYPE_OPTIONS: TaskOption[] = [
  { value: 'NONE', labelKey: 'enums.tasks.repetition.none', icon: CalendarOffIcon },
  { value: 'DAILY', labelKey: 'enums.tasks.repetition.daily', icon: CalendarDays },
  { value: 'WEEKLY', labelKey: 'enums.tasks.repetition.weekly', icon: CalendarIcon },
  { value: 'MONTHLY', labelKey: 'enums.tasks.repetition.monthly', icon: CalendarRange },
  { value: 'YEARLY', labelKey: 'enums.tasks.repetition.yearly', icon: CalendarClock },
];

export const TASK_TYPE_OPTIONS: TaskOption<TaskTypeValue>[] = [
  { value: 'IN_PERSON_MEETING', labelKey: 'enums.tasks.type.inPersonMeeting', icon: UsersIcon },
  { value: 'VIRTUAL_MEETING', labelKey: 'enums.tasks.type.virtualMeeting', icon: VideoIcon },
  { value: 'CALL', labelKey: 'enums.tasks.type.call', icon: PhoneCallIcon },
  { value: 'EMAIL', labelKey: 'enums.tasks.type.email', icon: MailIcon },
  { value: 'WHATSAPP', labelKey: 'enums.tasks.type.whatsapp', icon: MessageSquareIcon },
  { value: 'SMS', labelKey: 'enums.tasks.type.sms', icon: MessageCircle },
  { value: 'FOLLOW_UP', labelKey: 'enums.tasks.type.followUp', icon: TargetIcon },
  { value: 'PROPOSAL', labelKey: 'enums.tasks.type.proposal', icon: FileCheckIcon },
  { value: 'REPORT', labelKey: 'enums.tasks.type.report', icon: BarChart3Icon },
  { value: 'QUOTATION', labelKey: 'enums.tasks.type.quotation', icon: BanknoteIcon },
  { value: 'VISIT', labelKey: 'enums.tasks.type.visit', icon: MapPinIcon },
  { value: 'OTHER', labelKey: 'enums.tasks.type.other', icon: LightbulbIcon },
];

import type { LucideIcon } from 'lucide-react';
import {
  BadgeCheck,
  Ban,
  Bell,
  BellOff,
  CheckCircle2,
  CircleSlash,
  Clock,
  Hourglass,
  Monitor,
  Moon,
  PowerOff,
  RefreshCw,
  Sun,
  Trash2,
  VolumeX,
  XCircle,
} from 'lucide-react';

/** GeneralStatus values (matches server). */
export const ORG_STATUS_SELECT_OPTIONS: {
  value: string;
  label: string;
  Icon: LucideIcon;
}[] = [
  { value: 'active', label: 'Active', Icon: CheckCircle2 },
  { value: 'inactive', label: 'Inactive', Icon: CircleSlash },
  { value: 'deleted', label: 'Deleted', Icon: Trash2 },
  { value: 'banned', label: 'Banned', Icon: Ban },
  { value: 'deactivated', label: 'Deactivated', Icon: PowerOff },
  { value: 'expired', label: 'Expired', Icon: Clock },
  { value: 'pending', label: 'Pending', Icon: Hourglass },
  { value: 'rejected', label: 'Rejected', Icon: XCircle },
  { value: 'approved', label: 'Approved', Icon: BadgeCheck },
  { value: 'converted', label: 'Converted', Icon: RefreshCw },
];

export const BRANCH_STATUS_SELECT_OPTIONS: {
  value: string;
  label: string;
  Icon: LucideIcon;
}[] = [
  { value: 'active', label: 'Active', Icon: CheckCircle2 },
  { value: 'inactive', label: 'Inactive', Icon: CircleSlash },
  { value: 'pending', label: 'Pending', Icon: Hourglass },
];

export const THEME_SELECT_OPTIONS: {
  value: 'light' | 'dark' | 'system';
  label: string;
  Icon: LucideIcon;
}[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

/** Known UI values; server stores varchar — extend if product adds types. */
export const GEOFENCE_NOTIFICATION_SELECT_OPTIONS: {
  value: string;
  label: string;
  Icon: LucideIcon;
}[] = [
  { value: 'NOTIFY', label: 'Notify', Icon: Bell },
  { value: 'SILENT', label: 'Silent', Icon: BellOff },
  { value: 'NONE', label: 'None', Icon: VolumeX },
];

export function optionByValue<T extends { value: string }>(
  list: T[],
  value: string
): T | undefined {
  return list.find((o) => o.value === value);
}

import type { LucideIcon } from 'lucide-react';
import {
  CircleDot,
  CircleOff,
  Ban,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldAlert,
} from 'lucide-react';

/** Matches server GeneralStatus (lowercase). */
export const CLIENT_STATUS_VALUES = [
  'all',
  'active',
  'inactive',
  'deleted',
  'banned',
  'deactivated',
  'expired',
  'pending',
  'rejected',
  'approved',
  'converted',
] as const;

export type ClientStatusFilterValue = (typeof CLIENT_STATUS_VALUES)[number];

export const CLIENT_STATUS_FILTER_OPTIONS: {
  value: ClientStatusFilterValue;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: 'all', label: 'All statuses', icon: CircleDot },
  { value: 'active', label: 'Active', icon: CheckCircle2 },
  { value: 'inactive', label: 'Inactive', icon: CircleOff },
  { value: 'pending', label: 'Pending', icon: Clock },
  { value: 'converted', label: 'Converted', icon: CheckCircle2 },
  { value: 'approved', label: 'Approved', icon: CheckCircle2 },
  { value: 'rejected', label: 'Rejected', icon: XCircle },
  { value: 'banned', label: 'Banned', icon: Ban },
  { value: 'deactivated', label: 'Deactivated', icon: ShieldAlert },
  { value: 'expired', label: 'Expired', icon: Clock },
  { value: 'deleted', label: 'Deleted', icon: CircleOff },
];

export const CLIENT_CATEGORY_PRESETS = [
  { value: 'all', label: 'All categories' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'sme', label: 'SME' },
  { value: 'contract', label: 'Contract' },
  { value: 'individual', label: 'Individual' },
] as const;

export type ClientCategoryFilterValue = (typeof CLIENT_CATEGORY_PRESETS)[number]['value'];

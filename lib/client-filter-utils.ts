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
  labelKey: string;
  icon: LucideIcon;
}[] = [
  { value: 'all', labelKey: 'actions.allStatuses', icon: CircleDot },
  { value: 'active', labelKey: 'enums.clients.status.active', icon: CheckCircle2 },
  { value: 'inactive', labelKey: 'enums.clients.status.inactive', icon: CircleOff },
  { value: 'pending', labelKey: 'enums.clients.status.pending', icon: Clock },
  { value: 'converted', labelKey: 'enums.clients.status.converted', icon: CheckCircle2 },
  { value: 'approved', labelKey: 'enums.clients.status.approved', icon: CheckCircle2 },
  { value: 'rejected', labelKey: 'enums.clients.status.rejected', icon: XCircle },
  { value: 'banned', labelKey: 'enums.clients.status.banned', icon: Ban },
  { value: 'deactivated', labelKey: 'enums.clients.status.deactivated', icon: ShieldAlert },
  { value: 'expired', labelKey: 'enums.clients.status.expired', icon: Clock },
  { value: 'deleted', labelKey: 'enums.clients.status.deleted', icon: CircleOff },
];

export const CLIENT_CATEGORY_PRESETS = [
  { value: 'all', labelKey: 'enums.clients.category.all' },
  { value: 'enterprise', labelKey: 'enums.clients.category.enterprise' },
  { value: 'sme', labelKey: 'enums.clients.category.sme' },
  { value: 'contract', labelKey: 'enums.clients.category.contract' },
  { value: 'individual', labelKey: 'enums.clients.category.individual' },
] as const;

export type ClientCategoryFilterValue = (typeof CLIENT_CATEGORY_PRESETS)[number]['value'];

/**
 * Status enums used globally. Mirrors server/src/lib/enums/status.enums.ts where applicable.
 */

export const AccountStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DELETED: 'deleted',
  BANNED: 'banned',
  PENDING: 'pending',
  APPROVED: 'approved',
  REVIEW: 'review',
  DECLINED: 'declined',
} as const;

export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus];

export const PaymentStatus = {
  PAID: 'paid',
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  OVERDUE: 'overdue',
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const TaskStatus = {
  POSTPONED: 'postponed',
  MISSED: 'missed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  PENDING: 'pending',
  INPROGRESS: 'inprogress',
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const ClaimStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PAID: 'paid',
  CANCELLED: 'cancelled',
} as const;

export type ClaimStatus = (typeof ClaimStatus)[keyof typeof ClaimStatus];

export const GeneralStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DELETED: 'deleted',
  BANNED: 'banned',
  DEACTIVATED: 'deactivated',
  EXPIRED: 'expired',
  PENDING: 'pending',
  REJECTED: 'rejected',
  APPROVED: 'approved',
  CONVERTED: 'converted',
} as const;

export type GeneralStatus = (typeof GeneralStatus)[keyof typeof GeneralStatus];

/**
 * Leave API types. Aligned with Leave entity and GET /leave responses.
 */

export const LEAVE_TYPE_OPTIONS = [
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'SICK', label: 'Sick' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'MATERNITY', label: 'Maternity' },
  { value: 'PATERNITY', label: 'Paternity' },
  { value: 'COMPENSATORY', label: 'Compensatory' },
  { value: 'BEREAVEMENT', label: 'Bereavement' },
  { value: 'STUDY', label: 'Study' },
] as const;

export const LEAVE_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED_BY_USER', label: 'Cancelled by user' },
  { value: 'CANCELLED_BY_ADMIN', label: 'Cancelled by admin' },
  { value: 'TAKEN', label: 'Taken' },
  { value: 'PARTIALLY_TAKEN', label: 'Partially taken' },
] as const;

export type LeaveTypeCode = (typeof LEAVE_TYPE_OPTIONS)[number]['value'];
export type LeaveStatusCode = (typeof LEAVE_STATUS_OPTIONS)[number]['value'];
export type HalfDayPeriodCode = 'FIRST_HALF' | 'SECOND_HALF';

export interface LeavePerson {
  uid?: number;
  clerkUserId?: string;
  name?: string;
  surname?: string;
  email?: string;
}

export interface LeaveRecord {
  uid: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  duration: number;
  status: string;
  motivation?: string | null;
  isHalfDay?: boolean;
  halfDayPeriod?: string | null;
  isPaid?: boolean;
  isPublicHoliday?: boolean;
  paidAmount?: number | null;
  comments?: string | null;
  rejectionReason?: string | null;
  cancellationReason?: string | null;
  attachments?: string[] | null;
  ownerClerkUserId?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  cancelledAt?: string | null;
  createdAt?: string;
  owner?: LeavePerson | null;
  approvedBy?: LeavePerson | null;
}

export interface LeaveListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LeaveListResponse {
  message?: string;
  data?: LeaveRecord[];
  leaves?: LeaveRecord[];
  meta?: LeaveListMeta;
}

export interface LeavesByUserResponse {
  message: string;
  leaves: LeaveRecord[];
}

export interface LeaveDetailResponse {
  message: string;
  leave: LeaveRecord | null;
}

export interface LeaveMutationResponse {
  message: string;
}

/** Body for POST /leave. Dates are YYYY-MM-DD. Duration is weekday days, minus 0.5 for a half day. */
export interface CreateLeavePayload {
  leaveType: LeaveTypeCode;
  startDate: string;
  endDate: string;
  duration: number;
  motivation?: string;
  isHalfDay: boolean;
  halfDayPeriod?: HalfDayPeriodCode;
  isPublicHoliday: boolean;
  isPaid: boolean;
}

export interface UpdateLeavePayload {
  leaveType?: LeaveTypeCode;
  startDate?: string;
  endDate?: string;
  duration?: number;
  motivation?: string;
  isHalfDay?: boolean;
  halfDayPeriod?: HalfDayPeriodCode;
  isPublicHoliday?: boolean;
  isPaid?: boolean;
}

export interface LeaveReportBucket {
  name: string;
  value: number;
}

export interface LeaveReportResponse {
  total: number;
  byStatus: LeaveReportBucket[];
  byDay: { date: string; count: number }[];
  meta: { from: string; to: string };
}

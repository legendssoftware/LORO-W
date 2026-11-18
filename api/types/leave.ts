/**
 * Leave API types. Aligned with server GET /leave/user/:ref response.
 */

export interface LeaveOwnerRef {
  uid?: number;
  name?: string;
  surname?: string;
  clerkUserId?: string;
}

export interface LeaveRecord {
  uid: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  duration: number;
  status: string;
  motivation?: string;
  isHalfDay?: boolean;
  isPaid?: boolean;
  isPublicHoliday?: boolean;
  rejectionReason?: string;
  cancellationReason?: string;
  owner?: LeaveOwnerRef;
  createdAt?: string;
}

export interface LeaveListResult {
  data: LeaveRecord[];
  meta?: { total: number; page: number; limit: number; totalPages: number };
  message?: string;
}

export interface LeaveReport {
  total: number;
  byStatus: Array<{ name: string; value: number }>;
  byDay: Array<{ date: string; count: number }>;
  meta?: { from: string; to: string };
}

export interface CreateLeavePayload {
  leaveType: string;
  startDate: string;
  endDate: string;
  duration: number;
  motivation?: string;
  isHalfDay: boolean;
  isPublicHoliday: boolean;
  isPaid: boolean;
}

export interface LeaveListFilters {
  status?: string;
  leaveType?: string;
  ownerUid?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface LeavesByUserResponse {
  message: string;
  leaves: LeaveRecord[];
}

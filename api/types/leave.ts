/**
 * Leave API types. Aligned with server GET /leave/user/:ref response.
 */

export interface LeaveRecord {
  uid: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  duration: number;
  status: string;
  isHalfDay?: boolean;
  createdAt?: string;
}

export interface LeavesByUserResponse {
  message: string;
  leaves: LeaveRecord[];
}

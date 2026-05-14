export type AttendanceRangeCheckInOwner = {
  uid?: number;
  clerkUserId?: string;
  name?: string;
  surname?: string;
  email?: string;
  accessLevel?: string;
  branch?: { uid?: number; name?: string } | null;
};

export type AttendanceRangeCheckIn = {
  checkIn: string;
  lateMinutes?: number | null;
  checkInNotes?: string | null;
  ownerClerkUserId?: string | null;
  owner?: AttendanceRangeCheckInOwner | null;
};

import { describe, expect, it } from 'vitest';
import type { LeaveRecord } from '@/api/types/leave';
import {
  canCancelLeaveRequest,
  countWeekdayLeaveDuration,
  isOwnLeaveRequest,
  leaveOverlapsRange,
} from './leave-display';

const ownLeave = {
  uid: 1,
  leaveType: 'ANNUAL',
  startDate: '2026-11-16',
  endDate: '2026-11-18',
  duration: 3,
  status: 'PENDING',
  ownerClerkUserId: 'user_owner',
  owner: { uid: 9, clerkUserId: 'user_owner' },
} satisfies LeaveRecord;

describe('countWeekdayLeaveDuration', () => {
  it('counts weekdays and subtracts a half day', () => {
    expect(countWeekdayLeaveDuration('2026-11-16', '2026-11-18', false)).toBe(3);
    expect(countWeekdayLeaveDuration('2026-11-16', '2026-11-16', true)).toBe(0.5);
    expect(countWeekdayLeaveDuration('2026-11-21', '2026-11-22', false)).toBe(0);
    expect(countWeekdayLeaveDuration('2026-11-18', '2026-11-16', false)).toBeNull();
  });
});

describe('leave request rules', () => {
  it('matches an overlapping date window', () => {
    expect(leaveOverlapsRange(ownLeave, '2026-11-18', '2026-11-20')).toBe(true);
    expect(leaveOverlapsRange(ownLeave, '2026-11-19', '2026-11-20')).toBe(false);
  });

  it('lets a standard user cancel only their own pending or approved request', () => {
    const viewer = { uid: 9, clerkUserId: 'user_owner' };
    expect(isOwnLeaveRequest(ownLeave, viewer)).toBe(true);
    expect(canCancelLeaveRequest({ leave: ownLeave, viewer, canDecide: false })).toBe(true);
    expect(
      canCancelLeaveRequest({
        leave: { ...ownLeave, status: 'REJECTED' },
        viewer,
        canDecide: false,
      })
    ).toBe(false);
    expect(
      canCancelLeaveRequest({
        leave: ownLeave,
        viewer: { uid: 4, clerkUserId: 'user_other' },
        canDecide: false,
      })
    ).toBe(false);
    expect(
      canCancelLeaveRequest({
        leave: ownLeave,
        viewer: { uid: 4, clerkUserId: 'user_other' },
        canDecide: true,
      })
    ).toBe(true);
  });
});

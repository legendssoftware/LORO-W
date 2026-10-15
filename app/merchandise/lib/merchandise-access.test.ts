import { describe, expect, it } from 'vitest';
import { canEditMerchandiseEntry } from './merchandise-access';

const viewer = { uid: 4, clerkUserId: 'user_4' };

describe('canEditMerchandiseEntry', () => {
  it('lets the owner edit a pending log', () => {
    expect(
      canEditMerchandiseEntry('user', { status: 'PENDING_REVIEW', owner: { uid: 4 } }, viewer)
    ).toBe(true);
  });

  it('lets a manager edit someone else until the log is published', () => {
    expect(
      canEditMerchandiseEntry('manager', { status: 'DRAFT', owner: { uid: 9 } }, viewer)
    ).toBe(true);
    expect(
      canEditMerchandiseEntry('manager', { status: 'PUBLISHED', owner: { uid: 9 } }, viewer)
    ).toBe(false);
    expect(
      canEditMerchandiseEntry('admin', { status: 'ARCHIVED', owner: { uid: 4 } }, viewer)
    ).toBe(false);
  });

  it('blocks a standard user from editing another person', () => {
    expect(
      canEditMerchandiseEntry('user', { status: 'PENDING_REVIEW', owner: { uid: 9 } }, viewer)
    ).toBe(false);
  });

  it('matches the owner by clerk id when the numeric uid is missing', () => {
    expect(
      canEditMerchandiseEntry(
        'member',
        { status: 'PENDING_REVIEW', ownerClerkUserId: 'user_4' },
        viewer
      )
    ).toBe(true);
  });
});

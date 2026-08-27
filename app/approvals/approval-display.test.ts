import { describe, expect, it } from 'vitest';
import {
  coerceApprovalAmount,
  formatApprovalAmount,
  getApprovalSourceHref,
  sourceLinkLabel,
} from './approval-display';

describe('approval-display', () => {
  it('coerces decimal strings to numbers for display', () => {
    expect(coerceApprovalAmount('12000.00')).toBe(12000);
    expect(formatApprovalAmount('12000', 'MUR')).toContain('12');
    expect(formatApprovalAmount(undefined, 'MUR')).toBeUndefined();
  });

  it('builds source hrefs from entityType and entityId', () => {
    expect(getApprovalSourceHref({ entityType: 'claim', entityId: 7 })).toBe('/claims/7');
    expect(getApprovalSourceHref({ entityType: 'user', entityId: 42 })).toBe(
      '/staff/users/42/settings',
    );
    expect(
      getApprovalSourceHref({
        sourceItem: { href: '/staff/users/USR1/settings' },
        entityType: 'user',
        entityId: 1,
      }),
    ).toBe('/staff/users/USR1/settings');
  });

  it('labels source links by entity type', () => {
    expect(sourceLinkLabel('claim')).toBe('Open claim');
    expect(sourceLinkLabel('user')).toBe('Open employee record');
  });
});

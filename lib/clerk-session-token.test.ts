import { describe, expect, it } from 'vitest';
import {
  getClerkTokenParams,
  isClerkOrganizationId,
} from './clerk-session-token';

describe('isClerkOrganizationId', () => {
  it('accepts Clerk org ids', () => {
    expect(isClerkOrganizationId('org_2abc')).toBe(true);
  });

  it('rejects app-owned tenant ids', () => {
    expect(isClerkOrganizationId('loro_org_uuid')).toBe(false);
  });

  it('rejects empty and null', () => {
    expect(isClerkOrganizationId('')).toBe(false);
    expect(isClerkOrganizationId(null)).toBe(false);
    expect(isClerkOrganizationId(undefined)).toBe(false);
  });
});

describe('getClerkTokenParams', () => {
  it('omits organizationId when org id does not match active Clerk org', () => {
    expect(getClerkTokenParams('org_x')).toEqual({});
    expect(getClerkTokenParams('org_x', null)).toEqual({});
    expect(getClerkTokenParams('org_x', 'org_y')).toEqual({});
    expect(getClerkTokenParams('org_x', 'org_x')).toEqual({ organizationId: 'org_x' });
  });

  it('never passes Clerk organizationId for app-owned tenant ids', () => {
    expect(getClerkTokenParams('loro_org_x')).toEqual({});
    expect(getClerkTokenParams('loro_org_x', 'org_x')).toEqual({});
    expect(getClerkTokenParams(null)).toEqual({});
  });
});

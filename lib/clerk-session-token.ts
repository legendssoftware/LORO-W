/**
 * Clerk `getToken({ organizationId })` only accepts real Clerk Organization ids (`org_…`).
 * App-level tenancy uses app-owned tenant ids (`loro_org_…`); passing those breaks or no-ops token minting.
 */
export function isClerkOrganizationId(
  orgId: string | null | undefined
): orgId is string {
  return typeof orgId === 'string' && orgId.length > 0 && orgId.startsWith('org_');
}

/** Arguments for Clerk `getToken()` — omit `organizationId` when not a Clerk org id. */
export function getClerkTokenParams(
  orgId: string | null | undefined
): { organizationId?: string } {
  if (isClerkOrganizationId(orgId)) {
    return { organizationId: orgId };
  }
  return {};
}

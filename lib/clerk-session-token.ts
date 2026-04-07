/**
 * Clerk `getToken({ organizationId })` only accepts real Clerk Organization ids (`org_…`).
 * App-level tenancy uses app-owned tenant ids (`loro_org_…`); passing those breaks or no-ops token minting.
 */
export function isClerkOrganizationId(
  orgId: string | null | undefined
): orgId is string {
  return typeof orgId === 'string' && orgId.length > 0 && orgId.startsWith('org_');
}

/**
 * Arguments for Clerk `getToken()`.
 * For `org_…` ids, `organizationId` is sent only when it matches `activeClerkOrganizationId`
 * (from `useOrganization().organization?.id`). Otherwise Clerk returns
 * `organization_not_found_or_unauthorized` and minting fails.
 */
export function getClerkTokenParams(
  orgId: string | null | undefined,
  activeClerkOrganizationId?: string | null
): { organizationId?: string } {
  if (!isClerkOrganizationId(orgId)) {
    return {};
  }
  if (
    activeClerkOrganizationId != null &&
    activeClerkOrganizationId.length > 0 &&
    orgId === activeClerkOrganizationId
  ) {
    return { organizationId: orgId };
  }
  return {};
}

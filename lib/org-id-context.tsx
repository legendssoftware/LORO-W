'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useOrganization, useUser } from '@clerk/nextjs';

type OrgIdContextValue = {
  orgId: string | null;
  orgName: string | null;
  /** Clerk session’s active organization (`useOrganization().organization?.id`). Used to avoid passing a stale/wrong `org_…` into `getToken()`. */
  activeClerkOrganizationId: string | null;
  setOrg: (id: string | null, name: string | null) => void;
  setActiveClerkOrganizationId: (id: string | null) => void;
};

const OrgIdContext = createContext<OrgIdContextValue | null>(null);

/**
 * Provides orgId/orgName: SSR seed from auth().orgId or user.publicMetadata.organisationRef, then
 * optionally syncs when Clerk has an active Organization. Without Clerk Orgs, client sync never overwrites.
 */
export function OrgIdProvider({
  initialOrgId,
  children,
}: {
  initialOrgId: string | null;
  children: ReactNode;
}) {
  const [orgId, setOrgIdState] = useState<string | null>(initialOrgId);
  const [orgName, setOrgNameState] = useState<string | null>(null);
  const [activeClerkOrganizationId, setActiveClerkOrganizationState] = useState<
    string | null
  >(null);

  const setOrg = useCallback((id: string | null, name: string | null) => {
    setOrgIdState(id);
    setOrgNameState(name);
  }, []);

  const setActiveClerkOrganizationId = useCallback((id: string | null) => {
    setActiveClerkOrganizationState(id);
  }, []);

  return (
    <OrgIdContext.Provider
      value={{
        orgId,
        orgName,
        activeClerkOrganizationId,
        setOrg,
        setActiveClerkOrganizationId,
      }}
    >
      <OrgIdSync>{children}</OrgIdSync>
    </OrgIdContext.Provider>
  );
}

/**
 * Syncs orgId from useOrganization when mounted. Only renders the inner component
 * (which calls useOrganization) after client mount to avoid SSR errors.
 */
function OrgIdSync({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <>{children}</>;
  }

  return <OrgIdSyncInner>{children}</OrgIdSyncInner>;
}

/**
 * Calls useOrganization only when mounted (client-side). Updates context when user switches orgs.
 */
function OrgIdSyncInner({ children }: { children: ReactNode }) {
  const context = useContext(OrgIdContext);
  const { organization } = useOrganization();
  const { user, isLoaded: isUserLoaded } = useUser();

  if (!context) {
    return <>{children}</>;
  }

  const { orgId, setOrg, setActiveClerkOrganizationId } = context;

  return (
    <>
      <OrgIdClerkSessionSync
        activeOrganizationId={organization?.id ?? null}
        setActiveClerkOrganizationId={setActiveClerkOrganizationId}
      />
      <OrgIdEffects
        organizationId={organization?.id ?? null}
        organizationName={organization?.name ?? null}
        orgId={orgId}
        setOrg={setOrg}
        isUserLoaded={isUserLoaded}
        user={user}
      />
      {children}
    </>
  );
}

function OrgIdClerkSessionSync({
  activeOrganizationId,
  setActiveClerkOrganizationId,
}: {
  activeOrganizationId: string | null;
  setActiveClerkOrganizationId: OrgIdContextValue['setActiveClerkOrganizationId'];
}) {
  useEffect(() => {
    setActiveClerkOrganizationId(activeOrganizationId);
  }, [activeOrganizationId, setActiveClerkOrganizationId]);

  return null;
}

function OrgIdEffects({
  organizationId,
  organizationName,
  orgId,
  setOrg,
  isUserLoaded,
  user,
}: {
  organizationId: string | null;
  organizationName: string | null;
  orgId: string | null;
  setOrg: OrgIdContextValue['setOrg'];
  isUserLoaded: boolean;
  user: ReturnType<typeof useUser>['user'];
}) {
  useEffect(() => {
    if (organizationId) {
      setOrg(organizationId, organizationName);
    }
  }, [organizationId, organizationName, setOrg]);

  useEffect(() => {
    if (!isUserLoaded || !user || orgId != null) {
      return;
    }
    const ref = user.publicMetadata?.organisationRef;
    const refStr = typeof ref === 'string' && ref.length > 0 ? ref : null;
    if (refStr) {
      setOrg(refStr, null);
    }
  }, [isUserLoaded, user, user?.publicMetadata?.organisationRef, orgId, setOrg]);

  return null;
}

/**
 * Returns the current org ID from context. Use instead of useOrganization().organization?.id
 * to avoid SSR errors. Must be used within OrgIdProvider.
 */
export function useOrgId(): string | null {
  const ctx = useContext(OrgIdContext);
  if (!ctx) {
    throw new Error('useOrgId must be used within OrgIdProvider');
  }
  return ctx.orgId;
}

/**
 * Returns the current org name from context. Use instead of useOrganization().organization?.name
 * to avoid SSR errors. Must be used within OrgIdProvider.
 */
export function useOrgName(): string | null {
  const ctx = useContext(OrgIdContext);
  if (!ctx) {
    throw new Error('useOrgName must be used within OrgIdProvider');
  }
  return ctx.orgName;
}

/**
 * Clerk’s active organization id for the session. Use with `getClerkTokenParams` so
 * `organizationId` is only sent when it matches this value (avoids Clerk 404 on token mint).
 */
export function useActiveClerkOrganizationId(): string | null {
  const ctx = useContext(OrgIdContext);
  if (!ctx) {
    throw new Error('useActiveClerkOrganizationId must be used within OrgIdProvider');
  }
  return ctx.activeClerkOrganizationId;
}

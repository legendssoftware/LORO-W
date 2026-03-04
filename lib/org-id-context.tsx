'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useOrganization } from '@clerk/nextjs';

type OrgIdContextValue = {
  orgId: string | null;
  orgName: string | null;
  setOrg: (id: string | null, name: string | null) => void;
};

const OrgIdContext = createContext<OrgIdContextValue | null>(null);

/**
 * Provides orgId and orgName from server (initial) and syncs with Clerk's useOrganization when mounted.
 * useOrganization is only called client-side (inside OrgIdSync when mounted) to avoid SSR errors.
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

  const setOrg = useCallback((id: string | null, name: string | null) => {
    setOrgIdState(id);
    setOrgNameState(name);
  }, []);

  return (
    <OrgIdContext.Provider value={{ orgId, orgName, setOrg }}>
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

  useEffect(() => {
    if (context) {
      context.setOrg(organization?.id ?? null, organization?.name ?? null);
    }
  }, [organization?.id, organization?.name, context]);

  return <>{children}</>;
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

'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import type { SyncProfile } from '@/api/types';
import { useSessionStore } from '@/store/session-store';
import { useUserTarget } from '@/api/hooks';
import type {
  TargetWarningsPayload,
  UserTargetDashboardShape,
} from '@/api/endpoints/user';
import { isFullDocumentRoute } from '@/lib/app-shell-routes';
import { isClientMode } from '@/lib/user-mode';

export type PerformanceWarningPendingContextValue = {
  /** User must acknowledge server-side warning before using the app chrome. */
  pendingBlockingWarning: boolean;
  /**
   * True while a blocking warning is active or GET /user/:ref/target has not yet resolved successfully.
   * Keeps driver.js tours and the sales benchmarks welcome dialog from racing ahead of warning state.
   */
  deferToursAndSalesBenchmarks: boolean;
  targetWarnings: TargetWarningsPayload | null | undefined;
  userRef: string | null;
  employeeName: string;
};

const PerformanceWarningPendingContext =
  createContext<PerformanceWarningPendingContextValue | null>(null);

function readTargetWarnings(userTarget: unknown): TargetWarningsPayload | null | undefined {
  if (!userTarget || typeof userTarget !== 'object') return undefined;
  const ut = userTarget as UserTargetDashboardShape & {
    targetWarnings?: TargetWarningsPayload | null;
  };
  return ut.personalTargets?.targetWarnings ?? ut.targetWarnings;
}

function readTargetWarningsFromProfile(
  profile: SyncProfile | null | undefined
): TargetWarningsPayload | null | undefined {
  const raw = profile?.targetWarnings;
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw === 'object' && raw !== null && typeof (raw as TargetWarningsPayload).level === 'number') {
    return raw as TargetWarningsPayload;
  }
  return undefined;
}

/** Before target fetch settles: prefer sync profile. After success: GET /user/:ref/target wins (avoids stale profile after acknowledge). */
function pickEffectiveWarnings(
  targetResolved: boolean,
  userTargetFromQuery: unknown,
  twFromProfile: TargetWarningsPayload | null | undefined
): TargetWarningsPayload | null | undefined {
  if (!targetResolved) {
    if (twFromProfile !== undefined) return twFromProfile;
    return readTargetWarnings(userTargetFromQuery);
  }
  const ut = userTargetFromQuery;
  if (ut == null || typeof ut !== 'object') return null;
  const q = readTargetWarnings(ut);
  return q === undefined ? null : q ?? null;
}

function acknowledgmentStatus(
  tw: TargetWarningsPayload | null | undefined
): 'no_warning' | 'invalid_payload' | 'current_tier_acknowledged' | 'unacknowledged' {
  if (tw == null) return 'no_warning';
  if (typeof tw.level !== 'number') return 'invalid_payload';
  if (tw.level <= (tw.acknowledgedLevel ?? 0)) return 'current_tier_acknowledged';
  return 'unacknowledged';
}

export function PerformanceWarningGateProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const { isLoaded, isSignedIn, sessionId } = useAuth();
  const clerkSessionIdFromStore = useSessionStore((s) => s.clerkSessionId);
  const profile = useSessionStore((s) => s.profileData);
  const isClient = isClientMode(profile ?? undefined);
  /** Staff user uid only — client portal uses client uid in profile.uid, not users table. */
  const staffUserRef =
    !isClient && profile?.uid != null ? String(profile.uid) : null;

  const targetQuery = useUserTarget(staffUserRef, {
    enabled: !!staffUserRef && !!isSignedIn,
  });

  const userTargetPayload = targetQuery.data?.userTarget;
  const twFromQueryRaw = readTargetWarnings(userTargetPayload);
  const twFromProfile = readTargetWarningsFromProfile(profile ?? undefined);
  const inAppShell = !isFullDocumentRoute(pathname);

  const targetResolved =
    isClient ||
    (!!staffUserRef &&
      targetQuery.isFetched &&
      !targetQuery.isLoading &&
      targetQuery.isSuccess);

  const tw = pickEffectiveWarnings(targetResolved, userTargetPayload, twFromProfile);

  const profileCarriesPendingWarning =
    twFromProfile != null &&
    typeof twFromProfile.level === 'number' &&
    twFromProfile.level > (twFromProfile.acknowledgedLevel ?? 0);

  const hasUnackedWarning =
    !!tw &&
    typeof tw.level === 'number' &&
    tw.level > (tw.acknowledgedLevel ?? 0);

  /** Let sync profile unblock the modal before GET /target returns (warnings must lead). */
  const blockingDataReady =
    isClient ||
    targetResolved ||
    (!targetQuery.isError &&
      profileCarriesPendingWarning &&
      !!staffUserRef &&
      !!isSignedIn);

  const sessionOk = !!(sessionId ?? clerkSessionIdFromStore);

  const pendingBlockingWarning =
    !isClient &&
    isLoaded &&
    !!isSignedIn &&
    sessionOk &&
    inAppShell &&
    !!staffUserRef &&
    blockingDataReady &&
    hasUnackedWarning;

  const targetQueryEnabled = !!staffUserRef && !!isSignedIn;
  const deferUntilTargetSettled =
    !isClient &&
    inAppShell &&
    !!staffUserRef &&
    !!isSignedIn &&
    sessionOk &&
    targetQueryEnabled &&
    !targetQuery.isError &&
    !targetResolved;

  const deferToursAndSalesBenchmarks =
    pendingBlockingWarning || deferUntilTargetSettled;

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const acknowledgedForCurrentTier =
      tw != null &&
      typeof tw.level === 'number' &&
      tw.level <= (tw.acknowledgedLevel ?? 0);

    const ack = acknowledgmentStatus(tw);

    const suppressReasons: string[] = [];
    if (!isLoaded) suppressReasons.push('clerk_not_loaded');
    if (!isSignedIn) suppressReasons.push('not_signed_in');
    if (!sessionOk) suppressReasons.push('no_session_id');
    if (!inAppShell) suppressReasons.push('full_document_route');
    if (isClient) suppressReasons.push('client_portal_user');
    if (!staffUserRef) suppressReasons.push('no_session_user_ref');

    const canEvaluateTarget =
      !isClient &&
      isLoaded &&
      !!isSignedIn &&
      sessionOk &&
      inAppShell &&
      !!staffUserRef;

    if (canEvaluateTarget) {
      if (!blockingDataReady) {
        if (targetQuery.isError) suppressReasons.push('target_fetch_error');
        else if (targetQuery.isLoading) suppressReasons.push('target_loading');
        else if (!targetQuery.isFetched) suppressReasons.push('target_not_fetched');
        else if (!targetQuery.isSuccess) suppressReasons.push('target_not_success');
        else if (!profileCarriesPendingWarning) suppressReasons.push('waiting_target_or_sync_warning');
      } else if (!hasUnackedWarning) {
        if (tw == null) suppressReasons.push('no_target_warnings_payload');
        else if (typeof tw.level !== 'number') suppressReasons.push('invalid_warning_level');
        else suppressReasons.push('warning_already_acknowledged');
      }
    }

    /** What the modal would use (tier + ack columns from the server). */
    const warningToShowToUser =
      hasUnackedWarning && tw && typeof tw.level === 'number'
        ? {
            level: tw.level,
            issuedAt: tw.issuedAt ?? null,
            acknowledgedLevel: tw.acknowledgedLevel ?? 0,
            userMustAcknowledgeCurrentTier: true,
          }
        : tw && typeof tw.level === 'number'
          ? {
              level: tw.level,
              issuedAt: tw.issuedAt ?? null,
              acknowledgedLevel: tw.acknowledgedLevel ?? 0,
              userMustAcknowledgeCurrentTier: false,
            }
          : null;

    const payload = {
      pathname,
      inAppShell,
      pendingBlockingWarning,
      deferToursAndSalesBenchmarks,
      deferUntilTargetSettled,
      showBlockingDialog: pendingBlockingWarning,
      /** Tier that drives copy when the blocking modal is active. */
      warningTierToShow: pendingBlockingWarning ? (tw?.level ?? null) : null,
      targetWarningsEffective: tw ?? null,
      targetWarningsFromQuery: twFromQueryRaw ?? null,
      targetWarningsFromSyncProfile: twFromProfile ?? null,
      warningToShowToUser,
      acknowledgmentStatus: ack,
      hasWarningTier: !!(tw && typeof tw.level === 'number'),
      acknowledgedForCurrentTier,
      level: tw?.level,
      acknowledgedLevel: tw?.acknowledgedLevel ?? 0,
      gates: {
        workforceType: profile?.workforceType ?? null,
        isLoaded,
        isSignedIn,
        hasSessionId: sessionOk,
        isClient,
        staffUserRef,
        targetResolved,
        blockingDataReady,
        profileCarriesPendingWarning,
        hasUnackedWarning,
      },
      targetFetch: {
        queryEnabled: !!staffUserRef && !!isSignedIn,
        isFetched: targetQuery.isFetched,
        isLoading: targetQuery.isLoading,
        isSuccess: targetQuery.isSuccess,
        isError: targetQuery.isError,
        fetchError: targetQuery.error
          ? targetQuery.error instanceof Error
            ? targetQuery.error.message
            : String(targetQuery.error)
          : null,
      },
      suppressReasons: pendingBlockingWarning ? [] : suppressReasons,
      note:
        'Tours and Sales Benchmarks defer until user target has settled successfully (no fetch error) or pendingBlockingWarning clears; general workers skip benchmarks only.',
    };

    console.log('[performance-warning]', payload);
  }, [
    tw,
    twFromQueryRaw,
    twFromProfile,
    blockingDataReady,
    profileCarriesPendingWarning,
    pendingBlockingWarning,
    deferToursAndSalesBenchmarks,
    deferUntilTargetSettled,
    targetResolved,
    staffUserRef,
    isClient,
    pathname,
    inAppShell,
    isLoaded,
    isSignedIn,
    sessionOk,
    hasUnackedWarning,
    profile?.workforceType,
    targetQuery.isFetched,
    targetQuery.isLoading,
    targetQuery.isSuccess,
    targetQuery.isError,
    targetQuery.error,
  ]);

  const employeeName = [profile?.name, profile?.surname].filter(Boolean).join(' ').trim();

  const value = useMemo(
    (): PerformanceWarningPendingContextValue => ({
      pendingBlockingWarning,
      deferToursAndSalesBenchmarks,
      targetWarnings: tw,
      userRef: staffUserRef,
      employeeName: employeeName || 'there',
    }),
    [
      pendingBlockingWarning,
      deferToursAndSalesBenchmarks,
      tw,
      staffUserRef,
      employeeName,
    ]
  );

  return (
    <PerformanceWarningPendingContext.Provider value={value}>
      {children}
    </PerformanceWarningPendingContext.Provider>
  );
}

export function usePerformanceWarningPending(): PerformanceWarningPendingContextValue {
  const ctx = useContext(PerformanceWarningPendingContext);
  if (!ctx) {
    throw new Error('usePerformanceWarningPending requires PerformanceWarningGateProvider');
  }
  return ctx;
}

/** Use under app shell only; returns inert state when provider missing (e.g. tests). */
export function usePerformanceWarningPendingSafe(): PerformanceWarningPendingContextValue {
  const ctx = useContext(PerformanceWarningPendingContext);
  return (
    ctx ?? {
      pendingBlockingWarning: false,
      deferToursAndSalesBenchmarks: false,
      targetWarnings: undefined,
      userRef: null,
      employeeName: 'there',
    }
  );
}

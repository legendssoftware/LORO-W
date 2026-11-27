'use client';

import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { Clock } from 'lucide-react';
import {
  useTokenReady,
  useSessionSync,
  useAttStatus,
  useAttCheckInMutation,
  useAttCheckOutMutation,
  useBreakMutation,
  useApiClient,
} from '@/api/hooks';
import { getAttStatus } from '@/api/endpoints/attendance';
import { getTipOfTheDay } from '@/api/endpoints/sales-tips';
import { getOrganisationSettings } from '@/api/endpoints/organisation';
import type { AttCheckInContext } from '@/api/types/attendance';
import { LoadingSpinner } from '@/components/loading-spinner';
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast-helpers';
import { getApiError, getQueryErrorMessage } from '@/lib/api/query-error';
import { AttendanceStatusButton } from '@/components/attendance-status-button';
import { AttendanceMonthHighlights, AttendanceStreakCalendar } from '@/components/attendance-streak-calendar';
import { HomePrrBenefits } from '@/components/home-prr-benefits';
import { UserAttendanceRecordsModal } from '@/app/staff/components/user-attendance-records-modal';
import type { ReportCardUser } from '@/lib/types/staff-report-types';
import { debugApi, isApiDebugEnabled } from '@/lib/api-debug';
import {
  canClockInOffsite,
  isDesktopBrowser,
  locationContextFailureMessageKey,
  OFFSITE_NOT_ALLOWED_CODE,
  OFFSITE_NOT_ALLOWED_MESSAGE_KEY,
} from '@/lib/clock-in-options';
import { getBrowserPosition, geolocationFailureMessageKey } from '@/lib/browser-geolocation';
import { isClientMode } from '@/lib/user-mode';
import { appPageMainClass, appPageScrollWrapClass } from '@/lib/page-shell';
import { ClientDashboardHome } from '@/app/client-portal/components/client-dashboard-home';
import { PulseDialog } from '@/components/pulse-dialog';
import { usePulseMe, useSubmitPulseMutation } from '@/api/hooks/use-pulse';
import type { PulsePeriod, PulseSubmitBody } from '@/api/types/pulse';

export function DashboardContent() {
  const { t } = useTranslation('screens');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const { isTokenReady, sessionToken } = useTokenReady();
  const apiClient = useApiClient();
  const { backendUserData: profile } = useSessionSync();
  const [attendanceModalUser, setAttendanceModalUser] = useState<ReportCardUser | null>(null);
  const [attendanceYear, setAttendanceYear] = useState(() => new Date().getFullYear());
  const [attendanceMonth, setAttendanceMonth] = useState(() => new Date().getMonth() + 1);
  const didSyncAttendancePeriod = useRef(false);
  const [clockInContext, setClockInContext] = useState<AttCheckInContext | null>(null);
  // Office desktops are exempt from the offsite rule; resolved after mount to stay SSR-safe.
  const [isDesktopClient, setIsDesktopClient] = useState(false);
  useEffect(() => {
    setIsDesktopClient(isDesktopBrowser(navigator.userAgent));
  }, []);
  const [clockInContextLoading, setClockInContextLoading] = useState(false);
  /** i18n key (`screens` namespace) for the location failure, translated by AttendanceStatusButton. */
  const [clockInContextError, setClockInContextError] = useState<string | null>(null);
  const [pulseOpen, setPulseOpen] = useState(false);
  const [pulsePeriod, setPulsePeriod] = useState<PulsePeriod>('morning');
  const pendingCheckOutRef = useRef(false);
  const pendingClockInRef = useRef<{ modeLabel: string } | null>(null);
  /** True while a shift action is checking the server for today's pulse, so a double click cannot start it twice. */
  const pulseGateBusyRef = useRef(false);

  useEffect(() => {
    if (didSyncAttendancePeriod.current) return;
    didSyncAttendancePeriod.current = true;
    const today = new Date();
    setAttendanceYear(today.getFullYear());
    setAttendanceMonth(today.getMonth() + 1);
  }, []);

  const currentUserForModal = useMemo((): ReportCardUser | null => {
    if (!profile?.uid) return null;
    return {
      userId: profile.uid,
      ref: String(profile.uid),
      name: clerkUser?.fullName ?? t('dashboard.me'),
      email: clerkUser?.primaryEmailAddress?.emailAddress ?? '',
      hoursThisMonth: 0,
      progressPercent: 0,
      isPresent: false,
    };
  }, [profile?.uid, clerkUser?.fullName, clerkUser?.primaryEmailAddress?.emailAddress]);

  /** Numeric uid from sync, or Clerk id — server monthly endpoint resolves both. */
  const calendarUserRef = useMemo(
    () => profile?.uid ?? clerkUser?.id ?? null,
    [profile?.uid, clerkUser?.id]
  );

  const isClient = isClientMode(profile, sessionToken);
  /** Start attendance APIs as soon as the token is ready; do not wait for sync-clerk. */
  const staffAttendanceEnabled = isTokenReady && !isClient;

  const attQuery = useAttStatus({
    enabled: staffAttendanceEnabled,
  });

  useEffect(() => {
    if (!isApiDebugEnabled()) return;
    const attErr = attQuery.error;
    debugApi('dashboard React Query', {
      isSignedIn,
      isTokenReady,
      attFetchStatus: attQuery.fetchStatus,
      attIsFetching: attQuery.isFetching,
      attError:
        attErr instanceof Error ? attErr.message : attErr ? String(attErr) : undefined,
    });
  }, [
    isSignedIn,
    isTokenReady,
    attQuery.fetchStatus,
    attQuery.isFetching,
    attQuery.error,
  ]);

  const attCheckInMutation = useAttCheckInMutation();
  const attCheckOutMutation = useAttCheckOutMutation();
  const breakMutation = useBreakMutation();
  const pulseMe = usePulseMe(staffAttendanceEnabled);
  const submitPulseMutation = useSubmitPulseMutation();
  const attStatus = attQuery.data;
  const checkedIn = attStatus?.checkedIn ?? false;
  const onBreak =
    attStatus?.nextAction === 'End Break' || attStatus?.nextAction === 'Resume Work';
  const attLoading =
    attCheckInMutation.isPending || attCheckOutMutation.isPending || breakMutation.isPending;

  const refreshClockInContext = useCallback(async () => {
    setClockInContextLoading(true);
    setClockInContextError(null);
    const position = await getBrowserPosition();
    if (!position.ok) {
      setClockInContext(null);
      setClockInContextError(geolocationFailureMessageKey(position.reason));
      setClockInContextLoading(false);
      return;
    }
    try {
      const data = await getAttStatus(apiClient, {
        lat: position.lat,
        lng: position.lng,
      });
      const ctx = data.checkInContext;
      if (ctx?.availableClockInOptions?.length || ctx?.offsiteClockInBlocked) {
        setClockInContext({
          withinBranchRadius: ctx.withinBranchRadius,
          availableClockInOptions: ctx.availableClockInOptions ?? [],
          radiusMeters: ctx.radiusMeters ?? 50,
          distanceFromBranchMeters: ctx.distanceFromBranchMeters ?? null,
          outsideBranchRadiusMessage: ctx.outsideBranchRadiusMessage ?? null,
          offsiteClockInBlocked: ctx.offsiteClockInBlocked === true,
        });
        setClockInContextError(null);
      } else {
        setClockInContext(null);
        setClockInContextError(locationContextFailureMessageKey('missing_context'));
      }
      setClockInContextLoading(false);
    } catch {
      setClockInContext(null);
      setClockInContextError(locationContextFailureMessageKey('api_error'));
      setClockInContextLoading(false);
    }
  }, [apiClient]);

  /** When not checked in, fetch status with device location for server-driven clock-in options. */
  useEffect(() => {
    if (!staffAttendanceEnabled || checkedIn) {
      setClockInContext(null);
      setClockInContextError(null);
      setClockInContextLoading(false);
      return;
    }
    void refreshClockInContext();
  }, [staffAttendanceEnabled, checkedIn, refreshClockInContext]);

  /**
   * Whether today's pulse for `period` is in. Always asks the server so a stale cache cannot
   * let a shift start or end without the form; a failed lookup counts as "not submitted".
   */
  const isPulseSubmitted = async (period: PulsePeriod): Promise<boolean> => {
    const result = await pulseMe.refetch();
    if (result.isError || !result.data) return false;
    return period === 'morning' ? result.data.morningSubmitted : result.data.eveningSubmitted;
  };

  /**
   * Runs a shift action behind the pulse gate. Ignored while another gated action is still
   * checking the server.
   */
  const runPulseGated = async (action: () => Promise<void>) => {
    if (pulseGateBusyRef.current) return;
    pulseGateBusyRef.current = true;
    try {
      await action();
    } finally {
      pulseGateBusyRef.current = false;
    }
  };

  /** Start of shift: the "Start My Day" pulse must be in before the clock-in is sent. */
  const handleClockInWithMode = (modeLabel: string) =>
    runPulseGated(async () => {
      if (!(await isPulseSubmitted('morning'))) {
        pendingClockInRef.current = { modeLabel };
        setPulsePeriod('morning');
        setPulseOpen(true);
        return;
      }
      await performClockIn(modeLabel);
    });

  const performClockIn = async (modeLabel: string) => {
    /** The mode label is all `checkInNotes` carries; the server reads it for the at-office geofence. */
    const combined = modeLabel;
    const position = await getBrowserPosition();
    const noLocationSuffix =
      !position.ok ? ' (browser location not granted)' : '';
    attCheckInMutation.mutate(
      {
        status: 'present',
        checkIn: new Date().toISOString(),
        checkInNotes:
          position.ok ? combined : `${combined}${noLocationSuffix}`,
        ...(position.ok && {
          checkInLatitude: position.lat,
          checkInLongitude: position.lng,
        }),
        ...(profile?.branch?.uid != null && { branch: { uid: profile.branch.uid } }),
      },
      {
        onSuccess: () => {
          showSuccessToast(t('dashboard.shiftStarted'), toast);
        },
        onError: (error) => {
          // The server sends this rule in English; show the user's language instead.
          const message =
            getApiError(error)?.code === OFFSITE_NOT_ALLOWED_CODE
              ? t(OFFSITE_NOT_ALLOWED_MESSAGE_KEY)
              : getQueryErrorMessage(error, t('dashboard.couldNotStartShift'));
          showErrorToast(message, toast);
        },
      }
    );
  };

  /** End of shift: the "Finish My Day" pulse must be in before the clock-out is sent. */
  const handleCheckOut = () =>
    runPulseGated(async () => {
      if (!(await isPulseSubmitted('evening'))) {
        pendingCheckOutRef.current = true;
        setPulsePeriod('evening');
        setPulseOpen(true);
        return;
      }
      await performCheckOut();
    });

  const performCheckOut = async () => {
    const position = await getBrowserPosition();
    const noLocationNote = 'Clocked out without location (browser location not granted).';
    attCheckOutMutation.mutate(
      {
        checkOut: new Date().toISOString(),
        checkOutNotes: position.ok ? '' : noLocationNote,
        ...(position.ok && {
          checkOutLatitude: position.lat,
          checkOutLongitude: position.lng,
        }),
      },
      {
        onSuccess: () => {
          showSuccessToast(t('dashboard.shiftEnded'), toast);
        },
      }
    );
  };

  const handleStartBreak = async () => {
    const position = await getBrowserPosition();
    breakMutation.mutate(
      {
        isStartingBreak: true,
        breakNotes: '',
        ...(position.ok && {
          breakLatitude: position.lat,
          breakLongitude: position.lng,
        }),
      },
      {
        onSuccess: () => {
          showSuccessToast(t('dashboard.breakStarted'), toast);
        },
      }
    );
  };

  const handleEndBreak = async () => {
    const position = await getBrowserPosition();
    breakMutation.mutate(
      {
        isStartingBreak: false,
        breakNotes: '',
        ...(position.ok && {
          breakLatitude: position.lat,
          breakLongitude: position.lng,
        }),
      },
      {
        onSuccess: () => {
          showSuccessToast(t('dashboard.breakEnded'), toast);
        },
      }
    );
  };

  /**
   * Abandons the pending shift action (Escape): nothing is started or ended because the pulse was
   * not given. A morning prompt with no held clock-in (shift already running without today's
   * pulse) cannot be dismissed at all, matching the mobile app.
   */
  function handlePulseCancel() {
    if (pulsePeriod === 'morning' && !pendingClockInRef.current) return;
    pendingClockInRef.current = null;
    pendingCheckOutRef.current = false;
    setPulseOpen(false);
  }

  function handlePulseSubmit(body: PulseSubmitBody) {
    submitPulseMutation.mutate(body, {
      onError: (error) => {
        showErrorToast(getQueryErrorMessage(error, t('dashboard.couldNotSavePulse')), toast);
      },
      onSuccess: () => {
        setPulseOpen(false);
        if (body.period === 'morning' && pendingClockInRef.current) {
          const { modeLabel } = pendingClockInRef.current;
          pendingClockInRef.current = null;
          void performClockIn(modeLabel);
          return;
        }
        if (body.period === 'evening' && pendingCheckOutRef.current) {
          pendingCheckOutRef.current = false;
          void performCheckOut();
        }
      },
    });
  }

  /**
   * A shift that is already running without today's morning pulse (started on an older build or
   * another device) is asked for it now, so a pulse is never missing for a worked day.
   */
  useEffect(() => {
    if (!staffAttendanceEnabled || !checkedIn || pulseOpen) return;
    if (pulseMe.isFetching || pulseMe.isError || !pulseMe.data) return;
    if (pulseMe.data.morningSubmitted) return;
    pendingClockInRef.current = null;
    setPulsePeriod('morning');
    setPulseOpen(true);
  }, [staffAttendanceEnabled, checkedIn, pulseOpen, pulseMe.isFetching, pulseMe.isError, pulseMe.data]);

  // Render a single consistent tree until mounted to avoid hydration mismatch:
  // server and initial client render both show the same loading placeholder.
  if (!mounted) {
    return (
      <div className={appPageScrollWrapClass}>
        <main className={appPageMainClass}>
          <LoadingSpinner wrapperClassName="py-12" />
        </main>
      </div>
    );
  }

  // Show loading until Clerk token is ready (avoids firing requests before token is available).
  if (isSignedIn && !isTokenReady) {
    return (
      <div className={appPageScrollWrapClass}>
        <main className={appPageMainClass}>
          <LoadingSpinner wrapperClassName="py-12" />
        </main>
      </div>
    );
  }

  return (
    <div className={appPageScrollWrapClass}>
      <main className={appPageMainClass}>
        {!isSignedIn ? null : isClient ? (
          <ClientDashboardHome />
        ) : (
          <div className="space-y-4">
            <HomeExtras />
            <AttendanceStatusButton
              checkedIn={checkedIn}
              onBreak={onBreak}
              loading={attLoading || attQuery.isLoading}
              onClockInWithMode={handleClockInWithMode}
              clockInContext={clockInContext}
              clockInContextLoading={clockInContextLoading}
              clockInContextError={clockInContextError}
              onRetryClockInContext={() => void refreshClockInContext()}
              allowFallbackRemoteOptions={isDesktopClient || canClockInOffsite(profile)}
              onCheckOut={handleCheckOut}
              onStartBreak={handleStartBreak}
              onEndBreak={handleEndBreak}
              startTime={attStatus?.startTime ?? null}
              breakStartTime={attStatus?.breakStartTime ?? null}
              orgTimezone={attStatus?.schedule?.timezone ?? null}
            />
            <AttendanceMonthHighlights
              userRef={calendarUserRef}
              year={attendanceYear}
              month={attendanceMonth}
            />
            <PulseDialog
              open={pulseOpen}
              period={pulsePeriod}
              submitting={submitPulseMutation.isPending}
              onCancel={handlePulseCancel}
              onSubmit={handlePulseSubmit}
            />
            <AttendanceStreakCalendar
              userRef={calendarUserRef}
              year={attendanceYear}
              month={attendanceMonth}
              onPeriodChange={(nextYear, nextMonth) => {
                setAttendanceYear(nextYear);
                setAttendanceMonth(nextMonth);
              }}
              headerTrailing={
                currentUserForModal ? (
                  <button
                    type="button"
                    onClick={() => setAttendanceModalUser(currentUserForModal)}
                    className="flex h-9 min-w-0 w-full items-center justify-center gap-2 rounded border border-border bg-background px-2 text-sm text-foreground hover:bg-accent md:w-auto md:px-3"
                    aria-label={t('dashboard.viewAttendanceLogs')}
                    data-tour="attendance-logs-button"
                  >
                    <Clock className="size-4 shrink-0" />
                    <span>{t('dashboard.logs')}</span>
                  </button>
                ) : undefined
              }
            />
            <HomePrrBenefits />
            <UserAttendanceRecordsModal
              user={attendanceModalUser}
              onClose={() => setAttendanceModalUser(null)}
            />
          </div>
        )}
      </main>
    </div>
  );
}

const SALES_WORKFORCE = new Set(['internal_sales', 'external_sales']);

function isSalesPerson(workforceType: string | null | undefined): boolean {
  return SALES_WORKFORCE.has((workforceType ?? '').toLowerCase().trim());
}

function HomeExtras() {
  const { t } = useTranslation('screens');
  const client = useApiClient();
  const { backendUserData } = useSessionSync();
  const showTip = isSalesPerson(backendUserData?.workforceType);
  const tip = useQuery({
    queryKey: ['sales-tips', 'today'],
    queryFn: () => getTipOfTheDay(client),
    enabled: showTip,
  });
  const orgRef = backendUserData?.organisationRef;
  const settings = useQuery({
    queryKey: ['org-settings', orgRef, 'home'],
    queryFn: () => getOrganisationSettings(client, orgRef!),
    enabled: Boolean(orgRef),
  });
  const layout = settings.data?.settings?.preferences?.chartLayout;
  const showBanner = settings.data?.settings?.preferences?.showCookieBanner === true;
  return (
    <div className={layout === 'compact' ? 'space-y-2' : 'space-y-4'}>
      {showTip ? (
        <section className="rounded-lg border px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">{t('dashboard.tipOfTheDay')}</p>
          <p className="text-sm font-semibold text-foreground">
            {tip.data?.title ?? (tip.isLoading ? t('dashboard.loadingTip') : t('dashboard.noTipToday'))}
          </p>
          {tip.data?.content ? <p className="text-xs text-muted-foreground">{tip.data.content}</p> : null}
        </section>
      ) : null}
      {showBanner ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-950">
          {t('dashboard.cookieBanner')}
        </p>
      ) : null}
    </div>
  );
}

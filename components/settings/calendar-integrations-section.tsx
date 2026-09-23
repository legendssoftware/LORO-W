'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useCalendarConnect,
  useCalendarDisconnect,
  useCalendarIntegrationsStatus,
  useCalendarSyncBackfill,
} from '@/api/hooks/use-calendar-integrations';
import { useApiClient } from '@/api/hooks/use-api-client';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import { patchUserPreferences } from '@/api/endpoints/user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserPreferences } from '@/api/hooks/use-user';
import type { CalendarProvider } from '@/api/endpoints/calendar-integrations';

const PANEL_CLASS = 'rounded-xl border border-border bg-card shadow-sm';

const DURATION_OPTIONS = [15, 30, 45, 60, 90] as const;

const SYNCABLE_TASK_TYPES = [
  { value: 'FOLLOW_UP', label: 'Follow-ups' },
  { value: 'VISIT', label: 'Visits' },
  { value: 'CALL', label: 'Calls' },
  { value: 'IN_PERSON_MEETING', label: 'In-person meetings' },
  { value: 'VIRTUAL_MEETING', label: 'Virtual meetings' },
] as const;

const DEFAULT_SYNC_TASK_TYPES = SYNCABLE_TASK_TYPES.map((row) => row.value);

type CalendarSyncPrefs = {
  enabled?: boolean;
  preferredProvider?: 'google' | 'microsoft' | 'auto';
  defaultDurationMinutes?: number;
  syncTaskTypes?: string[];
};

function providerLabel(provider: string): string {
  return provider === 'google' ? 'Google Calendar' : 'Outlook';
}

function mutationErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const axiosMessage = (error as { response?: { data?: { message?: unknown } } }).response?.data
      ?.message;
    if (typeof axiosMessage === 'string' && axiosMessage.trim()) return axiosMessage;
    if (Array.isArray(axiosMessage)) return axiosMessage.filter(Boolean).join(', ');
    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      return (error as { message: string }).message;
    }
  }
  return fallback;
}

function formatLastSync(iso: string | null): string {
  if (!iso) return 'Never synced';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Never synced';
  return `Last synced ${date.toLocaleString()}`;
}

function statusBadge(status?: string): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  switch (status) {
    case 'active':
      return { label: 'Connected', variant: 'default' };
    case 'error':
      return { label: 'Error', variant: 'destructive' };
    case 'revoked':
      return { label: 'Needs reconnect', variant: 'secondary' };
    default:
      return { label: 'Not connected', variant: 'outline' };
  }
}

export function CalendarIntegrationsSection() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { isTokenReady } = useTokenReady();
  const { data: status, isLoading, isError, error } = useCalendarIntegrationsStatus();
  const connect = useCalendarConnect();
  const disconnect = useCalendarDisconnect();
  const backfill = useCalendarSyncBackfill();
  const { backendUserData } = useSessionSync();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const userRef =
    backendUserData?.uid?.toString() ?? backendUserData?.clerkUserId ?? null;
  const { data: prefsData } = useUserPreferences(userRef, {
    enabled: !!userRef && isTokenReady,
  });
  const calendarSync = (prefsData?.preferences?.calendarSync ?? {}) as CalendarSyncPrefs;
  const [disconnectTarget, setDisconnectTarget] = useState<CalendarProvider | null>(null);
  const [deleteEventsOnDisconnect, setDeleteEventsOnDisconnect] = useState(false);
  const handledOauthQuery = useRef<string | null>(null);

  const updatePrefs = useMutation({
    mutationFn: (body: Record<string, unknown>) => {
      if (!userRef) throw new Error('User not loaded');
      return patchUserPreferences(client, userRef, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'preferences'] });
      toast.success('Calendar preferences saved');
    },
    onError: (err) => toast.error(mutationErrorMessage(err, 'Could not save calendar preferences')),
  });

  useEffect(() => {
    const calendar = searchParams.get('calendar');
    const provider = searchParams.get('provider');
    const reason = searchParams.get('reason');
    if (!calendar) return;
    const key = `${calendar}:${provider ?? ''}:${reason ?? ''}`;
    if (handledOauthQuery.current === key) return;
    handledOauthQuery.current = key;
    if (calendar === 'connected' && provider) {
      toast.success(`${providerLabel(provider)} connected successfully`);
    }
    if (calendar === 'error') {
      toast.error(reason || 'Calendar connection failed');
    }
    router.replace(pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  const statusErrorMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Could not load calendar status';

  const loroEmail = status?.loroEmail ?? '';
  const hasLoroEmail = Boolean(loroEmail.trim());
  const suggested = status?.suggestedProvider ?? 'both';
  const allowedProviders = status?.allowedProviders ?? ['google', 'microsoft'];
  const connections = status?.connections ?? [];
  const orgCalendarEnabled = status?.calendarSyncEnabled !== false;
  const enabledTaskTypes =
    Array.isArray(calendarSync.syncTaskTypes) && calendarSync.syncTaskTypes.length > 0
      ? calendarSync.syncTaskTypes
      : [...DEFAULT_SYNC_TASK_TYPES];

  const connectionFor = (provider: CalendarProvider) =>
    connections.find((c) => c.provider === provider);

  const activeProviders = (['google', 'microsoft'] as const).filter(
    (provider) => connectionFor(provider)?.status === 'active',
  );
  const showPreferredProvider = activeProviders.length > 1;

  const busyProvider: CalendarProvider | null = connect.isPending
    ? (connect.variables ?? null)
    : disconnect.isPending
      ? (disconnect.variables?.provider ?? null)
      : backfill.isPending
        ? (backfill.variables ?? null)
        : null;

  function patchCalendarSync(patch: CalendarSyncPrefs) {
    updatePrefs.mutate({
      calendarSync: {
        ...calendarSync,
        ...patch,
      },
    });
  }

  function handleConnect(provider: CalendarProvider) {
    connect.mutate(provider, {
      onError: (err) => toast.error(mutationErrorMessage(err, `Could not start ${providerLabel(provider)} connect`)),
    });
  }

  function handleBackfill(provider: CalendarProvider) {
    backfill.mutate(provider, {
      onSuccess: (data) =>
        toast.success(`Synced ${data.synced} task${data.synced === 1 ? '' : 's'} to ${providerLabel(provider)}`),
      onError: (err) => toast.error(mutationErrorMessage(err, 'Could not sync existing tasks')),
    });
  }

  function confirmDisconnect() {
    if (!disconnectTarget) return;
    const provider = disconnectTarget;
    const deleteEvents = deleteEventsOnDisconnect;
    setDisconnectTarget(null);
    setDeleteEventsOnDisconnect(false);
    disconnect.mutate(
      { provider, deleteEvents },
      {
        onSuccess: () =>
          toast.success(
            deleteEvents
              ? `${providerLabel(provider)} disconnected and synced events removed`
              : `${providerLabel(provider)} disconnected`,
          ),
        onError: (err) => toast.error(mutationErrorMessage(err, 'Could not disconnect calendar')),
      },
    );
  }

  return (
    <div className={PANEL_CLASS} data-tour="settings-calendar-panel">
      <div className="px-6 pt-6">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <Calendar className="size-5" />
          Calendar sync
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect Outlook or Google Calendar using your LORO email. Tasks, lead follow-ups, and visit
          follow-ups sync one-way to your calendar.
        </p>
      </div>
      <Separator className="mt-4" />

      <div className="px-6 py-4 space-y-6">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <Mail className="size-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-medium">Your LORO email</p>
            {isLoading ? (
              <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
            ) : isError ? (
              <p className="text-sm text-destructive">{statusErrorMessage}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{loroEmail || '—'}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {isError
                ? 'Refresh the page or sign out and back in if this persists.'
                : hasLoroEmail
                  ? 'This is your LORO account email (synced from your profile). OAuth must use this exact address.'
                  : 'Your account email is not synced yet. Try refreshing the page or signing out and back in.'}
            </p>
          </div>
        </div>

        {!orgCalendarEnabled && (
          <p className="text-sm text-muted-foreground">
            Calendar sync is disabled for your organisation.
          </p>
        )}

        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="calendar-sync-enabled">Enable calendar sync</Label>
            <p className="text-sm text-muted-foreground">Push task deadlines to your connected calendar.</p>
          </div>
          <Switch
            id="calendar-sync-enabled"
            checked={calendarSync.enabled !== false}
            disabled={!userRef || updatePrefs.isPending}
            onCheckedChange={(checked) => patchCalendarSync({ enabled: checked })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="calendar-duration">Default event length</Label>
            <Select
              value={String(calendarSync.defaultDurationMinutes ?? 30)}
              onValueChange={(value) => patchCalendarSync({ defaultDurationMinutes: Number(value) })}
              disabled={!userRef || updatePrefs.isPending}
            >
              <SelectTrigger id="calendar-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((minutes) => (
                  <SelectItem key={minutes} value={String(minutes)}>
                    {minutes} minutes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {showPreferredProvider && (
            <div className="space-y-2">
              <Label htmlFor="calendar-preferred-provider">Preferred calendar</Label>
              <Select
                value={calendarSync.preferredProvider ?? 'auto'}
                onValueChange={(value) =>
                  patchCalendarSync({ preferredProvider: value as CalendarSyncPrefs['preferredProvider'] })
                }
                disabled={!userRef || updatePrefs.isPending}
              >
                <SelectTrigger id="calendar-preferred-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automatic</SelectItem>
                  <SelectItem value="google">Google Calendar</SelectItem>
                  <SelectItem value="microsoft">Outlook</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Task types to sync</Label>
          <p className="text-sm text-muted-foreground">Only tasks with a deadline are pushed to your calendar.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {SYNCABLE_TASK_TYPES.map((taskType) => {
              const checked = enabledTaskTypes.includes(taskType.value);
              return (
                <label key={taskType.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={checked}
                    disabled={!userRef || updatePrefs.isPending}
                    onCheckedChange={(next) => {
                      const isChecked = next === true;
                      const nextTypes = isChecked
                        ? [...new Set([...enabledTaskTypes, taskType.value])]
                        : enabledTaskTypes.filter((value) => value !== taskType.value);
                      if (nextTypes.length === 0) {
                        toast.error('Keep at least one task type selected');
                        return;
                      }
                      patchCalendarSync({ syncTaskTypes: nextTypes });
                    }}
                  />
                  {taskType.label}
                </label>
              );
            })}
          </div>
        </div>

        <Separator />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading connections…</p>
        ) : isError ? (
          <p className="text-sm text-destructive">{statusErrorMessage}</p>
        ) : (
          <div className="space-y-4">
            {allowedProviders.includes('microsoft') && (
              <ProviderRow
                provider="microsoft"
                connection={connectionFor('microsoft')}
                recommended={suggested === 'microsoft'}
                onConnect={() => handleConnect('microsoft')}
                onDisconnect={() => {
                  setDeleteEventsOnDisconnect(false);
                  setDisconnectTarget('microsoft');
                }}
                onBackfill={() => handleBackfill('microsoft')}
                busy={busyProvider === 'microsoft'}
                connectDisabled={!hasLoroEmail || !orgCalendarEnabled}
              />
            )}
            {allowedProviders.includes('google') && (
              <ProviderRow
                provider="google"
                connection={connectionFor('google')}
                recommended={suggested === 'google'}
                onConnect={() => handleConnect('google')}
                onDisconnect={() => {
                  setDeleteEventsOnDisconnect(false);
                  setDisconnectTarget('google');
                }}
                onBackfill={() => handleBackfill('google')}
                busy={busyProvider === 'google'}
                connectDisabled={!hasLoroEmail || !orgCalendarEnabled}
              />
            )}
          </div>
        )}
      </div>

      <AlertDialog
        open={disconnectTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            setDisconnectTarget(null);
            setDeleteEventsOnDisconnect(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Disconnect {disconnectTarget ? providerLabel(disconnectTarget) : 'calendar'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              LORO will stop pushing new task deadlines to this calendar. Existing events stay unless you
              choose to remove them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={deleteEventsOnDisconnect}
              onCheckedChange={(checked) => setDeleteEventsOnDisconnect(checked === true)}
            />
            <span>Also remove previously synced LORO events from this calendar</span>
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDisconnect}>
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProviderRow({
  provider,
  connection,
  recommended,
  onConnect,
  onDisconnect,
  onBackfill,
  busy,
  connectDisabled,
}: {
  provider: CalendarProvider;
  connection?: {
    status: string;
    linkedEmail: string;
    lastSyncAt: string | null;
    lastError: string | null;
  };
  recommended: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onBackfill: () => void;
  busy: boolean;
  connectDisabled?: boolean;
}) {
  const isActive = connection?.status === 'active';
  const needsReconnect = connection?.status === 'revoked' || connection?.status === 'error';
  const badge = statusBadge(connection?.status);

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium">{providerLabel(provider)}</p>
          {recommended && !isActive && (
            <Badge variant="secondary">Recommended</Badge>
          )}
        </div>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>
      {connection?.linkedEmail && (
        <p className="text-sm text-muted-foreground">Linked as {connection.linkedEmail}</p>
      )}
      <p className="text-xs text-muted-foreground">{formatLastSync(connection?.lastSyncAt ?? null)}</p>
      {connection?.lastError && (
        <p className="text-sm text-destructive">{connection.lastError}</p>
      )}
      {needsReconnect && !connection?.lastError && (
        <p className="text-sm text-muted-foreground">Reconnect required to resume calendar sync.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {!isActive ? (
          <Button type="button" size="sm" onClick={onConnect} disabled={busy || connectDisabled}>
            {needsReconnect ? 'Reconnect' : 'Connect'} {providerLabel(provider)}
          </Button>
        ) : (
          <>
            <Button type="button" size="sm" variant="outline" onClick={onBackfill} disabled={busy}>
              Sync existing tasks
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={onDisconnect} disabled={busy}>
              Disconnect
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

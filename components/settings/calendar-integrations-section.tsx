'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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

const PANEL_CLASS = 'rounded-xl border border-border bg-card shadow-sm';

function providerLabel(provider: string): string {
	return provider === 'google' ? 'Google Calendar' : 'Outlook';
}

export function CalendarIntegrationsSection() {
  const searchParams = useSearchParams();
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
  const calendarSync = prefsData?.preferences?.calendarSync as
    | { enabled?: boolean; defaultDurationMinutes?: number }
    | undefined;

  const updatePrefs = useMutation({
    mutationFn: (body: Record<string, unknown>) => {
      if (!userRef) throw new Error('User not loaded');
      return patchUserPreferences(client, userRef, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'preferences'] });
    },
  });

  useEffect(() => {
    const calendar = searchParams.get('calendar');
    const provider = searchParams.get('provider');
    if (calendar === 'connected' && provider) {
      toast.success(`${providerLabel(provider)} connected successfully`);
    }
    if (calendar === 'error') {
      toast.error(searchParams.get('reason') || 'Calendar connection failed');
    }
  }, [searchParams]);

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

  const showGoogle =
    allowedProviders.includes('google') && (suggested === 'google' || suggested === 'both');
  const showMicrosoft =
    allowedProviders.includes('microsoft') &&
    (suggested === 'microsoft' || suggested === 'both');

  const connectionFor = (provider: 'google' | 'microsoft') =>
    connections.find((c) => c.provider === provider);

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
            checked={calendarSync?.enabled !== false}
            disabled={!userRef || updatePrefs.isPending}
            onCheckedChange={(checked) =>
              updatePrefs.mutate({ calendarSync: { ...calendarSync, enabled: checked } })
            }
          />
        </div>

        <Separator />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading connections…</p>
        ) : isError ? (
          <p className="text-sm text-destructive">{statusErrorMessage}</p>
        ) : (
          <div className="space-y-4">
            {showMicrosoft && (
              <ProviderRow
                provider="microsoft"
                connection={connectionFor('microsoft')}
                onConnect={() => connect.mutate('microsoft')}
                onDisconnect={() => disconnect.mutate({ provider: 'microsoft' })}
                onBackfill={() => backfill.mutate('microsoft')}
                busy={connect.isPending || disconnect.isPending || backfill.isPending}
                connectDisabled={!hasLoroEmail || !orgCalendarEnabled}
              />
            )}
            {showGoogle && (
              <ProviderRow
                provider="google"
                connection={connectionFor('google')}
                onConnect={() => connect.mutate('google')}
                onDisconnect={() => disconnect.mutate({ provider: 'google' })}
                onBackfill={() => backfill.mutate('google')}
                busy={connect.isPending || disconnect.isPending || backfill.isPending}
                connectDisabled={!hasLoroEmail || !orgCalendarEnabled}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProviderRow({
  provider,
  connection,
  onConnect,
  onDisconnect,
  onBackfill,
  busy,
  connectDisabled,
}: {
  provider: 'google' | 'microsoft';
  connection?: {
    status: string;
    linkedEmail: string;
    lastSyncAt: string | null;
    lastError: string | null;
  };
  onConnect: () => void;
  onDisconnect: () => void;
  onBackfill: () => void;
  busy: boolean;
  connectDisabled?: boolean;
}) {
  const isActive = connection?.status === 'active';

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{providerLabel(provider)}</p>
        {connection ? (
          <Badge variant={isActive ? 'default' : 'secondary'}>{connection.status}</Badge>
        ) : (
          <Badge variant="outline">Not connected</Badge>
        )}
      </div>
      {connection?.linkedEmail && (
        <p className="text-sm text-muted-foreground">Linked as {connection.linkedEmail}</p>
      )}
      {connection?.lastError && (
        <p className="text-sm text-destructive">{connection.lastError}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {!isActive ? (
          <Button type="button" size="sm" onClick={onConnect} disabled={busy || connectDisabled}>
            Connect {providerLabel(provider)}
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

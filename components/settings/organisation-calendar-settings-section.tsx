'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getOrganisationSettings, patchOrganisationSettings } from '@/api/endpoints/organisation';
import { useApiClient } from '@/api/hooks/use-api-client';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import { CALENDAR_INTEGRATIONS_QUERY_KEY } from '@/api/hooks/use-calendar-integrations';
import { settingsOrgSettingsKey } from '@/api/query-keys/settings';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const PANEL_CLASS = 'rounded-xl border border-border bg-card shadow-sm';

type CalendarProvider = 'google' | 'microsoft';

type OrgCalendarForm = {
  enabled: boolean;
  allowedProviders: CalendarProvider[];
};

function normalizeOrgCalendar(raw: {
  enabled?: boolean;
  allowedProviders?: CalendarProvider[];
} | null | undefined): OrgCalendarForm {
  const allowed =
    Array.isArray(raw?.allowedProviders) && raw.allowedProviders.length > 0
      ? raw.allowedProviders.filter((provider): provider is CalendarProvider =>
          provider === 'google' || provider === 'microsoft',
        )
      : (['google', 'microsoft'] as CalendarProvider[]);
  return {
    enabled: raw?.enabled !== false,
    allowedProviders: allowed.length > 0 ? allowed : ['google', 'microsoft'],
  };
}

type OrganisationCalendarSettingsSectionProps = {
  orgRef: string;
};

export function OrganisationCalendarSettingsSection({ orgRef }: OrganisationCalendarSettingsSectionProps) {
  const client = useApiClient();
  const { isTokenReady } = useTokenReady();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<OrgCalendarForm>(normalizeOrgCalendar(undefined));

  const settingsQuery = useQuery({
    queryKey: [...settingsOrgSettingsKey(orgRef), 'calendar-integrations'],
    queryFn: () => getOrganisationSettings(client, orgRef),
    enabled: Boolean(orgRef) && isTokenReady,
  });

  useEffect(() => {
    setForm(normalizeOrgCalendar(settingsQuery.data?.settings?.calendarIntegrations));
  }, [settingsQuery.data?.settings?.calendarIntegrations]);

  const saveMutation = useMutation({
    mutationFn: () =>
      patchOrganisationSettings(client, orgRef, {
        calendarIntegrations: form,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsOrgSettingsKey(orgRef) });
      queryClient.invalidateQueries({ queryKey: CALENDAR_INTEGRATIONS_QUERY_KEY });
      toast.success('Organisation calendar settings saved');
    },
    onError: () => toast.error('Could not save organisation calendar settings'),
  });

  function toggleProvider(provider: CalendarProvider, checked: boolean) {
    setForm((prev) => {
      const next = checked
        ? [...new Set([...prev.allowedProviders, provider])]
        : prev.allowedProviders.filter((value) => value !== provider);
      if (next.length === 0) {
        toast.error('Keep at least one calendar provider enabled');
        return prev;
      }
      return { ...prev, allowedProviders: next };
    });
  }

  return (
    <div className={PANEL_CLASS}>
      <div className="px-6 pt-6">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <Building2 className="size-5" />
          Organisation calendar
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Control whether staff can link Google Calendar or Outlook, and which providers are allowed.
        </p>
      </div>
      <div className="px-6 py-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="org-calendar-enabled">Allow calendar linking</Label>
            <p className="text-sm text-muted-foreground">
              When off, staff cannot connect a calendar and LORO will not push tasks.
            </p>
          </div>
          <Switch
            id="org-calendar-enabled"
            checked={form.enabled}
            onCheckedChange={(checked) => setForm((prev) => ({ ...prev, enabled: checked }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Allowed providers</Label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.allowedProviders.includes('microsoft')}
                onCheckedChange={(checked) => toggleProvider('microsoft', checked === true)}
              />
              Outlook
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.allowedProviders.includes('google')}
                onCheckedChange={(checked) => toggleProvider('google', checked === true)}
              />
              Google Calendar
            </label>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || settingsQuery.isLoading}
        >
          {saveMutation.isPending ? 'Saving…' : 'Save organisation calendar'}
        </Button>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { getOrganisationSettings, patchOrganisationSettings } from '@/api/endpoints/organisation';
import { useApiClient } from '@/api/hooks/use-api-client';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const PANEL_CLASS = 'rounded-xl border border-border bg-card p-4 shadow-sm';

type PerformancePolicyForm = {
  enabled: boolean;
  shadowMode: boolean;
  countries: string;
};

const READ_ONLY_STANDARDS = [
  'New leads: 20% of calls (internal) or visits (external)',
  'Quotations: 2% of new leads, rounded up',
  'CRM compliance: 100%',
  'Pay range for people who sign: 75% to 125% of the agreed reference',
  'External activity: 70% visits and 30% calls',
  'Daily floors when a target is missing or lower: 60 calls (internal and team leaders), 10 visits and 20 calls (external)',
];

function toForm(raw: { enabled?: boolean; shadowMode?: boolean; appliesToCountries?: string[] } | null | undefined): PerformancePolicyForm {
  return {
    enabled: raw?.enabled === true,
    shadowMode: raw?.shadowMode !== false,
    countries: (raw?.appliesToCountries?.length ? raw.appliesToCountries : ['SA']).join(', '),
  };
}

/** Organisation switch for the sales performance policy. Percentages stay on the policy defaults. */
export function PerformancePolicySettingsSection({ orgRef }: { orgRef: string }) {
  const client = useApiClient();
  const { isTokenReady } = useTokenReady();
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ['organisation', orgRef, 'settings', 'performance-policy'],
    queryFn: () => getOrganisationSettings(client, orgRef),
    enabled: Boolean(orgRef) && isTokenReady,
  });
  const [form, setForm] = useState<PerformancePolicyForm>({ enabled: false, shadowMode: true, countries: 'SA' });

  useEffect(() => {
    const raw = settingsQuery.data?.settings?.performancePolicy;
    if (!settingsQuery.isSuccess) return;
    // #region agent log
    fetch('http://127.0.0.1:7852/ingest/c5d038c6-84ee-4625-93ea-42139de8e50d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'55277d'},body:JSON.stringify({sessionId:'55277d',hypothesisId:'E',location:'performance-policy-settings-section.tsx:toForm',message:'settings form received stored policy',data:{storedPresent:raw!=null,storedEnabled:raw?.enabled??null,formEnabled:raw?.enabled===true,shadowMode:raw?.shadowMode??null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    setForm(toForm(raw));
  }, [settingsQuery.data?.settings?.performancePolicy, settingsQuery.isSuccess]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const appliesToCountries = form.countries
        .split(',')
        .map((code) => code.trim().toUpperCase())
        .filter(Boolean);
      return patchOrganisationSettings(client, orgRef, {
        performancePolicy: {
          enabled: form.enabled,
          shadowMode: form.shadowMode,
          appliesToCountries: appliesToCountries.length > 0 ? appliesToCountries : ['SA'],
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisation', orgRef, 'settings'] });
      toast.success('Performance policy settings saved');
    },
    onError: () => toast.error('Could not save performance policy settings'),
  });

  return (
    <div className="space-y-4">
      <div className={PANEL_CLASS}>
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="size-5 text-violet-600" aria-hidden />
          <h2 className="text-lg font-semibold">Sales performance policy</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Measures calls, visits, leads, quotations and CRM compliance. Not signing does not reduce an existing salary.
          Shadow mode keeps pay figures hidden from employees.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="policy-enabled">Enable policy</Label>
            <Switch
              id="policy-enabled"
              checked={form.enabled}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, enabled: checked }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="policy-shadow">Shadow mode</Label>
            <Switch
              id="policy-shadow"
              checked={form.shadowMode}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, shadowMode: checked }))}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="policy-countries">Countries</Label>
            <Input
              id="policy-countries"
              value={form.countries}
              onChange={(event) => setForm((prev) => ({ ...prev, countries: event.target.value }))}
              placeholder="SA"
            />
          </div>
        </div>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {READ_ONLY_STANDARDS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <Button className="mt-4" type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          Save policy settings
        </Button>
      </div>
    </div>
  );
}

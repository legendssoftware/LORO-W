'use client';

import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lightbulb, PhoneCall, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getOrganisationSettings, patchOrganisationSettings } from '@/api/endpoints/organisation';
import { useApiClient } from '@/api/hooks/use-api-client';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import type {
  CallQualityMetricCategory,
  CallQualityMetricDefinition,
  CallQualityMetricType,
  OrganisationCallQualityConfig,
} from '@/app/calls/lib/call-quality-types';
import {
  BITDRYWALL_CALL_QUALITY_TEMPLATE,
  BITDRYWALL_DEMO_COACHING_PROMPT,
  CALL_QUALITY_METRIC_CATEGORIES,
  CALL_QUALITY_METRIC_TYPES,
  PROTECTED_CALL_QUALITY_METRIC_IDS,
  buildBitDrywallCallQualityTemplate,
  createEmptyCallQualityMetric,
  resolveOrganisationCallQualityConfig,
} from '@/app/calls/lib/call-quality-types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const PANEL_CLASS = 'rounded-xl border border-border bg-card p-4 shadow-sm';

type CallQualitySettingsSectionProps = {
  orgRef: string;
};

function isProtectedMetric(id: string): boolean {
  return (PROTECTED_CALL_QUALITY_METRIC_IDS as readonly string[]).includes(id);
}

function normalizeConfig(raw: OrganisationCallQualityConfig | null | undefined): OrganisationCallQualityConfig {
  return resolveOrganisationCallQualityConfig(raw);
}

function updateDimension(
  dimensions: CallQualityMetricDefinition[],
  id: string,
  patch: Partial<CallQualityMetricDefinition>,
): CallQualityMetricDefinition[] {
  return dimensions.map((row) => (row.id === id ? { ...row, ...patch } : row));
}

export function CallQualitySettingsSection({ orgRef }: CallQualitySettingsSectionProps) {
  const client = useApiClient();
  const { isTokenReady } = useTokenReady();
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ['organisation', orgRef, 'settings', 'call-quality'],
    queryFn: () => getOrganisationSettings(client, orgRef),
    enabled: Boolean(orgRef) && isTokenReady,
  });

  const [form, setForm] = useState<OrganisationCallQualityConfig>(BITDRYWALL_CALL_QUALITY_TEMPLATE);

  useEffect(() => {
    const raw = settingsQuery.data?.settings?.callQuality as OrganisationCallQualityConfig | null | undefined;
    setForm(normalizeConfig(raw));
  }, [settingsQuery.data?.settings?.callQuality]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return patchOrganisationSettings(client, orgRef, { callQuality: form });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisation', orgRef, 'settings'] });
      toast.success('Call quality settings saved');
    },
    onError: () => toast.error('Could not save call quality settings'),
  });

  const resetToTemplate = useCallback(() => {
    const productName = form.productName?.trim() || 'BitDrywall';
    setForm(buildBitDrywallCallQualityTemplate(productName));
    toast.success('Reset to BitDrywall template');
  }, [form.productName]);

  const insertDemoCoaching = useCallback(() => {
    setForm((prev) => ({ ...prev, coachingPrompt: BITDRYWALL_DEMO_COACHING_PROMPT }));
    toast.success('Demo coaching advice inserted');
  }, []);

  const addMetric = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      dimensions: [...(prev.dimensions ?? []), createEmptyCallQualityMetric()],
    }));
  }, []);

  const removeMetric = useCallback((id: string) => {
    if (isProtectedMetric(id)) {
      toast.error('This metric is required by the AI scorecard and cannot be removed');
      return;
    }
    setForm((prev) => ({
      ...prev,
      dimensions: (prev.dimensions ?? []).filter((row) => row.id !== id),
    }));
  }, []);

  const patchMetric = useCallback((id: string, patch: Partial<CallQualityMetricDefinition>) => {
    setForm((prev) => ({
      ...prev,
      dimensions: updateDimension(prev.dimensions ?? [], id, patch),
    }));
  }, []);

  return (
    <div className="space-y-4">
      <div className={PANEL_CLASS}>
        <div className="mb-4 flex items-center gap-2">
          <PhoneCall className="size-5 text-violet-600" aria-hidden />
          <h2 className="text-lg font-semibold">AI Call Quality Scorecard</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Configure the metrics the AI evaluates on every transcribed sales call. These appear in call detail and manager reports.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="call-quality-enabled">Enable scorecard</Label>
            <Switch
              id="call-quality-enabled"
              checked={form.enabled ?? true}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, enabled: checked }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="daily-call-target">Daily call target</Label>
            <Input
              id="daily-call-target"
              type="number"
              min={1}
              placeholder="e.g. 60"
              value={form.dailyCallTarget ?? 60}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, dailyCallTarget: Number(event.target.value) || 60 }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="product-name">Product name</Label>
            <Input
              id="product-name"
              value={form.productName ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, productName: event.target.value }))}
              placeholder="BitDrywall"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="review-threshold">Manager review below score</Label>
            <Input
              id="review-threshold"
              type="number"
              min={0}
              max={100}
              placeholder="e.g. 55"
              value={form.reviewScoreThreshold ?? 55}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, reviewScoreThreshold: Number(event.target.value) || 55 }))
              }
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-md border p-3">
          <div>
            <Label htmlFor="auto-create-lead">Auto-create lead on qualified call</Label>
            <p className="text-xs text-muted-foreground">
              When an opportunity is found and a specific follow-up is booked
            </p>
          </div>
          <Switch
            id="auto-create-lead"
            checked={form.autoCreateLead ?? false}
            onCheckedChange={(checked) => setForm((prev) => ({ ...prev, autoCreateLead: checked }))}
          />
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="coaching-prompt">Coaching focus (optional)</Label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 text-xs text-muted-foreground"
              onClick={insertDemoCoaching}
            >
              <Lightbulb className="size-3.5" aria-hidden />
              Insert demo coaching advice
            </Button>
          </div>
          <Textarea
            id="coaching-prompt"
            rows={5}
            value={form.coachingPrompt ?? ''}
            onChange={(event) => setForm((prev) => ({ ...prev, coachingPrompt: event.target.value }))}
            placeholder="e.g. Focus on commercial discovery before presenting products"
          />
            <p className="text-xs text-muted-foreground">
              Guides the AI when scoring calls. Quality is based on questions asked, not whether the customer had a job.
            </p>
        </div>
      </div>

      <div className={PANEL_CLASS}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium">Scorecard metrics</h3>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={addMetric}>
              <Plus className="size-4" aria-hidden />
              Add metric
            </Button>
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={resetToTemplate}>
              <RotateCcw className="size-4" aria-hidden />
              Reset to BitDrywall template
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-3 py-2">Question</th>
                <th className="px-3 py-2 w-28">Type</th>
                <th className="px-3 py-2 w-32">Category</th>
                <th className="px-3 py-2 w-20">Weight</th>
                <th className="px-3 py-2 w-20">Required</th>
                <th className="px-3 py-2 w-12" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {(form.dimensions ?? []).map((dimension) => (
                <MetricRow
                  key={dimension.id}
                  dimension={dimension}
                  onPatch={(patch) => patchMetric(dimension.id, patch)}
                  onRemove={() => removeMetric(dimension.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
        {(form.dimensions ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No metrics yet. Add one or reset to the BitDrywall template.</p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          className="gap-1.5"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          <Save className="size-4" aria-hidden />
          {saveMutation.isPending ? 'Saving…' : 'Save call quality settings'}
        </Button>
      </div>
    </div>
  );
}

type MetricRowProps = {
  dimension: CallQualityMetricDefinition;
  onPatch: (patch: Partial<CallQualityMetricDefinition>) => void;
  onRemove: () => void;
};

function MetricRow({ dimension, onPatch, onRemove }: MetricRowProps) {
  const protectedMetric = isProtectedMetric(dimension.id);

  return (
    <>
      <tr className="border-b last:border-b-0">
        <td className="px-3 py-2">
          <Input
            value={dimension.label}
            disabled={protectedMetric && dimension.id === 'coaching_recommendation'}
            onChange={(event) => onPatch({ label: event.target.value })}
            placeholder="e.g. Discovery quality"
          />
        </td>
        <td className="px-3 py-2">
          <Select
            value={dimension.type}
            disabled={protectedMetric}
            onValueChange={(value) => {
              const type = value as CallQualityMetricType;
              const patch: Partial<CallQualityMetricDefinition> = { type };
              if (type === 'enum' && !dimension.enumOptions?.length) {
                patch.enumOptions = ['Option A', 'Option B'];
              }
              onPatch(patch);
            }}
          >
            <SelectTrigger className="h-8 w-full capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CALL_QUALITY_METRIC_TYPES.map((type) => (
                <SelectItem key={type} value={type} className="capitalize">
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        <td className="px-3 py-2">
          <Select
            value={dimension.category ?? 'discovery'}
            onValueChange={(value) => onPatch({ category: value as CallQualityMetricCategory })}
          >
            <SelectTrigger className="h-8 w-full capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CALL_QUALITY_METRIC_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category} className="capitalize">
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        <td className="px-3 py-2">
          <Input
            type="number"
            min={0}
            step={0.5}
            className="h-8"
            placeholder={dimension.affectsScore === false ? '—' : '15'}
            value={dimension.weight ?? 1}
            disabled={dimension.type === 'text' || dimension.type === 'ratio'}
            onChange={(event) => onPatch({ weight: Number(event.target.value) || 1 })}
          />
        </td>
        <td className="px-3 py-2 text-center">
          <Checkbox
            checked={dimension.required ?? false}
            disabled={protectedMetric}
            onCheckedChange={(checked) => onPatch({ required: checked === true })}
            aria-label={`Required: ${dimension.label}`}
          />
        </td>
        <td className="px-3 py-2">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8 text-muted-foreground hover:text-destructive"
            disabled={protectedMetric}
            onClick={onRemove}
            aria-label={`Remove ${dimension.label}`}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </td>
      </tr>
      {dimension.type === 'enum' ? (
        <tr className="border-b bg-muted/20 last:border-b-0">
          <td colSpan={6} className="px-3 py-2">
            <div className="flex items-center gap-2">
              <Label htmlFor={`enum-${dimension.id}`} className="shrink-0 text-xs text-muted-foreground">
                Options (comma-separated)
              </Label>
              <Input
                id={`enum-${dimension.id}`}
                className="h-8"
                value={(dimension.enumOptions ?? []).join(', ')}
                onChange={(event) => {
                  const enumOptions = event.target.value
                    .split(',')
                    .map((option) => option.trim())
                    .filter(Boolean);
                  onPatch({ enumOptions });
                }}
                placeholder="Cold, Warm, Hot"
              />
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

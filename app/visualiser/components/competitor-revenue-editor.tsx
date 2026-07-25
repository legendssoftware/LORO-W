'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useBulkUpdateCompetitorsMutation,
  useUpdateCompetitorMutation,
} from '@/api/hooks/use-competitors';
import { useCompetitorsMapData } from '@/api/hooks/use-competitors-map-data';
import { resolveHardwareBrand } from '@/lib/site-opportunity/compute/brands';
import type { VisualiserMapPoint } from '@/lib/utils/visualiser-map-points';

type CompetitorRevenueEditorProps = {
  point: VisualiserMapPoint;
};

/**
 * Edit estimated annual revenue for one competitor or its whole brand group.
 */
export function CompetitorRevenueEditor({ point }: CompetitorRevenueEditorProps) {
  const uid = point.competitorUid;
  const brandKey = point.brandKey ?? 'OTHER';
  const [revenueInput, setRevenueInput] = useState(
    point.estimatedAnnualRevenue != null && point.estimatedAnnualRevenue > 0
      ? String(Math.round(point.estimatedAnnualRevenue))
      : '',
  );
  const [applyToGroup, setApplyToGroup] = useState(false);

  useEffect(() => {
    setRevenueInput(
      point.estimatedAnnualRevenue != null && point.estimatedAnnualRevenue > 0
        ? String(Math.round(point.estimatedAnnualRevenue))
        : '',
    );
    setApplyToGroup(false);
  }, [point.id, point.estimatedAnnualRevenue]);

  const mapDataQuery = useCompetitorsMapData({ enabled: Boolean(uid) });
  const updateOne = useUpdateCompetitorMutation();
  const updateBulk = useBulkUpdateCompetitorsMutation({ silentSuccess: true });

  const groupUids = useMemo(() => {
    const markers = mapDataQuery.data ?? [];
    if (!brandKey) return uid != null ? [uid] : [];
    const ids = markers
      .filter((m) => {
        const key = resolveHardwareBrand({
          name: m.name,
          accountName: m.accountName ?? undefined,
          LegalEntity: m.LegalEntity ?? undefined,
        });
        return key === brandKey;
      })
      .map((m) => m.id);
    if (uid != null && !ids.includes(uid)) ids.push(uid);
    return ids;
  }, [mapDataQuery.data, brandKey, uid]);

  const isSaving = updateOne.isPending || updateBulk.isPending;

  if (uid == null) return null;
  const competitorId = uid;

  async function handleSave() {
    const value = Number(revenueInput.replace(/[,\s]/g, ''));
    if (!Number.isFinite(value) || value < 0) {
      toast.error('Enter a valid annual revenue amount (ZAR)');
      return;
    }

    try {
      if (applyToGroup) {
        const updates = groupUids.map((ref) => ({
          ref,
          data: { estimatedAnnualRevenue: value },
        }));
        if (updates.length === 0) {
          toast.error('No stores found for this brand group');
          return;
        }
        const result = await updateBulk.mutateAsync({ updates });
        const ok =
          result.successCount ??
          result.results?.filter((r) => r.success).length ??
          updates.length;
        toast.success(
          `Updated revenue for ${ok} ${brandKey} store${ok === 1 ? '' : 's'}`,
        );
      } else {
        await updateOne.mutateAsync({
          id: competitorId,
          payload: { estimatedAnnualRevenue: value },
        });
      }
    } catch {
      // Toasts handled by mutations
    }
  }

  return (
    <div className="space-y-2 border-t border-border/50 pt-2.5">
      <div className="space-y-1">
        <Label htmlFor={`rev-${uid}`} className="text-[10px] tracking-wide uppercase">
          Est. annual revenue (ZAR)
        </Label>
        <Input
          id={`rev-${uid}`}
          type="number"
          min={0}
          step={1000}
          inputMode="numeric"
          value={revenueInput}
          onChange={(e) => setRevenueInput(e.target.value)}
          placeholder="e.g. 36000000"
          className="h-8 text-xs tabular-nums"
          disabled={isSaving}
        />
      </div>

      <label className="flex cursor-pointer items-start gap-2 text-xs">
        <Checkbox
          checked={applyToGroup}
          onCheckedChange={(checked) => setApplyToGroup(checked === true)}
          disabled={isSaving}
          className="mt-0.5"
        />
        <span className="min-w-0 leading-snug">
          <span className="text-foreground font-medium">Apply to whole group</span>
          {applyToGroup ? (
            <span className="text-muted-foreground mt-0.5 block text-[10px]">
              Updates all {brandKey} stores on the map ({groupUids.length})
            </span>
          ) : (
            <span className="text-muted-foreground mt-0.5 block text-[10px]">
              Only this store
            </span>
          )}
        </span>
      </label>

      <Button
        type="button"
        size="sm"
        className="h-7 w-full text-xs"
        disabled={isSaving || revenueInput.trim() === ''}
        onClick={() => void handleSave()}
      >
        {isSaving ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Saving…
          </>
        ) : applyToGroup ? (
          `Save for ${groupUids.length} stores`
        ) : (
          'Save revenue'
        )}
      </Button>
    </div>
  );
}

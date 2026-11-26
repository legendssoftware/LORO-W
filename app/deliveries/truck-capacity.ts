import type { AssetRecord } from '@/api/types/asset';
import type { DeliverySummary } from '@/api/types/epod';
import { assetTitle } from '@/app/assets/lib/asset-display';

export const MIN_OPTIMAL_LOAD_RATIO = 0.6;
export const MAX_OPTIMAL_LOAD_RATIO = 0.8;
export const TARGET_OPTIMAL_LOAD_RATIO = 0.7;

export type TruckSuggestionDirection = 'smaller' | 'larger';

export interface TruckSuggestion {
  direction: TruckSuggestionDirection;
  truck: AssetRecord;
  capacityKg: number;
  utilizationPct: number;
}

export interface TruckActiveLoad {
  loadKg: number;
  stopCount: number;
}

/**
 * Aggregates currently active (`assigned` / `in_progress`) delivery weight and stop count per truck.
 */
export function summarizeTruckLoads(
  deliveries: readonly DeliverySummary[],
  excludeDeliveryUid?: number,
): Map<number, TruckActiveLoad> {
  const byTruck = new Map<number, TruckActiveLoad>();
  for (const row of deliveries) {
    if (excludeDeliveryUid != null && row.uid === excludeDeliveryUid) continue;
    if (row.status !== 'assigned' && row.status !== 'in_progress') continue;
    if (row.vehicleAssetUid == null || row.vehicleAssetUid <= 0) continue;
    const prev = byTruck.get(row.vehicleAssetUid) ?? { loadKg: 0, stopCount: 0 };
    const w =
      row.totalWeightKg != null && Number.isFinite(row.totalWeightKg) && row.totalWeightKg > 0
        ? row.totalWeightKg
        : 0;
    byTruck.set(row.vehicleAssetUid, {
      loadKg: Math.round((prev.loadKg + w) * 100) / 100,
      stopCount: prev.stopCount + 1,
    });
  }
  return byTruck;
}

/** Remaining usable payload (kg) on a truck after subtracting its already-assigned active load. */
export function remainingTruckCapacityKg(
  truck: AssetRecord,
  loads: ReadonlyMap<number, TruckActiveLoad>,
): number | null {
  if (truck.tonnageKg == null || !Number.isFinite(truck.tonnageKg) || truck.tonnageKg <= 0) {
    return null;
  }
  const existing = loads.get(truck.uid)?.loadKg ?? 0;
  return Math.max(0, Math.round((truck.tonnageKg - existing) * 100) / 100);
}

/** Distance from the ideal 60–80% load utilization band (0 when inside the band). */
function distanceToOptimalBand(ratio: number): number {
  if (ratio >= MIN_OPTIMAL_LOAD_RATIO && ratio <= MAX_OPTIMAL_LOAD_RATIO) return 0;
  return Math.min(
    Math.abs(ratio - MIN_OPTIMAL_LOAD_RATIO),
    Math.abs(ratio - MAX_OPTIMAL_LOAD_RATIO),
  );
}

/** Formats a truck's display title + registration plate for suggestion banners. */
export function formatSuggestedTruckLabel(truck: AssetRecord): string {
  return [assetTitle(truck), truck.registrationPlate?.trim()].filter(Boolean).join(' · ');
}

/**
 * Suggests a better-sized capable truck based on the 60–80% ideal load capacity band:
 * - Smaller truck when the selected truck is under-utilized (< 60% capacity).
 * - Larger truck when the selected truck is over-utilized (> 80% capacity), overloaded (> 100%),
 *   or has no rated tonnage set.
 * Accounts for any load already assigned to each truck on the scheduled day.
 */
export function findSuggestedTruck(
  addedWeightKg: number,
  selectedTruck: AssetRecord | null,
  capableTrucks: readonly AssetRecord[],
  activeLoads?: ReadonlyMap<number, TruckActiveLoad>,
): TruckSuggestion | null {
  if (addedWeightKg <= 0 || !selectedTruck) return null;
  const selectedCapacityKg =
    selectedTruck.tonnageKg != null &&
    Number.isFinite(selectedTruck.tonnageKg) &&
    selectedTruck.tonnageKg > 0
      ? selectedTruck.tonnageKg
      : null;

  const selectedExistingKg = activeLoads?.get(selectedTruck.uid)?.loadKg ?? 0;
  const selectedProjectedKg = selectedExistingKg + addedWeightKg;
  const isOverloadedOrUnrated =
    selectedCapacityKg == null || selectedProjectedKg > selectedCapacityKg;
  const currentRatio =
    selectedCapacityKg != null ? selectedProjectedKg / selectedCapacityKg : null;

  let direction: TruckSuggestionDirection;
  if (isOverloadedOrUnrated) {
    direction = 'larger';
  } else if (currentRatio != null && currentRatio < MIN_OPTIMAL_LOAD_RATIO) {
    direction = 'smaller';
  } else if (currentRatio != null && currentRatio > MAX_OPTIMAL_LOAD_RATIO) {
    direction = 'larger';
  } else {
    return null;
  }

  const currentDistance =
    !isOverloadedOrUnrated && currentRatio != null
      ? distanceToOptimalBand(currentRatio)
      : Number.POSITIVE_INFINITY;

  let best: {
    truck: AssetRecord;
    capacityKg: number;
    ratio: number;
    bandDistance: number;
    targetDistance: number;
  } | null = null;

  for (const truck of capableTrucks) {
    if (truck.uid === selectedTruck.uid) continue;
    const capacityKg = truck.tonnageKg;
    if (capacityKg == null || !Number.isFinite(capacityKg) || capacityKg <= 0) continue;
    const existingKg = activeLoads?.get(truck.uid)?.loadKg ?? 0;
    const projectedKg = existingKg + addedWeightKg;
    if (projectedKg > capacityKg) continue;

    if (direction === 'smaller' && selectedCapacityKg != null && capacityKg >= selectedCapacityKg) {
      continue;
    }
    if (direction === 'larger' && selectedCapacityKg != null && capacityKg <= selectedCapacityKg) {
      continue;
    }

    const ratio = projectedKg / capacityKg;
    const bandDistance = distanceToOptimalBand(ratio);
    if (!isOverloadedOrUnrated && bandDistance >= currentDistance) continue;

    const targetDistance = Math.abs(ratio - TARGET_OPTIMAL_LOAD_RATIO);
    if (
      best == null ||
      bandDistance < best.bandDistance ||
      (bandDistance === best.bandDistance && targetDistance < best.targetDistance) ||
      (bandDistance === best.bandDistance &&
        targetDistance === best.targetDistance &&
        capacityKg < best.capacityKg)
    ) {
      best = { truck, capacityKg, ratio, bandDistance, targetDistance };
    }
  }

  if (!best) return null;
  return {
    direction,
    truck: best.truck,
    capacityKg: best.capacityKg,
    utilizationPct: Math.round(best.ratio * 100),
  };
}

import type {
  RepJourneyFuelEstimate,
  RepJourneySummary,
} from '@/api/types/tracking';

/** Client-side fallback when API omits fuelEstimate (older cached responses). */
export function resolveTripFuelEstimate(
  summary: RepJourneySummary
): RepJourneyFuelEstimate | null {
  if (summary.fuelEstimate) return summary.fuelEstimate;

  const price = summary.fuelPrice.averagePetrolPerLitreZar;
  const distance =
    summary.distanceAdjustment?.billableDistanceKm ?? summary.totalDistanceKm;
  const assumedKmPerLitre =
    summary.vehicleProfile?.ratedKmPerLitre ?? 12;

  if (
    price == null ||
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isFinite(distance) ||
    distance <= 0
  ) {
    return null;
  }

  const estimatedLitres =
    Math.round((distance / assumedKmPerLitre) * 100) / 100;
  const estimatedCostZar =
    Math.round(estimatedLitres * price * 100) / 100;

  return { assumedKmPerLitre, estimatedLitres, estimatedCostZar };
}

export function formatFuelZar(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  try {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `R${value.toFixed(2)}`;
  }
}

export function formatFuelAsOf(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatPaceLabel(label: string | null | undefined): string {
  switch (label) {
    case 'below_budget':
      return 'Below regular driving rate';
    case 'on_pace':
      return 'On regular driving rate';
    case 'above_budget':
      return 'Above regular driving rate';
    default:
      return 'Budget pace unknown';
  }
}

/** Compact distance label for map footer / toasts. */
export function formatJourneyDistanceLabel(summary: RepJourneySummary): string {
  const adj = summary.distanceAdjustment;
  if (adj != null && adj.workCommuteDeductionKm > 0) {
    return `${adj.billableDistanceKm.toFixed(1)} km billable · ${adj.recordedDistanceKm.toFixed(1)} km recorded`;
  }
  return `${summary.totalDistanceKm.toFixed(1)} km`;
}

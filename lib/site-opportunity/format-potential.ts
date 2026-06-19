export function potentialMidZAR(potentialLowZAR: number, potentialHighZAR: number): number {
  return (potentialLowZAR + potentialHighZAR) / 2;
}

export function formatZarShort(n: number): string {
  if (n >= 1_000_000) return `R ${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `R ${Math.round(n / 1_000)}k`;
  return `R ${Math.round(n).toLocaleString()}`;
}

export interface PotentialBreakdown {
  low: number;
  avg: number;
  high: number;
}

export function getPotentialBreakdown(
  potentialLowZAR: number,
  potentialHighZAR: number,
): PotentialBreakdown {
  return {
    low: potentialLowZAR,
    avg: potentialMidZAR(potentialLowZAR, potentialHighZAR),
    high: potentialHighZAR,
  };
}

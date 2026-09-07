import type {
  PerformanceChartPoint,
  PerformanceMasterData,
} from '@/api/types/reports-performance';

export function mapSalespersonChartNames(
  chartData: PerformanceChartPoint[] | undefined,
  masterData: PerformanceMasterData | undefined
): PerformanceChartPoint[] {
  if (!chartData?.length) return [];
  if (!masterData?.salespeople?.length) return chartData;

  const codeToName = new Map<string, string>();
  const nameToName = new Map<string, string>();
  for (const salesPerson of masterData.salespeople) {
    codeToName.set(salesPerson.id.toUpperCase(), salesPerson.name);
    nameToName.set(salesPerson.name.toUpperCase(), salesPerson.name);
  }

  return chartData.map((item) => {
    const labelUpper = (item.label || '').toUpperCase();
    return {
      ...item,
      label: codeToName.get(labelUpper) || nameToName.get(labelUpper) || item.label,
    };
  });
}

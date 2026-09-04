'use client';

import { useMemo } from 'react';
import { ReportDonutChart } from '@/components/charts/report-donut-chart';
import type { CallQualityArchetypeStat } from '@/api/types/reports-call-quality';
import {
  REPORTS_CHART_AMBER,
  REPORTS_CHART_BLUE,
  REPORTS_CHART_GREEN,
  REPORTS_CHART_RED,
  toDonutSlices,
} from '@/app/reports/lib/reports-dashboard-chart-helpers';

function archetypeColor(id: string): string {
  switch (id) {
    case 'dead_air':
    case 'missed_pursuit':
      return REPORTS_CHART_RED;
    case 'opportunity_pursued':
      return REPORTS_CHART_GREEN;
    case 'opportunity_open':
    case 'quality_no_requirement':
      return REPORTS_CHART_BLUE;
    case 'no_decision_maker':
    case 'thin_conversation':
      return REPORTS_CHART_AMBER;
    default:
      return 'hsl(var(--muted-foreground))';
  }
}

export function ReportsCallArchetypeChart({
  archetypes,
}: {
  archetypes: CallQualityArchetypeStat[];
}) {
  const { slices, config, total } = useMemo(() => {
    const rows = archetypes
      .filter((row) => row.count > 0)
      .map((row) => ({ name: row.label, value: row.count, id: row.id }));
    const palette = rows.map((row) => archetypeColor(row.id));
    return toDonutSlices(
      rows.map((row) => ({ name: row.name, value: row.value })),
      palette,
    );
  }, [archetypes]);

  if (total <= 0) {
    return (
      <p className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
        No recordings in this period
      </p>
    );
  }

  return (
    <ReportDonutChart
      config={config}
      data={slices}
      centerPrimary={String(total)}
      centerSecondary="Calls"
      legendMaxItems={5}
    />
  );
}

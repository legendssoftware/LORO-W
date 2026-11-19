'use client';

import type { CallQualityBehaviourRow } from '@/api/types/reports-call-quality';
import { ReportsCallQualityRateRadial } from './reports-call-quality-rate-radial';
import { ReportsGroupedBarChart } from './reports-grouped-bar-chart';
import {
  REPORTS_CHART_GREEN,
  REPORTS_CHART_RED,
} from '@/app/reports/lib/reports-dashboard-chart-helpers';
import { useTranslation } from 'react-i18next';

export function ReportsCallBehaviourPanel({
  behaviour,
}: {
  behaviour: CallQualityBehaviourRow[];
}) {
  const { t } = useTranslation('screens');
  if (behaviour.length === 0) return null;

  const bars = behaviour.map((row) => ({
    name: row.label.length > 28 ? `${row.label.slice(0, 25)}…` : row.label,
    passed: row.passCount,
    failed: row.failCount,
  }));

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {behaviour.map((row) => (
          <ReportsCallQualityRateRadial
            key={row.id}
            rate={row.passRate}
            label={row.label}
            passedLabel={t('chrome.reports.cq.passed')}
            failedLabel={t('chrome.reports.cq.failed')}
          />
        ))}
      </div>
      <ReportsGroupedBarChart
        data={bars}
        categoryKey="name"
        series={[
          { key: 'passed', label: t('chrome.reports.cq.passed'), color: REPORTS_CHART_GREEN },
          { key: 'failed', label: t('chrome.reports.cq.failed'), color: REPORTS_CHART_RED },
        ]}
        yAxisLabel="Calls"
        heightClassName="h-[200px]"
      />
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import { ReportDonutChart } from '@/components/charts/report-donut-chart';
import type { CallQualityMissedQuestion } from '@/api/types/reports-call-quality';
import { formatReportCompact } from '@/app/reports/lib/reports-chart-format';
import {
  REPORTS_CHART_AMBER,
  REPORTS_CHART_BLUE,
  REPORTS_CHART_GREEN,
  REPORTS_CHART_RED,
  toDonutSlices,
} from '@/app/reports/lib/reports-dashboard-chart-helpers';
import { useTranslation } from 'react-i18next';

const MISSED_Q_PALETTE = [
  REPORTS_CHART_RED,
  REPORTS_CHART_AMBER,
  REPORTS_CHART_BLUE,
  REPORTS_CHART_GREEN,
] as const;

interface ReportsMissedQuestionsPieChartProps {
  questions: CallQualityMissedQuestion[];
  maxSlices?: number;
}

export function ReportsMissedQuestionsPieChart({
  questions,
  maxSlices = 5,
}: ReportsMissedQuestionsPieChartProps) {
  const { t } = useTranslation('screens');
  const { slices, config, total } = useMemo(() => {
    const rows = questions
      .filter((q) => q.missedCount > 0)
      .slice(0, maxSlices)
      .map((q) => ({
        name: q.label.length > 48 ? `${q.label.slice(0, 45)}…` : q.label,
        value: q.missedCount,
      }));

    const rest = questions
      .slice(maxSlices)
      .reduce((sum, q) => sum + q.missedCount, 0);
    if (rest > 0) {
      rows.push({ name: t('chrome.reports.cq.other'), value: rest });
    }

    return toDonutSlices(rows, MISSED_Q_PALETTE);
  }, [questions, maxSlices, t]);

  if (total <= 0) {
    return (
      <p className="flex h-[224px] items-center justify-center text-sm text-muted-foreground">
        {t('chrome.reports.cq.noMissedQuestions')}
      </p>
    );
  }

  return (
    <ReportDonutChart
      config={config}
      data={slices}
      centerPrimary={formatReportCompact(total)}
      centerSecondary="Missed"
      legendMaxItems={5}
      tooltipClassName="max-w-xs"
    />
  );
}

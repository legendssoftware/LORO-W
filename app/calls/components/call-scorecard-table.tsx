'use client';

import { useState } from 'react';
import type { CallMissedOpportunity, CallQualityMetricDefinition, CallQualityMetricsMap } from '@/api/types/calls';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CallScoreBar } from './call-score-bar';
import { dimensionScoreToPercent } from '../lib/score-colors';

type CallScorecardTableProps = {
  dimensions: CallQualityMetricDefinition[];
  metrics?: CallQualityMetricsMap | null;
};

function BooleanResult({ value }: { value: boolean }) {
  return (
    <Badge variant="outline" className={cn(value ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700')}>
      {value ? 'Yes' : 'No'}
    </Badge>
  );
}

function MetricResultCell({
  dimension,
  metric,
}: {
  dimension: CallQualityMetricDefinition;
  metric?: CallQualityMetricsMap[string];
}) {
  if (!metric) return <span className="text-muted-foreground">—</span>;
  switch (metric.type) {
    case 'boolean':
      return <BooleanResult value={metric.value} />;
    case 'score':
      if (metric.notApplicable) {
        return (
          <Badge variant="secondary" className="font-normal">
            N/A
          </Badge>
        );
      }
      return (
        <div className="flex min-w-[140px] items-center gap-2">
          <CallScoreBar value={dimensionScoreToPercent(metric.value)} className="max-w-[100px]" />
          <span className="tabular-nums text-sm">{metric.value.toFixed(0)}/10</span>
        </div>
      );
    case 'ratio':
      return (
        <span className="tabular-nums text-sm">
          {Math.round(metric.agentPct)}% / {Math.round(metric.clientPct)}%
        </span>
      );
    case 'enum':
      return (
        <Badge variant="secondary" className="font-normal">
          {metric.value}
        </Badge>
      );
    case 'text':
      return <span className="text-sm">{metric.value}</span>;
    default: {
      const _exhaustive: never = metric;
      return _exhaustive;
    }
  }
}

function metricWeightLabel(dimension: CallQualityMetricDefinition): string {
  if (dimension.affectsScore === false) return '—';
  if (dimension.type !== 'boolean' && dimension.type !== 'score') return '—';
  const weight = dimension.weight ?? 0;
  return weight > 0 ? `${weight}%` : '—';
}

export function CallScorecardTable({ dimensions, metrics }: CallScorecardTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  if (!dimensions.length) return null;

  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th className="px-3 py-2 font-medium">Measurement</th>
            <th className="px-3 py-2 font-medium w-16">Weight</th>
            <th className="px-3 py-2 font-medium">Result</th>
          </tr>
        </thead>
        <tbody>
          {dimensions.map((dimension) => {
            const metric = metrics?.[dimension.id];
            const evidence =
              metric && (metric.type === 'boolean' || metric.type === 'score' || metric.type === 'enum')
                ? metric.evidence
                : undefined;
            const expanded = expandedId === dimension.id;
            return (
              <tr key={dimension.id} className="border-b last:border-b-0 align-top">
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className={cn('text-left', evidence ? 'cursor-pointer hover:underline' : 'cursor-default')}
                    onClick={() => {
                      if (!evidence) return;
                      setExpandedId(expanded ? null : dimension.id);
                    }}
                  >
                    {dimension.label}
                  </button>
                  {expanded && evidence ? (
                    <p className="mt-1 text-xs italic text-muted-foreground">&ldquo;{evidence}&rdquo;</p>
                  ) : null}
                </td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{metricWeightLabel(dimension)}</td>
                <td className="px-3 py-2">
                  <MetricResultCell dimension={dimension} metric={metric} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type MissedOpportunitiesPanelProps = {
  items?: CallMissedOpportunity[] | null;
};

export function MissedOpportunitiesPanel({ items }: MissedOpportunitiesPanelProps) {
  if (!items?.length) return null;
  return (
    <div className="space-y-2 rounded-md border border-red-200 bg-red-50/60 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-red-700">Missed opportunities</p>
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li key={`${item.customerQuote}-${index}`} className="text-sm">
            {item.customerQuote ? (
              <p>
                <span className="font-medium text-foreground">Customer: </span>
                <span className="italic text-muted-foreground">&ldquo;{item.customerQuote}&rdquo;</span>
              </p>
            ) : null}
            {item.repResponse ? (
              <p className="mt-1">
                <span className="font-medium text-foreground">Rep: </span>
                <span className="italic text-muted-foreground">&ldquo;{item.repResponse}&rdquo;</span>
              </p>
            ) : null}
            {item.shouldHaveAsked.length > 0 ? (
              <div className="mt-1">
                <p className="font-medium text-foreground">Should have asked</p>
                <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
                  {item.shouldHaveAsked.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

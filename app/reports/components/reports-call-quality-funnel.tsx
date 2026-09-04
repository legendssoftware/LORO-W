'use client';

import type { CallQualityFunnel } from '@/api/types/reports-call-quality';
import { cn } from '@/lib/utils';

type FunnelStep = {
  label: string;
  value: number;
  tone: 'good' | 'bad' | 'neutral';
};

function dropOffPct(previous: number, current: number): number | null {
  if (previous <= 0) return null;
  return Math.round((1 - current / previous) * 1000) / 10;
}

export function ReportsCallQualityFunnel({ funnel }: { funnel: CallQualityFunnel }) {
  const steps: FunnelStep[] = [
    { label: 'Decision-makers', value: funnel.decisionMakersReached, tone: 'good' },
    { label: 'Quality conversations', value: funnel.qualityConversations, tone: 'good' },
    { label: 'Opportunities', value: funnel.immediateOpportunitiesFound, tone: 'good' },
    { label: 'Projects', value: funnel.projectsIdentified, tone: 'good' },
    { label: 'BOQs', value: funnel.boqsRequested, tone: 'good' },
    { label: 'Follow-ups', value: funnel.followUpsBooked, tone: 'good' },
    { label: 'Quotes (attributed)', value: funnel.quotesGenerated, tone: 'neutral' },
    { label: 'Orders', value: funnel.ordersConverted, tone: 'neutral' },
    { label: 'Missed pursuits', value: funnel.missedOpportunities ?? 0, tone: 'bad' },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-9">
      {steps.map((step, index) => {
        const previous = index > 0 ? steps[index - 1] : null;
        const dropOff =
          previous && step.tone !== 'bad' ? dropOffPct(previous.value, step.value) : null;
        return (
          <div key={step.label} className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {step.label}
            </p>
            <p
              className={cn(
                'mt-1 text-sm font-semibold tabular-nums',
                step.tone === 'good' && 'text-green-700',
                step.tone === 'bad' && 'text-red-700',
                step.tone === 'neutral' && 'text-foreground',
              )}
            >
              {step.value}
            </p>
            {dropOff != null && dropOff > 0 ? (
              <p className="mt-0.5 text-[10px] tabular-nums text-red-600">−{dropOff}% drop-off</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useApiClient, useTokenReady } from '@/api/hooks';

type MorningBriefQueueRow = {
  checkInUid: number;
  reason: string;
  suggestedAction: 'review';
};

type MorningBrief = {
  summary: string;
  actions: string[];
  queue: MorningBriefQueueRow[];
};

export function ReportsMorningBrief() {
  const client = useApiClient();
  const { isTokenReady } = useTokenReady();
  const query = useQuery({
    queryKey: ['reports', 'morning-brief'],
    queryFn: async () => {
      const { data } = await client.get<MorningBrief>('/reports/morning-brief');
      return data;
    },
    enabled: isTokenReady,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (!query.data) return null;
  const { summary, actions, queue } = query.data;

  return (
    <section className="rounded-lg border border-border/60 bg-muted/20 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">This morning</h2>
        <Link href="/reports?tab=policy" className="text-xs text-muted-foreground underline">
          Review queue
        </Link>
      </div>
      <p className="mt-2 text-sm text-foreground">{summary}</p>
      {actions.length > 0 ? (
        <ul className="mt-2 list-disc pl-4 text-sm text-muted-foreground">
          {actions.slice(0, 4).map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
      ) : null}
      {queue.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm">
          {queue.map((row) => (
            <li key={row.checkInUid} className="text-foreground">
              Visit {row.checkInUid}: {row.reason}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

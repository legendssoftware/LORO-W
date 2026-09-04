'use client';

import { Badge } from '@/components/ui/badge';
import type { CallQualitySources } from '@/api/types/reports-call-quality';

export function ReportsCallQualitySourceStrip({ sources }: { sources: CallQualitySources }) {
  const chips: Array<{ key: string; label: string }> = [];
  if (sources.origin.company_phone > 0) {
    chips.push({ key: 'pbx', label: `${sources.origin.company_phone} PBX` });
  }
  if (sources.origin.in_app > 0) {
    chips.push({ key: 'in_app', label: `${sources.origin.in_app} in-app` });
  }
  if (sources.origin.personal_mobile > 0) {
    chips.push({ key: 'mobile', label: `${sources.origin.personal_mobile} personal` });
  }
  if (sources.unlinkedCallCount > 0) {
    chips.push({ key: 'unlinked', label: `${sources.unlinkedCallCount} unlinked` });
  }
  chips.push({ key: 'transcript', label: `${sources.transcript.ready} transcripts ready` });
  if (sources.leadsLinked > 0) {
    chips.push({ key: 'leads', label: `${sources.leadsLinked} linked leads` });
  }
  if (sources.visitsLinked > 0) {
    chips.push({ key: 'visits', label: `${sources.visitsLinked} linked visits` });
  }

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
      <p className="text-xs leading-snug text-muted-foreground">{sources.caption}</p>
      {chips.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <Badge key={chip.key} variant="outline" className="text-[10px] font-normal">
              {chip.label}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

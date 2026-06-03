import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.solutionVisitTracking.title,
  description: PAGE_COPY.solutionVisitTracking.description,
  path: '/solutions/visit-tracking',
  indexable: true,
});

export default function VisitTrackingPage() {
  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        Visit tracking software
      </h1>
      <p className="text-zinc-400 text-lg mb-6">
        Prove field work with check-ins, notes, quotes, and outcomes tied to each
        customer account.
      </p>
      <div className="space-y-4 text-zinc-300 text-sm">
        <p>
          Managers see which accounts were visited, what was discussed, and what
          happened next—without disputed activity logs.
        </p>
        <p>
          Visits feed pipeline and reports so coaching uses the same data reps
          entered on site.
        </p>
      </div>
      <MarketingCta />
    </>
  );
}

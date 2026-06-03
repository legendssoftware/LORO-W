import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.solutionRoutePlanning.title,
  description: PAGE_COPY.solutionRoutePlanning.description,
  path: '/solutions/route-planning',
  indexable: true,
});

export default function RoutePlanningPage() {
  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        Route planning for field sales
      </h1>
      <p className="text-zinc-400 text-lg mb-6">
        Tasks, daily routes, reminders, and maps—built from visits, leads, and
        pipeline priorities.
      </p>
      <div className="space-y-4 text-zinc-300 text-sm">
        <p>
          Reps spend less time driving between low-value stops and more time with
          accounts that move revenue.
        </p>
        <p>
          Planning connects to{' '}
          <a href="/solutions/visit-tracking" className="text-purple-400 underline">
            visit tracking
          </a>{' '}
          so planned vs completed routes are visible to leaders.
        </p>
      </div>
      <MarketingCta />
    </>
  );
}

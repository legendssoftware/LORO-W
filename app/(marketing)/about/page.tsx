import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.about.title,
  description: PAGE_COPY.about.description,
  path: '/about',
  indexable: true,
});

export default function AboutPage() {
  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        About LORO
      </h1>
      <p className="text-zinc-400 text-lg mb-6">
        LORO is field sales software built for South African B2B teams—visits,
        routes, pipeline, maps, and ERP-ready ordering in one platform.
      </p>
      <div className="space-y-4 text-zinc-300">
        <p>
          We help manufacturers, wholesalers, and distributors replace spreadsheet
          chaos with visit proof, manager dashboards, and mobile workflows reps
          actually use on the road.
        </p>
        <p>
          From{' '}
          <a href="/solutions/visit-tracking" className="text-purple-400 underline">
            visit tracking
          </a>{' '}
          to{' '}
          <a href="/solutions/competitor-intelligence" className="text-purple-400 underline">
            competitor mapping
          </a>
          , LORO connects field activity to revenue—not admin for its own sake.
        </p>
        <p>
          Optional workforce modules (attendance, leave) sit alongside field sales
          for teams that want one login for ops and people.
        </p>
      </div>
      <MarketingCta />
    </>
  );
}

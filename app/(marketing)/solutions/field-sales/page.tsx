import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.solutionFieldSales.title,
  description: PAGE_COPY.solutionFieldSales.description,
  path: '/solutions/field-sales',
  indexable: true,
});

export default function FieldSalesSolutionPage() {
  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        Field sales software
      </h1>
      <p className="text-zinc-400 text-lg mb-8">
        One platform for South African B2B field teams: mobile reps, office
        managers, and ERP-aligned orders.
      </p>
      <div className="space-y-6 text-zinc-300">
        <section>
          <h2 className="text-xl text-white font-medium mb-2">For reps on the road</h2>
          <p className="text-sm text-zinc-400">
            Plan the day, log visits with evidence, update leads, and place orders
            from a fat-finger-friendly mobile experience with resilient sync.
          </p>
        </section>
        <section>
          <h2 className="text-xl text-white font-medium mb-2">For sales managers</h2>
          <p className="text-sm text-zinc-400">
            Pipeline targets, visit coverage, and map visualisation—know who hit
            which accounts without end-of-week email chases.
          </p>
        </section>
        <section>
          <h2 className="text-xl text-white font-medium mb-2">Modules that connect</h2>
          <ul className="text-sm text-zinc-400 space-y-2 list-disc list-inside">
            <li>
              <a href="/solutions/visit-tracking" className="text-purple-400 underline">
                Visit tracking
              </a>
            </li>
            <li>
              <a href="/solutions/route-planning" className="text-purple-400 underline">
                Route planning
              </a>
            </li>
            <li>
              <a href="/solutions/pipeline" className="text-purple-400 underline">
                Pipeline
              </a>
            </li>
            <li>
              <a href="/integrations" className="text-purple-400 underline">
                ERP integrations
              </a>
            </li>
          </ul>
        </section>
      </div>
      <MarketingCta />
    </>
  );
}

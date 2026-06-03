import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.solutionCompetitorIntel.title,
  description: PAGE_COPY.solutionCompetitorIntel.description,
  path: '/solutions/competitor-intelligence',
  indexable: true,
});

export default function CompetitorIntelPage() {
  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        Competitor intelligence on a map
      </h1>
      <p className="text-zinc-400 text-lg mb-6">
        Track rival accounts beside your clients—threat levels, locations, and
        context for sharper field debriefs.
      </p>
      <div className="space-y-4 text-zinc-300 text-sm">
        <p>
          Reps and managers see competitive landscape geographically, not in
          scattered spreadsheets.
        </p>
        <p>
          After sign-in, use the map visualiser for live field layers, visit
          filters, and influence views alongside client accounts.
        </p>
      </div>
      <MarketingCta />
    </>
  );
}

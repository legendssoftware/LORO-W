import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.integrationSage.title,
  description: PAGE_COPY.integrationSage.description,
  path: '/integrations/sage',
  indexable: true,
});

export default function SageIntegrationPage() {
  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        Sage + LORO field sales
      </h1>
      <p className="text-zinc-400 text-lg mb-6">
        Align Sage ERP or accounting data with visits, pipeline, and B2B orders
        your reps capture in the field.
      </p>
      <div className="space-y-4 text-zinc-300 text-sm">
        <p>
          South African teams often run Sage for finance while reps still quote
          from outdated lists. LORO brings customer and product context into visit
          and order workflows so field and finance share one story.
        </p>
        <p>
          Roll out visits and pipeline first, then connect ordering flows with your
          integration partner. See the full{' '}
          <a href="/integrations" className="text-purple-400 underline">
            integrations hub
          </a>
          .
        </p>
      </div>
      <MarketingCta />
    </>
  );
}

import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.integrationSap.title,
  description: PAGE_COPY.integrationSap.description,
  path: '/integrations/sap',
  indexable: true,
});

export default function SapIntegrationPage() {
  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        SAP + LORO field operations
      </h1>
      <p className="text-zinc-400 text-lg mb-6">
        Enterprise field programmes with SAP-backed master data and LORO visit,
        pipeline, and map execution.
      </p>
      <div className="space-y-4 text-zinc-300 text-sm">
        <p>
          Large field teams need governed product and account data with fast mobile
          UX. LORO layers visit tracking, route planning, and manager dashboards on
          top of your SAP rollout patterns.
        </p>
        <p>
          Engage your integration team early for customer, material, and order
          interfaces scoped to your landscape.
        </p>
      </div>
      <MarketingCta />
    </>
  );
}

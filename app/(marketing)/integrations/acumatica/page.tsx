import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.integrationAcumatica.title,
  description: PAGE_COPY.integrationAcumatica.description,
  path: '/integrations/acumatica',
  indexable: true,
});

export default function AcumaticaIntegrationPage() {
  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        Acumatica + LORO
      </h1>
      <p className="text-zinc-400 text-lg mb-6">
        Cloud ERP inventory and customers available where reps plan routes and
        close orders.
      </p>
      <div className="space-y-4 text-zinc-300 text-sm">
        <p>
          Acumatica teams gain field visit proof and pipeline visibility without
          forcing reps into desktop ERP screens at every stop.
        </p>
        <p>
          LORO focuses on execution—visits, maps, competitor context, and mobile
          ordering—while your ERP remains the system of record.
        </p>
      </div>
      <MarketingCta />
    </>
  );
}

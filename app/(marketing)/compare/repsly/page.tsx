import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import {
  LORO_ERP_POSITION,
  LORO_PLATFORM_POSITION,
} from '@/lib/seo/marketing-platform-copy';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.compareRepsly.title,
  description: PAGE_COPY.compareRepsly.description,
  path: '/compare/repsly',
  indexable: true,
});

export default function CompareRepslyPage() {
  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        LORO vs Repsly
      </h1>
      <p className="text-zinc-400 text-lg mb-6">
        Factual comparison for teams evaluating retail execution and field sales
        platforms.
      </p>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border border-white/10 rounded-lg">
          <thead>
            <tr className="border-b border-white/10 text-zinc-300">
              <th className="text-left p-3">Topic</th>
              <th className="text-left p-3">LORO</th>
              <th className="text-left p-3">Repsly</th>
            </tr>
          </thead>
          <tbody className="text-zinc-400">
            <tr className="border-b border-white/10">
              <td className="p-3">Primary focus</td>
              <td className="p-3">SA B2B field sales, visits, pipeline, ERP orders</td>
              <td className="p-3">CPG retail execution, shelf &amp; promo programmes</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="p-3">Region</td>
              <td className="p-3">South Africa-first</td>
              <td className="p-3">Global CPG brands</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="p-3">Differentiator</td>
              <td className="p-3">Competitor map intel + optional workforce modules</td>
              <td className="p-3">Image recognition &amp; in-store execution depth</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="p-3">ERP</td>
              <td className="p-3">{LORO_ERP_POSITION}</td>
              <td className="p-3">Retail execution focus; ERP via integrations</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="p-3">Platform</td>
              <td className="p-3">{LORO_PLATFORM_POSITION}</td>
              <td className="p-3">Cloud SaaS; global CPG programmes</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-zinc-500 text-sm">
        Choose Repsly when shelf analytics and CPG programmes dominate. Choose LORO
        when B2B visits, pipeline, and SA ERP-aligned field sales are the priority.
      </p>
      <MarketingCta />
    </>
  );
}

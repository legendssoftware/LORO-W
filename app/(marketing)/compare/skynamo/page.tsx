import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import {
  LORO_ERP_POSITION,
  LORO_PLATFORM_POSITION,
} from '@/lib/seo/marketing-platform-copy';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.compareSkynamo.title,
  description: PAGE_COPY.compareSkynamo.description,
  path: '/compare/skynamo',
  indexable: true,
});

export default function CompareSkynamoPage() {
  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        LORO vs Skynamo
      </h1>
      <p className="text-zinc-400 text-lg mb-6">
        Both serve South African field sales—compare fit for your ERP, team size,
        and modules.
      </p>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border border-white/10 rounded-lg">
          <thead>
            <tr className="border-b border-white/10 text-zinc-300">
              <th className="text-left p-3">Topic</th>
              <th className="text-left p-3">LORO</th>
              <th className="text-left p-3">Skynamo</th>
            </tr>
          </thead>
          <tbody className="text-zinc-400">
            <tr className="border-b border-white/10">
              <td className="p-3">Positioning</td>
              <td className="p-3">Field sales + pipeline + competitor maps + optional HR</td>
              <td className="p-3">Unified sales channels, mobile ordering, RADAR AI</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="p-3">ERP</td>
              <td className="p-3">{LORO_ERP_POSITION}</td>
              <td className="p-3">Strong Sage/Acumatica/SAP marketing</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="p-3">Platform</td>
              <td className="p-3">{LORO_PLATFORM_POSITION}</td>
              <td className="p-3">Cloud SaaS; vendor-managed auth</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="p-3">Best for</td>
              <td className="p-3">Visit proof, competitor maps, optional workforce</td>
              <td className="p-3">Broad channel unification + RADAR</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-zinc-500 text-sm">
        Run a parallel pilot on visits and pipeline before migrating ERP
        interfaces.
      </p>
      <MarketingCta />
    </>
  );
}

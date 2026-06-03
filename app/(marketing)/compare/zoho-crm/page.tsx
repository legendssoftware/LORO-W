import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import {
  LORO_ERP_POSITION,
  LORO_PLATFORM_POSITION,
} from '@/lib/seo/marketing-platform-copy';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.compareZoho.title,
  description: PAGE_COPY.compareZoho.description,
  path: '/compare/zoho-crm',
  indexable: true,
});

export default function CompareZohoPage() {
  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        LORO vs Zoho CRM
      </h1>
      <p className="text-zinc-400 text-lg mb-6">
        Zoho CRM is a broad AI CRM suite; LORO is purpose-built for outside sales
        execution in South Africa.
      </p>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border border-white/10 rounded-lg">
          <thead>
            <tr className="border-b border-white/10 text-zinc-300">
              <th className="text-left p-3">Capability</th>
              <th className="text-left p-3">LORO</th>
              <th className="text-left p-3">Zoho CRM (+ RouteIQ)</th>
            </tr>
          </thead>
          <tbody className="text-zinc-400">
            <tr className="border-b border-white/10">
              <td className="p-3">Visit proof &amp; field evidence</td>
              <td className="p-3">Core workflow</td>
              <td className="p-3">Requires configuration / add-ons</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="p-3">Route planning</td>
              <td className="p-3">Native planning + maps</td>
              <td className="p-3">RouteIQ or third-party maps</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="p-3">Competitor mapping</td>
              <td className="p-3">Built-in</td>
              <td className="p-3">Custom modules typical</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="p-3">ERP</td>
              <td className="p-3">{LORO_ERP_POSITION}</td>
              <td className="p-3">CRM-centric; ERP via Zoho ecosystem</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="p-3">Platform</td>
              <td className="p-3">{LORO_PLATFORM_POSITION}</td>
              <td className="p-3">Cloud SaaS; Zoho account model</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="p-3">Ecosystem</td>
              <td className="p-3">Focused field sales + integrated ERP</td>
              <td className="p-3">Large Zoho app suite</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-zinc-500 text-sm">
        Choose Zoho when you need a general CRM across the whole business. Choose
        LORO when field visits, routes, and SA B2B execution are the bottleneck.
      </p>
      <MarketingCta />
    </>
  );
}

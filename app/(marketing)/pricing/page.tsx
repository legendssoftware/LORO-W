import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.pricing.title,
  description: PAGE_COPY.pricing.description,
  path: '/pricing',
  indexable: true,
});

export default function PricingPage() {
  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        Pricing
      </h1>
      <p className="text-zinc-400 text-lg mb-8">
        Flexible field sales software for teams in South Africa—scale users and
        branches as you grow.
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6">
          <h2 className="text-xl text-white font-medium mb-2">Growing teams</h2>
          <p className="text-zinc-400 text-sm mb-4">
            Core field sales: visits, pipeline, planning, clients, and mobile app
            access.
          </p>
          <ul className="text-sm text-zinc-300 space-y-2 list-disc list-inside">
            <li>Per-user licensing</li>
            <li>Branch and role setup</li>
            <li>Standard support</li>
          </ul>
        </div>
        <div className="rounded-xl border border-purple-500/30 bg-zinc-900/60 p-6">
          <h2 className="text-xl text-white font-medium mb-2">Enterprise</h2>
          <p className="text-zinc-400 text-sm mb-4">
            Multi-branch rollout, ERP integration, IoT, and advanced reporting.
          </p>
          <ul className="text-sm text-zinc-300 space-y-2 list-disc list-inside">
            <li>Dedicated onboarding</li>
            <li>ERP and integration review</li>
            <li>Custom targets and exports</li>
          </ul>
        </div>
      </div>
      <p className="text-zinc-500 text-sm mt-8">
        Contact your LORO partner or sign up to discuss rollout for your field
        team. Published pricing varies by organisation size and modules.
      </p>
      <MarketingCta />
    </>
  );
}

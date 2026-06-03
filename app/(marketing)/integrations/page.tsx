import Link from 'next/link';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.integrationsHub.title,
  description: PAGE_COPY.integrationsHub.description,
  path: '/integrations',
  indexable: true,
});

const erps = [
  {
    href: '/integrations/sage',
    name: 'Sage',
    blurb: 'Popular in South African SMB and mid-market finance stacks.',
  },
  {
    href: '/integrations/acumatica',
    name: 'Acumatica',
    blurb: 'Cloud ERP context for field quotes and orders.',
  },
  {
    href: '/integrations/sap',
    name: 'SAP',
    blurb: 'Enterprise product and account data for large field teams.',
  },
];

export default function IntegrationsPage() {
  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        ERP integrations
      </h1>
      <p className="text-zinc-400 text-lg mb-8">
        Connect LORO field sales to the systems that hold customers, products,
        and orders—so reps sell with live data on the road.
      </p>
      <ul className="space-y-4">
        {erps.map((erp) => (
          <li key={erp.href}>
            <Link
              href={erp.href}
              className="block rounded-xl border border-white/10 p-5 hover:border-purple-500/40 transition-colors"
            >
              <span className="text-white font-medium">{erp.name}</span>
              <p className="text-sm text-zinc-400 mt-1">{erp.blurb}</p>
            </Link>
          </li>
        ))}
      </ul>
      <MarketingCta />
    </>
  );
}

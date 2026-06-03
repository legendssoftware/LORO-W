import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.customers.title,
  description: PAGE_COPY.customers.description,
  path: '/customers',
  indexable: true,
});

const highlights = [
  {
    title: 'Field-first distributors',
    body: 'Teams use LORO for daily visit proof, pipeline targets, and map-based reviews instead of weekly spreadsheet merges.',
  },
  {
    title: 'Managers with one dashboard',
    body: 'Leaders see visits, leads, and period progress without chasing reps on WhatsApp for updates.',
  },
  {
    title: 'ERP-aligned ordering',
    body: 'B2B store and order flows respect customer and product master data finance already trusts.',
  },
];

export default function CustomersPage() {
  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        Customers
      </h1>
      <p className="text-zinc-400 text-lg mb-8">
        South African businesses use LORO to run field sales with less admin and
        clearer accountability.
      </p>
      <div className="space-y-6">
        {highlights.map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-white/10 p-5"
          >
            <h2 className="text-lg text-white font-medium mb-2">{item.title}</h2>
            <p className="text-zinc-400 text-sm">{item.body}</p>
          </div>
        ))}
      </div>
      <p className="text-zinc-500 text-sm mt-8">
        Case studies with named logos are added as customers approve publication.
        Request a reference walkthrough via sign-up.
      </p>
      <MarketingCta />
    </>
  );
}

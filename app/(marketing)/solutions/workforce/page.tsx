import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.solutionWorkforce.title,
  description: PAGE_COPY.solutionWorkforce.description,
  path: '/solutions/workforce',
  indexable: true,
});

export default function WorkforcePage() {
  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        Workforce &amp; attendance
      </h1>
      <p className="text-zinc-400 text-lg mb-6">
        Optional HR modules alongside field sales—attendance, leave, and payroll
        signals under the same LORO login.
      </p>
      <div className="space-y-4 text-zinc-300 text-sm">
        <p>
          Primary positioning remains{' '}
          <a href="/solutions/field-sales" className="text-purple-400 underline">
            field sales
          </a>
          ; workforce tools suit teams that want ops and people data together.
        </p>
        <p>
          South African teams benefit from local support across both field and HR
          workflows where enabled.
        </p>
      </div>
      <MarketingCta />
    </>
  );
}

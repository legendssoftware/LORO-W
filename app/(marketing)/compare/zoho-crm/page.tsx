import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { CompareZohoContent } from './compare-zoho-content';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.compareZoho.title,
  description: PAGE_COPY.compareZoho.description,
  path: '/compare/zoho-crm',
  indexable: true,
});

export default function CompareZohoPage() {
  return <CompareZohoContent />;
}

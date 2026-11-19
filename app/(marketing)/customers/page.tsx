import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { CustomersContent } from './customers-content';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.customers.title,
  description: PAGE_COPY.customers.description,
  path: '/customers',
  indexable: true,
});

export default function CustomersPage() {
  return <CustomersContent />;
}

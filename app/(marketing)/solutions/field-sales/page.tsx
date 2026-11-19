import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { FieldSalesContent } from './field-sales-content';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.solutionFieldSales.title,
  description: PAGE_COPY.solutionFieldSales.description,
  path: '/solutions/field-sales',
  indexable: true,
});

export default function FieldSalesSolutionPage() {
  return <FieldSalesContent />;
}

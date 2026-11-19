import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { SapContent } from './sap-content';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.integrationSap.title,
  description: PAGE_COPY.integrationSap.description,
  path: '/integrations/sap',
  indexable: true,
});

export default function SapIntegrationPage() {
  return <SapContent />;
}

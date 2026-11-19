import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { SageContent } from './sage-content';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.integrationSage.title,
  description: PAGE_COPY.integrationSage.description,
  path: '/integrations/sage',
  indexable: true,
});

export default function SageIntegrationPage() {
  return <SageContent />;
}

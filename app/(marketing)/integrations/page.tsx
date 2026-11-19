import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { IntegrationsContent } from './integrations-content';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.integrationsHub.title,
  description: PAGE_COPY.integrationsHub.description,
  path: '/integrations',
  indexable: true,
});

export default function IntegrationsPage() {
  return <IntegrationsContent />;
}

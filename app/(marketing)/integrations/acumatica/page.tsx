import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { AcumaticaContent } from './acumatica-content';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.integrationAcumatica.title,
  description: PAGE_COPY.integrationAcumatica.description,
  path: '/integrations/acumatica',
  indexable: true,
});

export default function AcumaticaIntegrationPage() {
  return <AcumaticaContent />;
}

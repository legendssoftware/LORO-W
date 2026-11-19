import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { AboutContent } from './about-content';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.about.title,
  description: PAGE_COPY.about.description,
  path: '/about',
  indexable: true,
});

export default function AboutPage() {
  return <AboutContent />;
}

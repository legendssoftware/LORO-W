import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.visits.title,
  description: PAGE_COPY.visits.description,
  path: '/visits',
});

export default function VisitsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import type { Metadata } from 'next';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ref: string }>;
}): Promise<Metadata> {
  const { ref } = await params;
  return buildPageMetadata({
    segmentTitle: PAGE_COPY.userSettings.title,
    description: PAGE_COPY.userSettings.description,
    path: `/reports/users/${ref}/settings`,
  });
}

export default function UserReportSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

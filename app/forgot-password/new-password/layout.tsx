import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.forgotPasswordNew.title,
  description: PAGE_COPY.forgotPasswordNew.description,
  path: '/forgot-password/new-password',
});

export default function NewPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

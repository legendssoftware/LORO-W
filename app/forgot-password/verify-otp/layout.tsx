import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.forgotPasswordVerify.title,
  description: PAGE_COPY.forgotPasswordVerify.description,
  path: '/forgot-password/verify-otp',
});

export default function VerifyOtpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import { MarketingLayoutRouter } from '@/components/marketing/marketing-layout-router';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MarketingLayoutRouter>{children}</MarketingLayoutRouter>;
}

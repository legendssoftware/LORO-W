'use client';

import { usePathname } from 'next/navigation';
import { LandingBlogShell } from '@/components/marketing/landing-blog-shell';
import { MarketingShell } from '@/components/marketing/marketing-shell';

function isBlogRoute(pathname: string) {
  return pathname === '/blog' || pathname.startsWith('/blog/');
}

export function MarketingLayoutRouter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';

  if (isBlogRoute(pathname)) {
    return <LandingBlogShell>{children}</LandingBlogShell>;
  }

  return <MarketingShell>{children}</MarketingShell>;
}

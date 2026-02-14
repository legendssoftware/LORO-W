'use client';

import { usePathname } from 'next/navigation';
import { AppHeader } from '@/components/app-header';

/**
 * Renders AppHeader only when not on the landing page (/) to avoid duplicate headers.
 * The landing page has its own header with nav links and CTA.
 */
export function ConditionalAppHeader() {
  const pathname = usePathname();
  if (pathname === '/') return null;
  return <AppHeader />;
}

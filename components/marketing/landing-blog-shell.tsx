'use client';

import { FadeIn } from '@/components/animations/fade-in';
import { ScrollToTop } from '@/components/animations/scroll-to-top';
import { LandingSiteFooter } from '@/components/marketing/landing-site-footer';
import { LandingSiteHeader } from '@/components/marketing/landing-site-header';

export function LandingBlogShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full min-w-0 flex-1 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black text-zinc-100">
      <div className="flex min-h-screen w-full flex-col">
        <FadeIn duration={0.8}>
          <LandingSiteHeader productHref="/#features" solutionsHref="/#solutions" />
        </FadeIn>
        <main className="flex-1 w-full">
          <div className="container mx-auto w-full max-w-8xl px-4 md:px-6 py-10 md:py-16">
            {children}
          </div>
        </main>
        <LandingSiteFooter />
        <ScrollToTop />
      </div>
    </div>
  );
}

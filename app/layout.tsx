import { Suspense } from 'react';
import localFont from 'next/font/local';
import { auth, currentUser } from '@clerk/nextjs/server';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'react-hot-toast';
import { OrgIdProvider } from '@/lib/org-id-context';
import { QueryProvider } from '@/api/providers/query-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { InactivityGuard } from '@/components/inactivity-guard';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ConditionalLayoutShell } from '@/components/conditional-layout-shell';
import { ThemeProvider } from '@/components/theme-provider';
import { I18nProvider } from '@/components/i18n-provider';
import { clerkLocalization } from '@/lib/i18n/clerk-locale';
import { LOCALE_COOKIE } from '@/lib/i18n/cookie';
import { isUiLocale, type UiLocale } from '@/lib/i18n/resolve-locale';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { defaultMetadata } from '@/lib/seo';
import { buildSiteVerificationMetadata } from '@/lib/seo/site-verification';
import './globals.css';

/** Self-hosted so `next build` does not depend on fonts.googleapis.com. Lora loads only in the marketing layout. */
const urbanist = localFont({
  src: './fonts/urbanist-latin-var.woff2',
  variable: '--font-urbanist',
  weight: '300 700',
  display: 'swap',
});

export const metadata: Metadata = {
  ...defaultMetadata,
  ...buildSiteVerificationMetadata(),
};

function organisationRefFromPublicMetadata(
  user: Awaited<ReturnType<typeof currentUser>>,
): string | null {
  if (!user?.publicMetadata || typeof user.publicMetadata !== 'object') {
    return null;
  }
  const ref = (user.publicMetadata as Record<string, unknown>).organisationRef;
  return typeof ref === 'string' && ref.length > 0 ? ref : null;
}

async function resolveInitialOrgId(): Promise<string | null> {
  try {
    const { orgId, userId } = await auth();
    if (orgId) return orgId;
    if (!userId) return null;

    const clerkUser = await currentUser();
    return organisationRefFromPublicMetadata(clerkUser);
  } catch {
    // Clerk API error or stale session — client OrgIdProvider syncs organisationRef via useUser()
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialOrgId = await resolveInitialOrgId();
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const lang: UiLocale = isUiLocale(cookieLocale) ? cookieLocale : 'en';

  return (
    <ClerkProvider
      afterSignOutUrl="/sign-in"
      dynamic
      localization={clerkLocalization(lang)}
    >
      <html lang={lang} suppressHydrationWarning>
        <body className={`${urbanist.variable} font-sans antialiased`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <OrgIdProvider initialOrgId={initialOrgId}>
            <QueryProvider>
            <I18nProvider initialLocale={lang}>
            <TooltipProvider>
              <SidebarProvider defaultOpen={false}>
                <InactivityGuard />
                <ConditionalLayoutShell>
                  <Suspense
                    fallback={
                      <div className="flex min-h-[200px] items-center justify-center">
                        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    }
                  >
                    {children}
                  </Suspense>
                </ConditionalLayoutShell>
              </SidebarProvider>
              <Toaster
              position="bottom-center"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--popover)',
                  color: 'var(--popover-foreground)',
                  border: '1px solid var(--border)',
                },
              }}
            />
            </TooltipProvider>
            </I18nProvider>
            </QueryProvider>
            </OrgIdProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

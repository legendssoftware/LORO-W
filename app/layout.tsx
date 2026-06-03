import { Suspense } from 'react';
import { Urbanist, Lora } from 'next/font/google';
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
import type { Metadata } from 'next';
import { defaultMetadata } from '@/lib/seo';
import { buildSiteVerificationMetadata } from '@/lib/seo/site-verification';
import './globals.css';

const urbanist = Urbanist({
  variable: '--font-urbanist',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const lora = Lora({
  variable: '--font-lora',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  style: ['normal', 'italic'],
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

  return (
    <ClerkProvider afterSignOutUrl="/sign-in" dynamic>
      <html lang="en" suppressHydrationWarning>
        <body className={`${urbanist.variable} ${lora.variable} font-sans antialiased`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <OrgIdProvider initialOrgId={initialOrgId}>
            <QueryProvider>
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
            </QueryProvider>
            </OrgIdProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

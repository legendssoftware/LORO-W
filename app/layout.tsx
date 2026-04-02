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
import { defaultMetadata } from '@/lib/seo';
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

export const metadata = defaultMetadata;

function organisationRefFromPublicMetadata(
  user: Awaited<ReturnType<typeof currentUser>>,
): string | null {
  if (!user?.publicMetadata || typeof user.publicMetadata !== 'object') {
    return null;
  }
  const ref = (user.publicMetadata as Record<string, unknown>).organisationRef;
  return typeof ref === 'string' && ref.length > 0 ? ref : null;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { orgId } = await auth();
  const clerkUser = await currentUser();
  const initialOrgId = orgId ?? organisationRefFromPublicMetadata(clerkUser);

  return (
    <ClerkProvider afterSignOutUrl="/sign-in" dynamic>
      <html lang="en" className="light" suppressHydrationWarning>
        <body className={`${urbanist.variable} ${lora.variable} font-sans antialiased`}>
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
                background: '#1f2937',
                color: '#ffffff',
              },
            }}
          />
          </TooltipProvider>
          </QueryProvider>
          </OrgIdProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

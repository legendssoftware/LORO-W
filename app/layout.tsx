import { Suspense } from 'react';
import { Urbanist } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'react-hot-toast';
import { QueryProvider } from '@/api/providers/query-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SiteBanner } from '@/components/site-banner';
import { ConditionalAppHeader } from '@/components/conditional-app-header';
import { AccessGuard } from '@/components/access-guard';
import { InactivityGuard } from '@/components/inactivity-guard';
import { SidebarProvider } from '@/components/sidebar/sidebar-provider';
import { DashboardSidebar } from '@/components/sidebar/dashboard-sidebar';
import { defaultMetadata } from '@/lib/seo';
import './globals.css';

const urbanist = Urbanist({
  variable: '--font-urbanist',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const metadata = defaultMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="light" suppressHydrationWarning>
        <body className={`${urbanist.variable} font-sans antialiased`}>
          <QueryProvider>
          <TooltipProvider>
            <SidebarProvider>
              <InactivityGuard />
              <SiteBanner />
              <div className="flex h-svh">
                <DashboardSidebar />
                <div className="flex-1 flex flex-col min-w-0 min-h-0 el bg-sidebar pt-10">
                  <ConditionalAppHeader />
                  <ErrorBoundary>
                    <AccessGuard>
                      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        <Suspense
                          fallback={
                            <div className="flex min-h-[200px] items-center justify-center">
                              <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            </div>
                          }
                        >
                          {children}
                        </Suspense>
                      </div>
                    </AccessGuard>
                  </ErrorBoundary>
                </div>
              </div>
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
        </body>
      </html>
    </ClerkProvider>
  );
}

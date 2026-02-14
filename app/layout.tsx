import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Urbanist } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'react-hot-toast';
import { QueryProvider } from '@/api/providers/query-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppHeader } from '@/components/app-header';
import { AccessGuard } from '@/components/access-guard';
import { SidebarProvider } from '@/components/sidebar/sidebar-provider';
import { DashboardSidebar } from '@/components/sidebar/dashboard-sidebar';
import './globals.css';

const urbanist = Urbanist({
  variable: '--font-urbanist',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'LORO | Business Management',
  description: 'Automate What Matters, Control What Counts',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${urbanist.variable} font-sans antialiased`}>
          <QueryProvider>
          <TooltipProvider>
            <SidebarProvider>
              <AppHeader />
              <DashboardSidebar />
              <ErrorBoundary>
                <AccessGuard>
                  <Suspense
                    fallback={
                      <div className="flex min-h-[200px] items-center justify-center">
                        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    }
                  >
                    {children}
                  </Suspense>
                </AccessGuard>
              </ErrorBoundary>
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

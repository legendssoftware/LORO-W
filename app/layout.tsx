import { Suspense } from 'react';
import { Urbanist, Lora } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'react-hot-toast';
import { QueryProvider } from '@/api/providers/query-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { InactivityGuard } from '@/components/inactivity-guard';
import { SidebarProvider } from '@/components/sidebar/sidebar-provider';
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="light" suppressHydrationWarning>
        <body className={`${urbanist.variable} ${lora.variable} font-sans antialiased`}>
          <QueryProvider>
          <TooltipProvider>
            <SidebarProvider>
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
        </body>
      </html>
    </ClerkProvider>
  );
}

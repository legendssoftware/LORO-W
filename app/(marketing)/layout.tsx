import localFont from 'next/font/local';
import { MarketingLayoutRouter } from '@/components/marketing/marketing-layout-router';

/** Marketing-only serif — keeps Lora off the signed-in app bundle path. */
const lora = localFont({
  src: [
    {
      path: '../fonts/lora-latin-var.woff2',
      weight: '400 700',
      style: 'normal',
    },
    {
      path: '../fonts/lora-latin-italic-var.woff2',
      weight: '400 700',
      style: 'italic',
    },
  ],
  variable: '--font-lora',
  display: 'swap',
});

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${lora.variable}`}>
      <MarketingLayoutRouter>{children}</MarketingLayoutRouter>
    </div>
  );
}

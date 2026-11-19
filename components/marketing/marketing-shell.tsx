'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { BrandMark } from '@/components/brand-mark';
import { LanguageSwitcher } from '@/components/language-switcher';

const solutionLinks = [
  { href: '/solutions/field-sales', labelKey: 'footer.fieldSales' },
  { href: '/solutions/visit-tracking', labelKey: 'footer.visitTracking' },
  { href: '/solutions/route-planning', labelKey: 'footer.routePlanning' },
  { href: '/solutions/pipeline', labelKey: 'footer.pipeline' },
  { href: '/solutions/competitor-intelligence', labelKey: 'footer.competitorIntel' },
] as const;

export function MarketingShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation('marketing');
  return (
    <div className="min-h-screen w-full min-w-0 flex-1 bg-zinc-950 text-zinc-100">
      <header className="border-b border-white/10 bg-black/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4 md:px-6">
          <Link href="/" className="shrink-0">
            <BrandMark
              priority
              wordmarkClassName="text-lg font-medium tracking-tight text-white"
            />
          </Link>
          <nav
            className="hidden lg:flex items-center gap-5 text-sm text-zinc-400"
            aria-label={t('shell.navLabel')}
          >
            {solutionLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:text-white transition-colors"
              >
                {t(item.labelKey)}
              </Link>
            ))}
            <Link href="/integrations" className="hover:text-white transition-colors">
              {t('footer.integrations')}
            </Link>
            <Link href="/blog" className="hover:text-white transition-colors">
              {t('footer.blog')}
            </Link>
            <Link href="/pricing" className="hover:text-white transition-colors">
              {t('footer.pricing')}
            </Link>
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <LanguageSwitcher id="marketing-shell-language" />
            <Button asChild variant="ghost" size="sm" className="text-zinc-300">
              <Link href="/sign-in">{t('footer.signIn')}</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white border-0"
            >
              <Link href="/sign-up">{t('footer.getStarted')}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-10 md:py-16 max-w-3xl">
        {children}
      </main>

      <footer className="border-t border-white/10 bg-black py-10 mt-8">
        <div className="container mx-auto px-4 md:px-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 text-sm text-zinc-400">
          <div>
            <BrandMark
              className="mb-2"
              wordmarkClassName="text-white font-medium"
            />
            <p className="text-xs">{t('footer.taglineShort')}</p>
          </div>
          <div>
            <p className="text-zinc-300 font-medium mb-2">{t('footer.solutions')}</p>
            <ul className="space-y-1">
              {solutionLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-white">
                    {t(item.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-zinc-300 font-medium mb-2">{t('footer.company')}</p>
            <ul className="space-y-1">
              <li>
                <Link href="/about" className="hover:text-white">
                  {t('footer.about')}
                </Link>
              </li>
              <li>
                <Link href="/customers" className="hover:text-white">
                  {t('footer.customers')}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white">
                  {t('footer.pricing')}
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-white">
                  {t('footer.privacy')}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-zinc-300 font-medium mb-2">{t('footer.compare')}</p>
            <ul className="space-y-1">
              <li>
                <Link href="/compare/skynamo" className="hover:text-white">
                  {t('footer.vsSkynamo')}
                </Link>
              </li>
              <li>
                <Link href="/compare/repsly" className="hover:text-white">
                  {t('footer.vsRepsly')}
                </Link>
              </li>
              <li>
                <Link href="/compare/zoho-crm" className="hover:text-white">
                  {t('footer.vsZoho')}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="container mx-auto px-4 md:px-6 mt-8 text-xs text-zinc-500">
          © {new Date().getFullYear()} LORO. {t('footer.rights')}
        </p>
      </footer>
    </div>
  );
}

export function MarketingCta() {
  const { t } = useTranslation('marketing');
  return (
    <div className="mt-10 rounded-xl border border-white/10 bg-zinc-900/50 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <p className="font-medium text-white">{t('shell.cta.title')}</p>
        <p className="text-sm text-zinc-400 mt-1">
          {t('shell.cta.body')}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild className="bg-purple-600 hover:bg-purple-700 border-0">
          <Link href="/sign-up">{t('footer.getStarted')}</Link>
        </Button>
        <Button asChild variant="outline" className="border-zinc-600 text-zinc-200">
          <Link href="/">{t('shell.cta.backHome')}</Link>
        </Button>
      </div>
    </div>
  );
}

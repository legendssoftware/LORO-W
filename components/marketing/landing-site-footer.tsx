'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/brand-mark';
import {
  InstagramIcon,
  LinkedInIcon,
  TwitterIcon,
  YoutubeIcon,
} from '@/lib/icons';

export function LandingSiteFooter() {
  const { t } = useTranslation('marketing');
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-black py-12 md:py-16">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center gap-10 text-center md:flex-row md:justify-between md:items-start md:text-left">
          <div className="flex flex-col items-center space-y-4 max-w-xs mx-auto md:items-start md:mx-0">
            <div className="flex items-center gap-2">
              <BrandMark wordmarkClassName="text-xl font-normal tracking-tight text-white" />
            </div>
            <p className="font-body max-w-xs text-sm text-zinc-400">
              {t('footer.tagline')}
            </p>
            <p className="font-body text-xs text-zinc-400">© {year} LORO. {t('footer.rights')}</p>
            <div className="flex gap-4 justify-center md:justify-start">
              <Link
                href="#"
                className="text-zinc-400 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <InstagramIcon size={20} />
              </Link>
              <Link
                href="#"
                className="text-zinc-400 hover:text-white transition-colors"
                aria-label="X"
              >
                <TwitterIcon size={20} />
              </Link>
              <Link
                href="#"
                className="text-zinc-400 hover:text-white transition-colors"
                aria-label="YouTube"
              >
                <YoutubeIcon size={20} />
              </Link>
              <Link
                href="#"
                className="text-zinc-400 hover:text-white transition-colors"
                aria-label="LinkedIn"
              >
                <LinkedInIcon size={20} />
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 w-full sm:w-auto justify-items-center md:justify-items-start">
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <h3 className="font-body mb-4 text-sm font-medium text-zinc-300">{t('footer.company')}</h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/about"
                    className="font-body text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {t('footer.about')}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/customers"
                    className="font-body text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {t('footer.customers')}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="font-body text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {t('footer.pricing')}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog"
                    className="font-body text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {t('footer.blog')}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy-policy"
                    className="font-body text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {t('footer.privacyPolicy')}
                  </Link>
                </li>
              </ul>
            </div>
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <h3 className="font-body mb-4 text-sm font-medium text-zinc-300">{t('footer.solutions')}</h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/solutions/field-sales"
                    className="font-body text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {t('footer.fieldSales')}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/solutions/visit-tracking"
                    className="font-body text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {t('footer.visitTracking')}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/solutions/route-planning"
                    className="font-body text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {t('footer.routePlanning')}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/integrations"
                    className="font-body text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {t('footer.integrations')}
                  </Link>
                </li>
              </ul>
            </div>
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <h3 className="font-body mb-4 text-sm font-medium text-zinc-300">{t('footer.compare')}</h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/compare/skynamo"
                    className="font-body text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {t('footer.vsSkynamo')}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/compare/repsly"
                    className="font-body text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {t('footer.vsRepsly')}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/compare/zoho-crm"
                    className="font-body text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {t('footer.vsZoho')}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/sign-up"
                    className="font-body text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {t('footer.getStarted')}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

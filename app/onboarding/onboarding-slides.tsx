'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ONBOARDING_SLIDE_IDS } from '@/lib/onboarding-data';
import { Button } from '@/components/ui/button';
import { MarketingShell } from '@/components/marketing/marketing-shell';

export function OnboardingSlides() {
  const { t } = useTranslation('marketing');
  const [index, setIndex] = useState(0);
  const slideId = ONBOARDING_SLIDE_IDS[index];
  const isLast = index === ONBOARDING_SLIDE_IDS.length - 1;

  return (
    <MarketingShell>
      <p className="text-sm text-purple-400 mb-2">{t('onboarding.getStarted')}</p>
      <h1 className="text-3xl font-normal tracking-tight text-white mb-2">
        {t(`onboarding.slides.${slideId}.title`)}
      </h1>
      <p className="text-zinc-400 mb-8">{t(`onboarding.slides.${slideId}.description`)}</p>
      <div className="flex gap-2 mb-8">
        {ONBOARDING_SLIDE_IDS.map((id, i) => (
          <span
            key={id}
            className={`h-1.5 flex-1 rounded-full ${i === index ? 'bg-purple-500' : 'bg-zinc-700'}`}
            aria-hidden
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {index > 0 && (
          <Button
            type="button"
            variant="outline"
            className="border-zinc-600"
            onClick={() => setIndex((i) => i - 1)}
          >
            {t('onboarding.back')}
          </Button>
        )}
        {!isLast ? (
          <Button
            type="button"
            className="bg-purple-600 hover:bg-purple-700 border-0"
            onClick={() => setIndex((i) => i + 1)}
          >
            {t('onboarding.next')}
          </Button>
        ) : (
          <Button asChild className="bg-purple-600 hover:bg-purple-700 border-0">
            <Link href="/sign-up">{t('onboarding.createAccount')}</Link>
          </Button>
        )}
        <Button asChild variant="ghost" className="text-zinc-400">
          <Link href="/">{t('onboarding.skipToHome')}</Link>
        </Button>
      </div>
    </MarketingShell>
  );
}

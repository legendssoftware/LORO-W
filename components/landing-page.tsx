'use client';

import Link from 'next/link';
import Image from 'next/image';
// Icons from local lib (no lucide-react dependency in this component)
import { ArrowRightIcon, CpuIcon, WifiIcon } from '@/lib/icons';
import { motion } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { PageTransition } from '@/components/animations/page-transition';
import { MotionSection } from '@/components/animations/motion-section';
import { StaggerContainer } from '@/components/animations/stagger-container';
import { StaggerItem } from '@/components/animations/stagger-item';
import { FadeIn } from '@/components/animations/fade-in';
import { ScrollToTop } from '@/components/animations/scroll-to-top';
import { LandingFaqSection } from '@/components/landing-faq-section';
import { LandingSiteFooter } from '@/components/marketing/landing-site-footer';
import { LandingSiteHeader } from '@/components/marketing/landing-site-header';
import { SmoothScroll } from '@/components/smooth-scroll';
import { ANDROID_APP_URL } from '@/lib/android-app-url';
import { getDefaultCoverSlots, getShuffledCoverPaths, COVER_FALLBACK_URLS, HERO_CENTER_IMAGE } from '@/lib/cover-images';

const STAT_ITEMS = [
  { key: 'businesses', value: '2K+' },
  { key: 'partners', value: '120+' },
  { key: 'fieldUsers', value: '800+' },
  { key: 'spaces', value: '2K+' },
] as const;

const FEATURE_ITEMS = [
  { key: 'smartLead', emoji: '📊' },
  { key: 'pipelineByStage', emoji: '📋' },
  { key: 'taskProject', emoji: '✅' },
  { key: 'liveAnalytics', emoji: '📈' },
  { key: 'erpIntegration', emoji: '🔗' },
  { key: 'workflowAutomation', emoji: '⚙️' },
] as const;

const RADIAL_ITEMS = [
  { key: 'smartRouting', angle: 0 },
  { key: 'liveErp', angle: 60 },
  { key: 'unifiedControl', angle: 120 },
  { key: 'smartScheduling', angle: 180 },
  { key: 'minimalInterface', angle: 240 },
  { key: 'automation', angle: 300 },
] as const;

const OPS_BLOCKS = ['erpSync', 'statusClarity', 'operationalControl'] as const;

const RING_ITEMS = [
  { key: 'claims', angle: 0 },
  { key: 'leads', angle: 90 },
  { key: 'visits', angle: 180 },
  { key: 'gprTracking', angle: 270 },
] as const;

export function LandingPage() {
  const { t } = useTranslation('marketing');
  /** Random cover assignment for hero and feature sections (stable per session). Initial value is deterministic to avoid hydration mismatch; shuffle runs client-side after mount. */
  const [coverSlots, setCoverSlots] = useState(() => getDefaultCoverSlots());
  /** When a cover image 404s, use fallback URL for that slot. */
  const [coverFallback, setCoverFallback] = useState<Record<number, boolean>>({});
  useEffect(() => {
    setCoverSlots(getShuffledCoverPaths());
  }, []);
  const useCoverSrc = (slotIndex: number) =>
    coverFallback[slotIndex] ? COVER_FALLBACK_URLS[slotIndex] : coverSlots[slotIndex];
  const setCoverError = useCallback((slotIndex: number) => {
    setCoverFallback((prev) => ({ ...prev, [slotIndex]: true }));
  }, []);

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-950 to-black text-zinc-100">
        <div className="flex flex-col">
          <SmoothScroll />
          <FadeIn duration={0.8}>
            <LandingSiteHeader />
          </FadeIn>

        <main className="flex-1">
          {/* Hero — headline, social proof, app CTAs, overlapping phones */}
          <MotionSection className="relative min-h-screen flex flex-col justify-center py-12 md:py-20 lg:py-28 md:min-h-0" duration={0.8}>
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.12),transparent)]" aria-hidden />
            <div className="container relative mx-auto px-4 md:px-6 flex-1 flex flex-col justify-center">
              <div className="flex w-full flex-col items-center justify-center gap-8 text-center">
                <StaggerContainer className="flex flex-col items-center gap-4 lg:gap-6" delay={0.2} staggerChildren={0.12}>
                  <StaggerItem>
                    <h1 className="font-body text-3xl font-normal tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
                      {t('landing.headline')}{' '}
                      <span className="font-serif italic">{t('landing.headlineItalic')}</span>
                    </h1>
                  </StaggerItem>
                  <StaggerItem>
                    <p className="font-body mx-auto max-w-[560px] text-sm text-zinc-400 md:text-base">
                      {t('landing.subheadline')}
                    </p>
                  </StaggerItem>
                  <StaggerItem className="flex flex-col items-center gap-3 w-full max-w-md">
                    <p className="font-body text-xs text-zinc-400">
                      {t('landing.community')}
                    </p>
                    <div className="flex -space-x-2">
                      {['SM', 'JT', 'PR'].map((initials, i) => (
                        <div
                          key={i}
                          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-zinc-900 bg-zinc-600 text-[10px] font-medium text-white"
                        >
                          {initials}
                        </div>
                      ))}
                    </div>
                  </StaggerItem>
                </StaggerContainer>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    asChild
                    className="font-body rounded-lg bg-purple-600 text-white hover:bg-purple-700 border-0"
                    size="lg"
                  >
                    <Link
                      href={ANDROID_APP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('landing.tryAndroidApp')}
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className="font-body rounded-lg bg-purple-600 text-white hover:bg-purple-700 border-0"
                    size="lg"
                  >
                    <Link href="/sign-in">{t('landing.myAccount')}</Link>
                  </Button>
                </div>
                <div className="relative mt-4 flex items-end justify-center" style={{ minHeight: 'clamp(338px, 52vw, 494px)' }}>
                  <div className="absolute left-1/2 top-1/2 z-[3] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2 text-xs text-zinc-300">
                    {t('landing.liveSync')}
                  </div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="absolute left-1/2 z-[1] w-[clamp(130px,26vw,208px)] origin-bottom"
                    style={{ transform: 'translateX(-82%) rotate(-14deg)' }}
                  >
                    <div className="overflow-hidden rounded-[2rem] shadow-xl bg-zinc-900" style={{ aspectRatio: '9/19' }}>
                      <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-zinc-800">
                        <Image src={useCoverSrc(0)} fill alt={t('landing.imageAlt.app')} className="object-cover" sizes="156px, 208px" onError={() => setCoverError(0)} />
                        <div className="absolute inset-0 bg-black/20 pointer-events-none rounded-[2rem]" aria-hidden />
                      </div>
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 16, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                    className="relative z-[2] w-[clamp(156px,33.8vw,260px)] shadow-2xl"
                  >
                    <div className="overflow-hidden rounded-[2.2rem] bg-zinc-900" style={{ aspectRatio: '9/19' }}>
                      <div className="relative h-full w-full overflow-hidden rounded-[2.2rem] bg-zinc-800">
                        <Image src={coverFallback[1] ? COVER_FALLBACK_URLS[1] : HERO_CENTER_IMAGE} fill alt={t('landing.imageAlt.dashboard')} className="object-cover" sizes="182px, 260px" priority onError={() => setCoverError(1)} />
                        <div className="absolute inset-0 bg-black/20 pointer-events-none rounded-[2.2rem]" aria-hidden />
                      </div>
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
                    className="absolute left-1/2 z-[1] w-[clamp(130px,26vw,208px)] origin-bottom"
                    style={{ transform: 'translateX(-18%) rotate(14deg)' }}
                  >
                    <div className="overflow-hidden rounded-[2rem] shadow-xl bg-zinc-900" style={{ aspectRatio: '9/19' }}>
                      <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-zinc-800">
                        <Image src={useCoverSrc(2)} fill alt={t('landing.imageAlt.analytics')} className="object-cover" sizes="156px, 208px" onError={() => setCoverError(2)} />
                        <div className="absolute inset-0 bg-black/20 pointer-events-none rounded-[2rem]" aria-hidden />
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </MotionSection>

          {/* Stats bar — solid black */}
          <section className="bg-black py-16 md:py-20" id="solutions">
            <div className="container mx-auto px-4 md:px-6">
              <h2 className="font-body text-center text-2xl font-normal tracking-tight text-white sm:text-3xl md:text-4xl mb-12 md:mb-16">
                {t('landing.statsTitle')} <span className="font-serif italic">{t('landing.statsTitleItalic')}</span>
              </h2>
              <div className="grid grid-cols-2 gap-6 gap-y-10 sm:gap-8 md:grid-cols-4 md:gap-12">
                {STAT_ITEMS.map((stat) => (
                  <div key={stat.key} className="text-center">
                    <p className="font-body text-xs text-zinc-400 uppercase tracking-wide">{t(`landing.stats.${stat.key}.label`)}</p>
                    <p className="font-body mt-1 text-3xl font-normal text-white md:text-4xl">{stat.value}</p>
                    <p className="font-body mt-1 text-xs text-zinc-400">{t(`landing.stats.${stat.key}.sub`)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Technology That Works in Harmony */}
          <MotionSection className="relative py-16 md:py-24 bg-gradient-to-b from-zinc-950 to-zinc-900" direction="up">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mb-12 text-center">
                <h2 className="font-body text-2xl font-normal tracking-tight text-white sm:text-3xl md:text-4xl mb-3">
                  {t('landing.techTitle')}
                </h2>
                <p className="font-body mx-auto max-w-2xl text-sm text-zinc-400">
                  {t('landing.techBody')}
                </p>
              </div>
              <motion.div
                className="relative mx-auto max-w-5xl rounded-2xl overflow-hidden aspect-[16/10] md:aspect-[2/1] bg-zinc-800"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <Image
                  src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80"
                  alt={t('landing.imageAlt.office')}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 1200px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute left-[8%] bottom-[20%] rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-4 w-[200px]">
                  <p className="font-body text-xs text-zinc-400">{t('landing.liveSalesDashboard')}</p>
                  <p className="font-body text-2xl font-semibold text-white mt-1">R 125,450</p>
                  <div className="mt-2 h-2 w-12 rounded-full bg-white/20" />
                </div>
                <div className="absolute right-[12%] bottom-[25%] rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-4 w-[200px]">
                  <p className="font-body text-xs text-zinc-400">{t('landing.quotesOrders')}</p>
                  <p className="font-body text-2xl font-semibold text-white mt-1">{t('landing.activeCount')}</p>
                  <div className="mt-2 h-2 w-12 rounded-full bg-white/20" />
                </div>
              </motion.div>
            </div>
          </MotionSection>

          {/* Powerful Features, Thoughtfully Designed — 6-card grid */}
          <MotionSection className="py-16 md:py-24 bg-zinc-900/50" direction="up" id="features">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mb-12 text-center">
                <h2 className="font-body text-2xl font-normal tracking-tight text-white sm:text-3xl md:text-4xl mb-3">
                  {t('landing.featuresTitle')} <span className="font-serif italic">{t('landing.featuresTitleItalic')}</span>
                </h2>
                <p className="font-body mx-auto max-w-2xl text-sm text-zinc-400">
                  {t('landing.featuresBody')}
                </p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURE_ITEMS.map((card, i) => (
                  <motion.div
                    key={card.key}
                    className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6 min-h-[220px] flex flex-col"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                    viewport={{ once: true }}
                  >
                    <h3 className="font-body text-lg font-normal text-zinc-100 flex items-center gap-2">
                      <span aria-hidden>{card.emoji}</span>
                      {t(`landing.features.${card.key}.title`)}
                    </h3>
                    <p className="font-body mt-2 text-sm text-zinc-400 flex-1">{t(`landing.features.${card.key}.desc`)}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </MotionSection>

          {/* Every Detail, Precisely Controlled — central phone + radial callouts */}
          <MotionSection className="relative py-16 md:py-24 bg-gradient-to-b from-zinc-900 to-zinc-950" direction="up">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.03),transparent_50%)]" aria-hidden />
            <div className="container relative mx-auto px-4 md:px-6">
              <div className="mb-12 text-center">
                <h2 className="font-body text-2xl font-normal tracking-tight text-white sm:text-3xl md:text-4xl mb-3">
                  {t('landing.controlTitle')} <span className="font-serif italic">{t('landing.controlTitleItalic')}</span>
                </h2>
                <p className="font-body mx-auto max-w-2xl text-sm text-zinc-400">
                  {t('landing.controlBody')}
                </p>
              </div>
              <div className="relative flex items-center justify-center min-h-[360px] sm:min-h-[420px] md:min-h-[480px]">
                <div className="absolute inset-0 grid grid-cols-4 gap-px opacity-20 max-w-4xl mx-auto" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                {RADIAL_ITEMS.map((item, i) => {
                  const r = 130;
                  const rad = (item.angle * Math.PI) / 180;
                  const x = Math.cos(rad) * r;
                  const y = Math.sin(rad) * r;
                  return (
                    <motion.div
                      key={item.key}
                      className="absolute z-10 flex flex-col items-center gap-2"
                      style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: i * 0.06 }}
                      viewport={{ once: true }}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
                        <CpuIcon size={20} className="text-zinc-300" />
                      </div>
                      <span className="font-body text-xs text-zinc-300 whitespace-nowrap">{t(`landing.radial.${item.key}`)}</span>
                    </motion.div>
                  );
                })}
                <motion.div
                  className="relative z-[2] w-[clamp(140px,22vw,200px)]"
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                >
                  <div className="overflow-hidden rounded-[2.2rem] bg-zinc-900 shadow-2xl" style={{ aspectRatio: '9/19' }}>
                    <div className="relative h-full w-full overflow-hidden rounded-[2.2rem] bg-zinc-800">
                      <Image src={useCoverSrc(1)} fill alt={t('landing.imageAlt.control')} className="object-cover" sizes="200px" onError={() => setCoverError(1)} />
                      <div className="absolute inset-0 bg-black/20 pointer-events-none rounded-[2.2rem]" aria-hidden />
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </MotionSection>

          {/* A Smarter, Fairer... — 3 text blocks + concentric diagram */}
          <MotionSection className="bg-black py-16 md:py-24" direction="up">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mb-12 text-center">
                <h2 className="font-body text-2xl font-normal tracking-tight text-white sm:text-3xl md:text-4xl mb-3">
                  {t('landing.opsTitle')}
                </h2>
                <p className="font-body mx-auto max-w-2xl text-sm text-zinc-400">
                  {t('landing.opsBody')}
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto text-center md:text-left">
                <div className="flex flex-col items-center space-y-8 md:items-start">
                  {OPS_BLOCKS.map((block) => (
                    <motion.div key={block} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }} className="max-w-md md:max-w-none">
                      <h3 className="font-body text-lg font-normal text-white">{t(`landing.ops.${block}.title`)}</h3>
                      <p className="font-body mt-2 text-sm text-zinc-400">{t(`landing.ops.${block}.body`)}</p>
                    </motion.div>
                  ))}
                </div>
                <div className="flex justify-center">
                  <motion.div
                    className="relative h-[280px] w-[280px] md:h-[320px] md:w-[320px]"
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/5">
                        <WifiIcon size={28} className="text-white" />
                      </div>
                    </div>
                    {[1, 2, 3, 4].map((ring) => (
                      <div
                        key={ring}
                        className="absolute rounded-full border border-white/10"
                        style={{ inset: `${ring * 14}%`, borderWidth: 1 }}
                      />
                    ))}
                    {RING_ITEMS.map((item) => {
                      const r = 42;
                      const rad = (item.angle * Math.PI) / 180;
                      const x = 50 + Math.cos(rad) * r;
                      const y = 50 + Math.sin(rad) * r;
                      return (
                        <span
                          key={item.key}
                          className="absolute font-body text-xs text-zinc-400 -translate-x-1/2 -translate-y-1/2"
                          style={{ left: `${x}%`, top: `${y}%` }}
                        >
                          {t(`landing.ring.${item.key}`)}
                        </span>
                      );
                    })}
                  </motion.div>
                </div>
              </div>
            </div>
          </MotionSection>

          {/* See Your Data. Control Your Operations. — CTA + phones */}
          <MotionSection className="relative py-16 md:py-24 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black" direction="up">
            <div className="container mx-auto px-4 md:px-6">
              <div className="text-center mb-12">
                <h2 className="font-body text-2xl font-normal tracking-tight text-white sm:text-3xl md:text-4xl mb-3">
                  {t('landing.ctaTitle')} <span className="font-serif italic">{t('landing.ctaTitleItalic')}</span>
                </h2>
                <p className="font-body mx-auto max-w-xl text-sm text-zinc-400 mb-8">
                  {t('landing.ctaBody')}
                </p>
                <Button asChild className="font-body rounded-lg border-0 bg-transparent text-white hover:bg-purple-600 hover:text-white gap-2" size="lg">
                  <Link href={ANDROID_APP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                    {t('landing.downloadApp')}
                    <ArrowRightIcon size={18} />
                  </Link>
                </Button>
              </div>
              <div className="relative flex items-end justify-center mt-12" style={{ minHeight: 'clamp(220px, 35vw, 320px)' }}>
                <motion.div className="absolute left-1/2 z-[1] w-[clamp(100px,18vw,150px)] origin-bottom" style={{ transform: 'translateX(-85%) rotate(-12deg)' }} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                  <div className="overflow-hidden rounded-[2rem] bg-zinc-900 shadow-xl" style={{ aspectRatio: '9/19' }}>
                    <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-zinc-800">
                      <Image src={useCoverSrc(0)} fill alt={t('landing.imageAlt.app')} className="object-cover" sizes="150px" onError={() => setCoverError(0)} />
                      <div className="absolute inset-0 bg-black/20 pointer-events-none rounded-[2rem]" aria-hidden />
                    </div>
                  </div>
                </motion.div>
                <motion.div className="relative z-[2] w-[clamp(120px,22vw,180px)] shadow-2xl" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                  <div className="overflow-hidden rounded-[2.2rem] bg-zinc-900" style={{ aspectRatio: '9/19' }}>
                    <div className="relative h-full w-full overflow-hidden rounded-[2.2rem] bg-zinc-800">
                      <Image src={useCoverSrc(1)} fill alt={t('landing.imageAlt.dashboard')} className="object-cover" sizes="180px" onError={() => setCoverError(1)} />
                      <div className="absolute inset-0 bg-black/20 pointer-events-none rounded-[2.2rem]" aria-hidden />
                    </div>
                  </div>
                </motion.div>
                <motion.div className="absolute left-1/2 z-[1] w-[clamp(100px,18vw,150px)] origin-bottom" style={{ transform: 'translateX(-15%) rotate(12deg)' }} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                  <div className="overflow-hidden rounded-[2rem] bg-zinc-900 shadow-xl" style={{ aspectRatio: '9/19' }}>
                    <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-zinc-800">
                      <Image src={useCoverSrc(2)} fill alt={t('landing.imageAlt.analytics')} className="object-cover" sizes="150px" onError={() => setCoverError(2)} />
                      <div className="absolute inset-0 bg-black/20 pointer-events-none rounded-[2rem]" aria-hidden />
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </MotionSection>

          <LandingFaqSection />

          <LandingSiteFooter />
        </main>

        <ScrollToTop />
        </div>
      </div>
    </PageTransition>
  );
}

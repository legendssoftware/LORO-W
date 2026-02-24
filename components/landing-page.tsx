'use client';

import Link from 'next/link';
import Image from 'next/image';
// Icons from local lib (no lucide-react dependency in this component)
import {
  ArrowRightIcon,
  CpuIcon,
  InstagramIcon,
  LinkedInIcon,
  MenuIcon,
  PhoneCallIcon,
  TwitterIcon,
  WifiIcon,
  XIcon,
  YoutubeIcon,
} from '@/lib/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import Vapi from '@vapi-ai/web';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageTransition } from '@/components/animations/page-transition';
import { MotionSection } from '@/components/animations/motion-section';
import { StaggerContainer } from '@/components/animations/stagger-container';
import { StaggerItem } from '@/components/animations/stagger-item';
import { FadeIn } from '@/components/animations/fade-in';
import { ScrollToTop } from '@/components/animations/scroll-to-top';
import { SmoothScroll } from '@/components/smooth-scroll';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toast-helpers';
import { handleVapiError, retryVapiOperation } from '@/lib/utils/vapi-error-handler';
import { getDefaultCoverSlots, getShuffledCoverPaths, COVER_FALLBACK_URLS, HERO_CENTER_IMAGE } from '@/lib/cover-images';

const CALL_MAX_DURATION_MS =
  (parseInt(process.env.NEXT_PUBLIC_MAX_CALL_DURATION_MINUTES ?? '5', 10) * 60 * 1000);
const WARNING_TIME_REMAINING_MS =
  (parseInt(process.env.NEXT_PUBLIC_CALL_WARNING_SECONDS ?? '60', 10) * 1000);

export function LandingPage() {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallInitializing, setIsCallInitializing] = useState(false);
  const [demoVapi, setDemoVapi] = useState<Vapi | null>(null);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
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
  const initAttemptedRef = useRef(false);
  const callStartTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef(false);

  useEffect(() => {
    const handleClickOutside = () => setIsMobileMenuOpen(false);
    if (isMobileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else document.body.style.overflow = 'unset';
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const formattedTimeRemaining = useMemo(() => {
    if (timeRemaining === null) return null;
    const totalSeconds = Math.ceil(timeRemaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [timeRemaining]);

  const stopCallTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    callStartTimeRef.current = null;
    setTimeRemaining(null);
    warningShownRef.current = false;
  }, []);

  const endDemoCall = useCallback(() => {
    if (!demoVapi) return;
    if (!isCallActive) {
      setIsCallInitializing(false);
      return;
    }
    try {
      demoVapi.stop();
      stopCallTimer();
    } catch (error) {
      handleVapiError(error, toast, { silent: true });
      setIsCallActive(false);
      setIsCallInitializing(false);
      stopCallTimer();
    }
  }, [demoVapi, isCallActive, stopCallTimer]);

  const startCallTimer = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    warningShownRef.current = false;
    callStartTimeRef.current = Date.now();
    setTimeRemaining(CALL_MAX_DURATION_MS);
    timerIntervalRef.current = setInterval(() => {
      if (!callStartTimeRef.current) return;
      const elapsed = Date.now() - callStartTimeRef.current;
      const remaining = Math.max(0, CALL_MAX_DURATION_MS - elapsed);
      setTimeRemaining(remaining);
      if (remaining <= WARNING_TIME_REMAINING_MS && !warningShownRef.current) {
        warningShownRef.current = true;
        toast('1 minute remaining in your call', { duration: 4000, position: 'bottom-center', icon: '⏱️' });
      }
      if (remaining <= 0) {
        toast('Call time limit reached (5 minutes)', { duration: 4000, position: 'bottom-center', icon: '⏰' });
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
        endDemoCall();
      }
    }, 1000);
  }, [endDemoCall]);

  useEffect(() => {
    if (initAttemptedRef.current) return;
    initAttemptedRef.current = true;
    const init = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_VAPI_KEY;
        if (!apiKey) throw new Error('Vapi API key not defined');
        const vapi = new Vapi(apiKey);
        vapi.on('call-start', () => {
          setIsCallActive(true);
          setIsCallInitializing(false);
          setConnectionError(null);
          startCallTimer();
          showSuccessToast('Connected to Loro AI Assistant', toast);
        });
        vapi.on('call-end', () => {
          setIsCallActive(false);
          setConnectionError(null);
          stopCallTimer();
          showSuccessToast('Call ended. Thank you!', toast);
        });
        vapi.on('error', (error) => {
          setIsCallInitializing(false);
          setIsCallActive(false);
          stopCallTimer();
          setConnectionError(error instanceof Error ? error : new Error(String(error)));
          handleVapiError(error, toast);
        });
        setDemoVapi(vapi);
      } catch (error) {
        setConnectionError(error instanceof Error ? error : new Error(String(error)));
        handleVapiError(error, toast);
      }
    };
    init();
    return () => {
      stopCallTimer();
      if (demoVapi) try { demoVapi.stop(); } catch (e) { console.error(e); }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startDemoCall = async () => {
    if (!demoVapi) {
      showErrorToast('Call feature not available', toast);
      return;
    }
    if (isCallActive) {
      toast('Call is already ongoing', { duration: 2000, position: 'bottom-center', icon: 'ℹ️' });
      return;
    }
    setIsCallInitializing(true);
    setConnectionError(null);
    showSuccessToast('Initiating call. Connecting...', toast);
    try {
      const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
      if (!assistantId) throw new Error('Assistant ID not found');
      await retryVapiOperation(() => demoVapi.start(assistantId), 2, toast, {
        onRetry: () => setIsCallInitializing(true),
      });
    } catch {
      setIsCallInitializing(false);
    }
  };

  const retryDemoCall = () => {
    if (isCallActive || isCallInitializing) return;
    setConnectionError(null);
    startDemoCall();
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-950 to-black text-zinc-100">
        <div className="flex flex-col">
          <SmoothScroll />
          <FadeIn duration={0.8}>
            <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-900/80 backdrop-blur-md">
              <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href="#" className="flex items-center gap-2">
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="font-body text-xl font-normal tracking-tight text-white"
                  >
                    LORO
                  </motion.span>
                </Link>

                <nav className="hidden items-center gap-8 md:flex">
                  <Link href="#features" className="font-body text-sm font-normal text-zinc-300 hover:text-white transition-colors">Product</Link>
                  <Link href="#solutions" className="font-body text-sm font-normal text-zinc-300 hover:text-white transition-colors">Solutions</Link>
                  <Link href="#" className="font-body text-sm font-normal text-zinc-300 hover:text-white transition-colors">Careers</Link>
                  <Link href="#" className="font-body text-sm font-normal text-zinc-300 hover:text-white transition-colors">Research</Link>
                </nav>

                <div className="hidden items-center gap-4 md:flex">
                  <Link href="/sign-in" className="font-body text-sm font-normal text-zinc-300 hover:text-white transition-colors">My Account</Link>
                  {isCallActive ? (
                    <Button variant="outline" size="sm" onClick={endDemoCall} className="font-body text-xs font-normal text-red-400 border-0 bg-transparent hover:bg-red-500/20 hover:text-red-300">
                      END CALL {formattedTimeRemaining && `(${formattedTimeRemaining})`}
                    </Button>
                  ) : connectionError ? (
                    <Button variant="outline" size="sm" onClick={retryDemoCall} className="font-body text-xs font-normal text-amber-400 border-0 bg-transparent hover:bg-amber-500/20">RETRY CALL</Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={startDemoCall} disabled={isCallInitializing} className="font-body text-xs font-normal text-white border-0 bg-purple-600 hover:bg-purple-700 transition-colors">
                      {isCallInitializing ? 'CONNECTING...' : 'DEMO CALL'}
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2 md:hidden">
                  <motion.button onClick={(e) => { e.stopPropagation(); setIsMobileMenuOpen(!isMobileMenuOpen); }} className="rounded-lg p-2 hover:bg-white/10 text-zinc-300" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} aria-label="Open menu">
                    <MenuIcon size={24} className="size-6" />
                  </motion.button>
                </div>
              </div>

              <AnimatePresence>
                {isMobileMenuOpen && (
                  <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
                    <motion.div initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="fixed inset-0 z-[80] flex h-screen w-full flex-col bg-zinc-950/95 shadow-xl backdrop-blur-md border-l border-white/10" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-between items-center border-b border-white/10 bg-zinc-900/80 p-4">
                        <span className="font-body text-lg tracking-tight text-white">LORO</span>
                        <motion.button onClick={() => setIsMobileMenuOpen(false)} className="rounded-full p-2 border border-white/20 bg-white/5 text-zinc-300 hover:bg-white/10" aria-label="Close menu"><XIcon size={24} className="size-6" /></motion.button>
                      </div>
                      <div className="flex flex-1 flex-col items-center space-y-2 bg-zinc-950/90 p-4">
                        <Link href="#features" onClick={() => setIsMobileMenuOpen(false)} className="font-body w-full rounded-lg p-3 text-center text-sm text-zinc-300 hover:bg-white/10 hover:text-white">Product</Link>
                        <Link href="#solutions" onClick={() => setIsMobileMenuOpen(false)} className="font-body w-full rounded-lg p-3 text-center text-sm text-zinc-300 hover:bg-white/10 hover:text-white">Solutions</Link>
                        <Link href="#" onClick={() => setIsMobileMenuOpen(false)} className="font-body w-full rounded-lg p-3 text-center text-sm text-zinc-300 hover:bg-white/10 hover:text-white">Careers</Link>
                        <Link href="#" onClick={() => setIsMobileMenuOpen(false)} className="font-body w-full rounded-lg p-3 text-center text-sm text-zinc-300 hover:bg-white/10 hover:text-white">Research</Link>
                        <div className="flex w-full flex-col items-center border-t border-white/10 pt-4 space-y-2">
                          <Link href="/sign-in" onClick={() => setIsMobileMenuOpen(false)} className="font-body block w-full rounded-lg p-3 text-center text-sm text-zinc-400 hover:bg-white/10 hover:text-white">My Account</Link>
                          {isCallActive ? (
                            <Button variant="outline" onClick={endDemoCall} className="font-body w-full text-xs text-red-400 border-0 hover:bg-red-500/20">END CALL {formattedTimeRemaining && `(${formattedTimeRemaining})`}</Button>
                          ) : connectionError ? (
                            <Button variant="outline" onClick={retryDemoCall} className="font-body w-full text-xs text-amber-400 border-0 hover:bg-amber-500/20"><PhoneCallIcon size={16} className="mr-2 inline" />RETRY CALL</Button>
                          ) : (
                            <Button onClick={startDemoCall} disabled={isCallInitializing} className="font-body w-full text-xs text-white border-0 bg-purple-600 hover:bg-purple-700 transition-colors"><PhoneCallIcon size={16} className="mr-2 inline" />{isCallInitializing ? 'CONNECTING...' : 'DEMO CALL'}</Button>
                          )}
                          <Button asChild className="font-body w-full text-xs bg-white text-zinc-900 hover:bg-zinc-200 border-0 hover:bg-purple-600 hover:text-white">
                            <Link href="/onboarding" onClick={() => setIsMobileMenuOpen(false)}>Get Started</Link>
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </header>
          </FadeIn>

        <main className="flex-1">
          {/* Hero — headline, email CTA, social proof, overlapping phones */}
          <MotionSection className="relative min-h-screen flex flex-col justify-center py-12 md:py-20 lg:py-28 md:min-h-0" duration={0.8}>
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.12),transparent)]" aria-hidden />
            <div className="container relative mx-auto px-4 md:px-6 flex-1 flex flex-col justify-center">
              <div className="flex w-full flex-col items-center justify-center gap-8 text-center">
                <StaggerContainer className="flex flex-col items-center gap-4 lg:gap-6" delay={0.2} staggerChildren={0.12}>
                  <StaggerItem>
                    <h1 className="font-body text-3xl font-normal tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
                      Operations that scale.{' '}
                      <span className="font-serif italic">Business, simplified.</span>
                    </h1>
                  </StaggerItem>
                  <StaggerItem>
                    <p className="font-body mx-auto max-w-[560px] text-sm text-zinc-400 md:text-base">
                      Stop juggling multiple systems. Loro combines field service, quotes, tasks, and real-time analytics in one platform.
                    </p>
                  </StaggerItem>
                  <StaggerItem className="flex flex-col items-center gap-3 w-full max-w-md">
                    <div className="flex w-full gap-0 rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm">
                      <Input
                        type="email"
                        placeholder="enter your email"
                        className="flex-1 rounded-none border-0 bg-transparent text-white placeholder:italic placeholder:text-white focus-visible:ring-0 focus-visible:border-0"
                      />
                      <Button className="font-body rounded-none shrink-0 bg-transparent text-white hover:bg-purple-600 hover:text-white border-0">
                        Get Started
                      </Button>
                    </div>
                    <p className="font-body text-xs text-zinc-400">
                      Join LORO Community with 90+ members
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
                <div className="flex justify-center mt-3">
                  <Button
                    asChild
                    className="font-body rounded-lg bg-purple-600 text-white hover:bg-purple-700 border-0"
                    size="lg"
                  >
                    <Link
                      href="https://drive.google.com/uc?export=download&id=1ec6BfP1co9T6L0b6iiyiaWH4yzLc0a1y"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Try Our Android App
                    </Link>
                  </Button>
                </div>
                <div className="relative mt-4 flex items-end justify-center" style={{ minHeight: 'clamp(338px, 52vw, 494px)' }}>
                  <div className="absolute left-1/2 top-1/2 z-[3] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2 text-xs text-zinc-300">
                    Live sync
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
                        <Image src={useCoverSrc(0)} fill alt="Loro app" className="object-cover" sizes="156px, 208px" onError={() => setCoverError(0)} />
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
                        <Image src={coverFallback[1] ? COVER_FALLBACK_URLS[1] : HERO_CENTER_IMAGE} fill alt="Loro dashboard" className="object-cover" sizes="182px, 260px" priority onError={() => setCoverError(1)} />
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
                        <Image src={useCoverSrc(2)} fill alt="Loro analytics" className="object-cover" sizes="156px, 208px" onError={() => setCoverError(2)} />
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
                Built for scale. <span className="font-serif italic">Trusted by real teams.</span>
              </h2>
              <div className="grid grid-cols-2 gap-6 gap-y-10 sm:gap-8 md:grid-cols-4 md:gap-12">
                {[
                  { label: 'Businesses', value: '2K+', sub: 'on the platform' },
                  { label: 'Partners', value: '120+', sub: 'collaborating' },
                  { label: 'Field users', value: '800+', sub: 'active daily' },
                  { label: 'Spaces', value: '2K+', sub: 'enhanced' },
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <p className="font-body text-xs text-zinc-400 uppercase tracking-wide">{stat.label}</p>
                    <p className="font-body mt-1 text-3xl font-normal text-white md:text-4xl">{stat.value}</p>
                    <p className="font-body mt-1 text-xs text-zinc-400">{stat.sub}</p>
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
                  Technology That Works in Harmony
                </h2>
                <p className="font-body mx-auto max-w-2xl text-sm text-zinc-400">
                  Built to simplify daily operations through intelligent connected systems.
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
                  alt="Modern office"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 1200px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute left-[8%] bottom-[20%] rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-4 w-[200px]">
                  <p className="font-body text-xs text-zinc-400">Live Sales | Dashboard</p>
                  <p className="font-body text-2xl font-semibold text-white mt-1">R 125,450</p>
                  <div className="mt-2 h-2 w-12 rounded-full bg-white/20" />
                </div>
                <div className="absolute right-[12%] bottom-[25%] rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-4 w-[200px]">
                  <p className="font-body text-xs text-zinc-400">Quotes & Orders</p>
                  <p className="font-body text-2xl font-semibold text-white mt-1">23 active</p>
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
                  Powerful Features, <span className="font-serif italic">Thoughtfully Designed</span>
                </h2>
                <p className="font-body mx-auto max-w-2xl text-sm text-zinc-400">
                  Everything you need for comfort, clarity, and efficiency—in one place.
                </p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { emoji: '📊', title: 'Smart Lead Management', desc: 'Capture, qualify, and convert leads with AI-powered scoring. Prioritise the best opportunities and never let a hot lead go cold. Your pipeline stays full and your team stays focused.', visual: 'phone' },
                  { emoji: '📋', title: 'Pipeline by Stage', desc: 'A visual pipeline with drag-and-drop and full deal tracking. Move opportunities through stages at a glance and see exactly where every deal stands. Perfect for team alignment and forecasting.', visual: 'text' },
                  { emoji: '✅', title: 'Task & Project Management', desc: 'Smart assignment, clear priorities, and real-time progress across the team. Assign work, set due dates, and track completion so nothing slips through the cracks.', visual: 'thumb' },
                  { emoji: '📈', title: 'Live Analytics', desc: 'Real-time dashboards and ERP-backed metrics in one place. Understand performance, spot trends, and make decisions with up-to-date data—no spreadsheets required.', visual: 'text' },
                  { emoji: '🔗', title: 'ERP Integration', desc: 'Live sales and quotes with full visibility at a glance. Your existing ERP stays the source of truth while LORO keeps the field and office in sync.', visual: 'text' },
                  { emoji: '⚙️', title: 'Workflow Automation', desc: 'Schedule tasks and automate follow-ups across devices. Set rules once and let the system handle reminders, status updates, and routine steps so your team can focus on closing.', visual: 'toggles' },
                ].map((card, i) => (
                  <motion.div
                    key={i}
                    className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6 min-h-[220px] flex flex-col"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                    viewport={{ once: true }}
                  >
                    <h3 className="font-body text-lg font-normal text-zinc-100 flex items-center gap-2">
                      <span aria-hidden>{card.emoji}</span>
                      {card.title}
                    </h3>
                    <p className="font-body mt-2 text-sm text-zinc-400 flex-1">{card.desc}</p>
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
                  Every Detail, <span className="font-serif italic">Precisely Controlled</span>
                </h2>
                <p className="font-body mx-auto max-w-2xl text-sm text-zinc-400">
                  One platform for routing, ERP, scheduling, and a minimal interface.
                </p>
              </div>
              <div className="relative flex items-center justify-center min-h-[360px] sm:min-h-[420px] md:min-h-[480px]">
                <div className="absolute inset-0 grid grid-cols-4 gap-px opacity-20 max-w-4xl mx-auto" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                {[
                  { label: 'Smart Routing', angle: 0, pos: 'top' },
                  { label: 'Live ERP', angle: 60, pos: 'top-right' },
                  { label: 'Unified Control', angle: 120, pos: 'right' },
                  { label: 'Smart Scheduling', angle: 180, pos: 'bottom' },
                  { label: 'Minimal Interface', angle: 240, pos: 'bottom-left' },
                  { label: 'Automation', angle: 300, pos: 'left' },
                ].map((item, i) => {
                  const r = 130;
                  const rad = (item.angle * Math.PI) / 180;
                  const x = Math.cos(rad) * r;
                  const y = Math.sin(rad) * r;
                  return (
                    <motion.div
                      key={i}
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
                      <span className="font-body text-xs text-zinc-300 whitespace-nowrap">{item.label}</span>
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
                      <Image src={useCoverSrc(1)} fill alt="Loro control" className="object-cover" sizes="200px" onError={() => setCoverError(1)} />
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
                  A Smarter, Fairer, and More Transparent Way to Run Field Operations
                </h2>
                <p className="font-body mx-auto max-w-2xl text-sm text-zinc-400">
                  Live sync, instant clarity, and full control—not just data.
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto text-center md:text-left">
                <div className="flex flex-col items-center space-y-8 md:items-start">
                  {[
                    { title: 'Live ERP Sync, Fast by Design', body: 'Bulk data flows and real-time updates from your existing systems.' },
                    { title: 'Instant Status Clarity', body: 'See who is where and what is due—at a glance.' },
                    { title: 'Operational Control, Not Just Data', body: 'Act on quotes, orders, and schedules directly from the platform.' },
                  ].map((block, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }} className="max-w-md md:max-w-none">
                      <h3 className="font-body text-lg font-normal text-white">{block.title}</h3>
                      <p className="font-body mt-2 text-sm text-zinc-400">{block.body}</p>
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
                    {[
                      { label: 'Claims', angle: 0 },
                      { label: 'Leads', angle: 90 },
                      { label: 'Visits', angle: 180 },
                      { label: 'GPR Tracking', angle: 270 },
                    ].map((item, i) => {
                      const r = 42;
                      const rad = (item.angle * Math.PI) / 180;
                      const x = 50 + Math.cos(rad) * r;
                      const y = 50 + Math.sin(rad) * r;
                      return (
                        <span
                          key={i}
                          className="absolute font-body text-xs text-zinc-400 -translate-x-1/2 -translate-y-1/2"
                          style={{ left: `${x}%`, top: `${y}%` }}
                        >
                          {item.label}
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
                  See Your Data. <span className="font-serif italic">Control Your Operations.</span>
                </h2>
                <p className="font-body mx-auto max-w-xl text-sm text-zinc-400 mb-8">
                  One app for the field and the office. Get started in minutes.
                </p>
                <Button asChild className="font-body rounded-lg border-0 bg-transparent text-white hover:bg-purple-600 hover:text-white gap-2" size="lg">
                  <Link href="https://drive.google.com/uc?export=download&id=1ec6BfP1co9T6L0b6iiyiaWH4yzLc0a1y" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                    Download App
                    <ArrowRightIcon size={18} />
                  </Link>
                </Button>
              </div>
              <div className="relative flex items-end justify-center mt-12" style={{ minHeight: 'clamp(220px, 35vw, 320px)' }}>
                <motion.div className="absolute left-1/2 z-[1] w-[clamp(100px,18vw,150px)] origin-bottom" style={{ transform: 'translateX(-85%) rotate(-12deg)' }} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                  <div className="overflow-hidden rounded-[2rem] bg-zinc-900 shadow-xl" style={{ aspectRatio: '9/19' }}>
                    <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-zinc-800">
                      <Image src={useCoverSrc(0)} fill alt="Loro app" className="object-cover" sizes="150px" onError={() => setCoverError(0)} />
                      <div className="absolute inset-0 bg-black/20 pointer-events-none rounded-[2rem]" aria-hidden />
                    </div>
                  </div>
                </motion.div>
                <motion.div className="relative z-[2] w-[clamp(120px,22vw,180px)] shadow-2xl" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                  <div className="overflow-hidden rounded-[2.2rem] bg-zinc-900" style={{ aspectRatio: '9/19' }}>
                    <div className="relative h-full w-full overflow-hidden rounded-[2.2rem] bg-zinc-800">
                      <Image src={useCoverSrc(1)} fill alt="Loro" className="object-cover" sizes="180px" onError={() => setCoverError(1)} />
                      <div className="absolute inset-0 bg-black/20 pointer-events-none rounded-[2.2rem]" aria-hidden />
                    </div>
                  </div>
                </motion.div>
                <motion.div className="absolute left-1/2 z-[1] w-[clamp(100px,18vw,150px)] origin-bottom" style={{ transform: 'translateX(-15%) rotate(12deg)' }} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                  <div className="overflow-hidden rounded-[2rem] bg-zinc-900 shadow-xl" style={{ aspectRatio: '9/19' }}>
                    <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-zinc-800">
                      <Image src={useCoverSrc(2)} fill alt="Loro analytics" className="object-cover" sizes="150px" onError={() => setCoverError(2)} />
                      <div className="absolute inset-0 bg-black/20 pointer-events-none rounded-[2rem]" aria-hidden />
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </MotionSection>

          {/* Footer — AERIUM-style: logo, tagline, Company / Solutions / Products, social */}
          <footer className="border-t border-white/10 bg-black py-12 md:py-16">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex flex-col items-center gap-10 text-center md:flex-row md:justify-between md:items-start md:text-left">
                <div className="flex flex-col items-center space-y-4 max-w-xs mx-auto md:items-start md:mx-0">
                  <div className="flex items-center gap-2">
                    <span className="font-body text-xl font-normal tracking-tight text-white">LORO</span>
                  </div>
                  <p className="font-body max-w-xs text-sm text-zinc-400">
                    Smarter operations through thoughtfully designed technology.
                  </p>
                  <p className="font-body text-xs text-zinc-400">© 2026 LORO. All rights reserved.</p>
                  <div className="flex gap-4 justify-center md:justify-start">
                    <Link href="#" className="text-zinc-400 hover:text-white transition-colors" aria-label="Instagram"><InstagramIcon size={20} /></Link>
                    <Link href="#" className="text-zinc-400 hover:text-white transition-colors" aria-label="X"><TwitterIcon size={20} /></Link>
                    <Link href="#" className="text-zinc-400 hover:text-white transition-colors" aria-label="YouTube"><YoutubeIcon size={20} /></Link>
                    <Link href="#" className="text-zinc-400 hover:text-white transition-colors" aria-label="LinkedIn"><LinkedInIcon size={20} /></Link>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 w-full sm:w-auto justify-items-center md:justify-items-start">
                  <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <h3 className="font-body mb-4 text-sm font-medium text-zinc-300">Company</h3>
                    <ul className="space-y-3">
                      {['About Loro', 'Newsroom', 'Careers', 'Press', 'Contact Us'].map((item) => (
                        <li key={item}><Link href="#" className="font-body text-sm text-zinc-400 hover:text-white transition-colors">{item}</Link></li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <h3 className="font-body mb-4 text-sm font-medium text-zinc-300">Solutions</h3>
                    <ul className="space-y-3">
                      {['Field Service', 'ERP Sync', 'Analytics', 'Integrations'].map((item) => (
                        <li key={item}><Link href="#" className="font-body text-sm text-zinc-400 hover:text-white transition-colors">{item}</Link></li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <h3 className="font-body mb-4 text-sm font-medium text-zinc-300">Products</h3>
                    <ul className="space-y-3">
                      {['Dashboard', 'Mobile App', 'Quotes'].map((item) => (
                        <li key={item}><Link href="#" className="font-body text-sm text-zinc-400 hover:text-white transition-colors">{item}</Link></li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </main>

        <ScrollToTop />
        </div>
      </div>
    </PageTransition>
  );
}

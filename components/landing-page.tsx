'use client';

import Link from 'next/link';
import Image from 'next/image';
// Icons from local lib (no lucide-react dependency in this component)
import { CheckIcon, MenuIcon, PhoneCallIcon, XIcon } from '@/lib/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import Vapi from '@vapi-ai/web';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { PageTransition } from '@/components/animations/page-transition';
import { MotionSection } from '@/components/animations/motion-section';
import { StaggerContainer } from '@/components/animations/stagger-container';
import { StaggerItem } from '@/components/animations/stagger-item';
import { FadeIn } from '@/components/animations/fade-in';
import { ScrollToTop } from '@/components/animations/scroll-to-top';
import { SmoothScroll } from '@/components/smooth-scroll';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toast-helpers';
import { handleVapiError, retryVapiOperation } from '@/lib/utils/vapi-error-handler';
import { getDefaultCoverSlots, getShuffledCoverPaths, COVER_FALLBACK_URLS } from '@/lib/cover-images';

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
      <div className="flex min-h-screen flex-col bg-neutral-950 text-white">
        <SmoothScroll />
        <FadeIn duration={0.8}>
          <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-sm">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="font-body text-xl font-normal uppercase tracking-tight text-white"
              >
                <span className="md:hidden">LORO</span>
                <span className="hidden md:inline">LORO</span>
              </motion.span>

              <nav className="hidden items-center gap-6 md:flex">
                <Link href="#features" className="font-body text-xs font-normal uppercase text-white/80 hover:text-white">About</Link>
                <Link href="#benefits" className="font-body text-xs font-normal uppercase text-white/80 hover:text-white">Products</Link>
                <Link href="#testimonials" className="font-body text-xs font-normal uppercase text-white/80 hover:text-white">Pricing</Link>
                <Link href="#faq" className="font-body text-xs font-normal uppercase text-white/80 hover:text-white">Contact</Link>
                {isCallActive ? (
                  <Button variant="ghost" size="sm" onClick={endDemoCall} className="font-body text-xs font-normal uppercase text-red-400 hover:bg-white/10 hover:text-red-300">
                    END CALL {formattedTimeRemaining && `(${formattedTimeRemaining})`}
                  </Button>
                ) : connectionError ? (
                  <Button variant="ghost" size="sm" onClick={retryDemoCall} className="font-body text-xs font-normal uppercase text-amber-400 hover:bg-white/10 hover:text-amber-300">RETRY CALL</Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={startDemoCall} disabled={isCallInitializing} className="font-body text-xs font-normal uppercase text-white/90 hover:bg-white/10 hover:text-white">
                    {isCallInitializing ? 'CONNECTING...' : 'DEMO CALL'}
                  </Button>
                )}
              </nav>

              <div className="hidden items-center gap-4 md:flex">
                <Link href="/sign-in" className="font-body text-xs font-normal uppercase text-white/80 hover:text-white">Sign In</Link>
                <Button asChild className="font-body text-xs font-normal uppercase bg-white text-neutral-900 hover:bg-white/90">
                  <Link href="/onboarding">Get Started</Link>
                </Button>
              </div>

              <div className="flex items-center gap-2 md:hidden">
                <motion.button onClick={(e) => { e.stopPropagation(); setIsMobileMenuOpen(!isMobileMenuOpen); }} className="rounded-lg p-2 hover:bg-white/10 text-white" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <MenuIcon size={24} className="size-6" />
                </motion.button>
              </div>
            </div>

            <AnimatePresence>
              {isMobileMenuOpen && (
                <>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
                  <motion.div initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="fixed inset-y-0 right-0 z-[80] flex h-screen w-80 flex-1 flex-col border-l border-white/10 bg-neutral-900/98 shadow-xl backdrop-blur-md" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center border-b border-white/10 p-4">
                      <span className="font-body text-lg uppercase text-white">LORO</span>
                      <motion.button onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg p-2 hover:bg-white/10 text-white"><XIcon size={24} className="size-6" /></motion.button>
                    </div>
                    <div className="flex flex-1 flex-col space-y-4 p-4">
                      <Link href="#features" onClick={() => setIsMobileMenuOpen(false)} className="font-body rounded-lg p-3 text-sm uppercase text-white/90 hover:bg-white/10 hover:text-white">About</Link>
                      <Link href="#benefits" onClick={() => setIsMobileMenuOpen(false)} className="font-body rounded-lg p-3 text-sm uppercase text-white/90 hover:bg-white/10 hover:text-white">Products</Link>
                      <Link href="#testimonials" onClick={() => setIsMobileMenuOpen(false)} className="font-body rounded-lg p-3 text-sm uppercase text-white/90 hover:bg-white/10 hover:text-white">Pricing</Link>
                      <Link href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="font-body rounded-lg p-3 text-sm uppercase text-white/90 hover:bg-white/10 hover:text-white">Contact</Link>
                      <div className="border-t border-white/10 pt-4 space-y-2">
                        <Link href="/sign-in" onClick={() => setIsMobileMenuOpen(false)} className="block font-body rounded-lg p-3 text-sm uppercase text-white/90 hover:bg-white/10 hover:text-white">Sign In</Link>
                      </div>
                      <div className="border-t border-white/10 pt-4">
                        {isCallActive ? (
                          <Button variant="outline" onClick={endDemoCall} className="font-body w-full text-xs uppercase text-red-400 border-white/20 hover:bg-white/10">END CALL {formattedTimeRemaining && `(${formattedTimeRemaining})`}</Button>
                        ) : connectionError ? (
                          <Button variant="outline" onClick={retryDemoCall} className="font-body w-full text-xs uppercase text-amber-400 border-white/20 hover:bg-white/10"><PhoneCallIcon size={16} className="mr-2 inline" />RETRY CALL</Button>
                        ) : (
                          <Button onClick={startDemoCall} disabled={isCallInitializing} className="font-body w-full text-xs uppercase bg-white text-neutral-900 hover:bg-white/90"><PhoneCallIcon size={16} className="mr-2 inline" />{isCallInitializing ? 'CONNECTING...' : 'DEMO CALL'}</Button>
                        )}
                      </div>
                      <div className="border-t border-white/10 pt-4">
                        <Button asChild className="font-body w-full text-xs uppercase bg-white text-neutral-900 hover:bg-white/90">
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
          {/* Hero — dark radial gradient, two-line headline, phones + floating frosted cards */}
          <MotionSection className="relative overflow-hidden py-12 md:py-20 lg:py-28" duration={0.8}>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_0%,rgba(120,119,198,0.15),transparent)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_100%,rgba(30,30,40,0.8),transparent)]" />
            <div className="container relative mx-auto px-4 md:px-6">
              <div className="flex w-full flex-col items-center justify-center gap-8 text-center">
                <StaggerContainer className="flex w-full flex-col items-center gap-4 lg:gap-5" delay={0.2} staggerChildren={0.12}>
                  <StaggerItem className="flex flex-col items-center">
                    <h1 className="font-body text-3xl font-normal tracking-tight text-white sm:text-4xl md:text-5xl xl:text-6xl">
                      <span className="block">Intelligence Beneath</span>
                      <span className="mt-1 block font-serif italic tracking-wide text-white/95">The Surface</span>
                    </h1>
                    <p className="font-body mx-auto mt-4 max-w-[540px] text-sm text-white/70 md:text-base">
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus, luctus nec ullamcorper mattis, pulvinar dapibus leo.
                    </p>
                  </StaggerItem>
                  <StaggerItem className="flex min-[400px]:flex-row flex-col justify-center items-center gap-3">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button size="lg" className="font-body text-xs font-normal uppercase border border-white/30 bg-transparent text-white hover:bg-white/10" asChild>
                        <Link href="/onboarding">Get Started</Link>
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button size="lg" className="font-body text-xs font-normal uppercase bg-white text-neutral-900 hover:bg-white/90" asChild>
                        <a href="https://drive.google.com/uc?export=download&id=1ec6BfP1co9T6L0b6iiyiaWH4yzLc0a1y" target="_blank" rel="noopener noreferrer">Download App</a>
                      </Button>
                    </motion.div>
                  </StaggerItem>
                  <StaggerItem className="flex items-center justify-center gap-2">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-8 w-8 rounded-full border-2 border-neutral-800 bg-neutral-600" />
                      ))}
                    </div>
                    <span className="font-body text-xs uppercase text-white/60">Trusted by 2k+ users</span>
                  </StaggerItem>
                </StaggerContainer>

                {/* Phone stack + floating frosted glass cards */}
                <div className="relative mt-10 flex items-center justify-center" style={{ minHeight: 'clamp(300px, 50vw, 460px)' }}>
                  {/* Floating frosted cards — Framer Motion reveal */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="absolute left-[5%] top-[15%] z-[3] rounded-xl border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md md:left-[12%]"
                  >
                    <span className="font-body text-xs uppercase text-white/90">Smart Home</span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.65 }}
                    className="absolute right-[8%] top-[25%] z-[3] rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md md:right-[15%]"
                  >
                    <span className="font-body text-2xl font-semibold text-white">22</span>
                    <span className="font-body ml-1 text-xs text-white/70">°C</span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                    className="absolute bottom-[20%] left-[10%] z-[3] rounded-xl border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md md:left-[18%]"
                  >
                    <span className="font-body text-sm text-white/90">10:24</span>
                  </motion.div>

                  {/* Left phone */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="absolute left-1/2 z-[1] w-[clamp(100px,22vw,180px)] origin-bottom"
                    style={{ transform: 'translateX(-78%) rotate(-12deg)' }}
                  >
                    <div className="overflow-hidden rounded-[2rem] border-[10px] border-neutral-800 bg-neutral-800 shadow-xl" style={{ aspectRatio: '9/19' }}>
                      <div className="relative h-full w-full overflow-hidden rounded-[1.25rem] bg-neutral-700">
                        <Image src={useCoverSrc(0)} fill alt="Loro — Productivity on the move" className="object-cover" sizes="(max-width:768px) 120px, 180px" onError={() => setCoverError(0)} />
                      </div>
                    </div>
                  </motion.div>
                  {/* Center phone */}
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                    className="relative z-[2] w-[clamp(120px,28vw,220px)] shadow-2xl"
                  >
                    <div className="overflow-hidden rounded-[2.25rem] border-[10px] border-neutral-800 bg-neutral-800" style={{ aspectRatio: '9/19' }}>
                      <div className="relative h-full w-full overflow-hidden rounded-[1.4rem] bg-neutral-700">
                        <Image src={useCoverSrc(1)} fill alt="Loro — Real-time updates" className="object-cover" sizes="(max-width:768px) 140px, 220px" onError={() => setCoverError(1)} />
                      </div>
                    </div>
                  </motion.div>
                  {/* Right phone */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
                    className="absolute left-1/2 z-[1] w-[clamp(100px,22vw,180px)] origin-bottom"
                    style={{ transform: 'translateX(-22%) rotate(12deg)' }}
                  >
                    <div className="overflow-hidden rounded-[2rem] border-[10px] border-neutral-800 bg-neutral-800 shadow-xl" style={{ aspectRatio: '9/19' }}>
                      <div className="relative h-full w-full overflow-hidden rounded-[1.25rem] bg-neutral-700">
                        <Image src={useCoverSrc(2)} fill alt="Loro — Enterprise-grade security" className="object-cover" sizes="(max-width:768px) 120px, 180px" onError={() => setCoverError(2)} />
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </MotionSection>

          {/* Statistics — Designed for Scale */}
          <MotionSection className="border-t border-white/5 bg-neutral-900/80 py-16 md:py-20" direction="up" id="features">
            <div className="container mx-auto px-4 md:px-6">
              <motion.h2
                className="font-body mb-12 text-center text-2xl font-normal uppercase tracking-tight text-white sm:text-3xl md:text-4xl"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                Designed for Scale. Trusted by Real Spaces.
              </motion.h2>
              <StaggerContainer className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4" staggerChildren={0.15}>
                {[
                  { value: '2K+', label: 'Daily devices users in seamless smart technology' },
                  { value: '120+', label: 'Collaborations Teams Partners' },
                  { value: '800+', label: 'Retain landlords, users across diverse living environments' },
                  { value: '2K+', label: 'Thousands of businesses enhanced with intelligent' },
                ].map((stat, i) => (
                  <StaggerItem key={i} direction="up">
                    <motion.div
                      className="text-center"
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="font-body text-4xl font-semibold text-white md:text-5xl">{stat.value}</div>
                      <p className="font-body mt-2 text-xs uppercase leading-snug text-white/60">{stat.label}</p>
                    </motion.div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </MotionSection>

          {/* Technology showcase — room image + overlay cards */}
          <MotionSection className="relative py-16 md:py-24" direction="up">
            <div className="container mx-auto px-4 md:px-6">
              <motion.h2
                className="font-body mb-10 text-center text-2xl font-normal uppercase tracking-tight text-white sm:text-3xl md:text-4xl"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                Technology That Works in Harmony
              </motion.h2>
              <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl">
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-neutral-800">
                  <Image
                    src="/images/landing-room.png"
                    fill
                    alt="Smart living space"
                    className="object-cover object-center"
                    sizes="(max-width: 1024px) 100vw, 1152px"
                  />
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  viewport={{ once: true }}
                  className="absolute left-[15%] top-[30%] rounded-xl border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-md"
                >
                  <span className="font-body text-sm font-medium text-white">Air Condition</span>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.35 }}
                  viewport={{ once: true }}
                  className="absolute right-[20%] top-[25%] rounded-xl border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-md"
                >
                  <span className="font-body text-sm font-medium text-white">Smart Lamp</span>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  viewport={{ once: true }}
                  className="absolute right-[25%] bottom-[35%] rounded-xl border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-md"
                >
                  <span className="font-body text-sm font-medium text-white">Curtain</span>
                </motion.div>
              </div>
            </div>
          </MotionSection>

          {/* Features grid — central phone + cards */}
          <MotionSection className="border-t border-white/5 bg-neutral-950 py-16 md:py-24" direction="up" id="benefits">
            <div className="container mx-auto px-4 md:px-6">
              <motion.h2
                className="font-body mb-12 text-center text-2xl font-normal uppercase tracking-tight text-white sm:text-3xl md:text-4xl"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                Powerful Features. Thoughtfully Designed.
              </motion.h2>
              <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-8 lg:grid lg:grid-cols-3 lg:gap-6">
                {/* Central phone */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className="order-2 flex justify-center lg:order-1 lg:col-span-1 lg:items-center"
                >
                  <div className="w-[clamp(100px,20vw,160px)]">
                    <div className="overflow-hidden rounded-[1.75rem] border-[8px] border-neutral-700 bg-neutral-800" style={{ aspectRatio: '9/19' }}>
                      <div className="relative h-full w-full overflow-hidden rounded-[1.2rem] bg-neutral-700">
                        <Image src={useCoverSrc(1)} fill alt="Loro app" className="object-cover" sizes="160px" onError={() => setCoverError(1)} />
                      </div>
                    </div>
                  </div>
                </motion.div>
                {/* Feature cards grid */}
                <div className="order-1 grid gap-4 sm:grid-cols-2 lg:order-2 lg:col-span-2 lg:grid-cols-3">
                  {[
                    { title: 'AI Quality Monitoring', icon: '◇' },
                    { title: 'Smart Clean Cycles', desc: 'Automated maintenance', icon: '◆' },
                    { title: 'Home Remote', desc: 'Control from anywhere', icon: '◆', thumb: true },
                    { title: 'Energy Saving, Efficiency', desc: 'Lower costs', icon: '◆' },
                    { title: '22', sub: '°C', desc: 'Dashboard controls', isTemp: true },
                    { title: 'Cross-device control', desc: '37.5 kWh', progress: 65, icon: '◆' },
                    { title: 'Air Quality Monitoring', desc: 'Humidity, CO2', icon: '◆' },
                  ].map((card, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: i * 0.06 }}
                      viewport={{ once: true }}
                      whileHover={{ y: -4 }}
                      className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                    >
                      {card.isTemp ? (
                        <div className="flex items-center gap-2">
                          <span className="font-body text-2xl font-semibold text-white">{card.title}</span>
                          <span className="font-body text-sm text-white/70">{card.sub}</span>
                        </div>
                      ) : card.progress != null ? (
                        <>
                          <h3 className="font-body text-sm font-medium uppercase text-white">{card.title}</h3>
                          <p className="font-body mt-1 text-xs text-white/60">{card.desc}</p>
                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                            <motion.div
                              initial={{ width: 0 }}
                              whileInView={{ width: `${card.progress}%` }}
                              transition={{ duration: 0.8, delay: 0.3 }}
                              viewport={{ once: true }}
                              className="h-full rounded-full bg-white/80"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <h3 className="font-body text-sm font-medium uppercase text-white">{card.title}</h3>
                          {card.desc && <p className="font-body mt-1 text-xs text-white/60">{card.desc}</p>}
                          {card.thumb && (
                            <div className="mt-2 h-16 w-full rounded-lg bg-neutral-700/50" />
                          )}
                        </>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </MotionSection>

          {/* Every Detail. Artfully Crafted. */}
          <MotionSection className="border-t border-white/5 bg-neutral-900/80 py-16 md:py-24" direction="up">
            <div className="container mx-auto px-4 md:px-6">
              <StaggerContainer className="text-center" staggerChildren={0.15}>
                <StaggerItem>
                  <h2 className="font-body text-2xl font-normal uppercase tracking-tight text-white sm:text-3xl md:text-4xl">
                    Every Detail. Artfully Crafted.
                  </h2>
                </StaggerItem>
                <StaggerItem>
                  <p className="font-body mx-auto mt-4 max-w-xl text-sm text-white/60">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  </p>
                </StaggerItem>
              </StaggerContainer>
              <div className="relative mx-auto mt-14 h-[320px] w-[320px] sm:h-[380px] sm:w-[380px]">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className="absolute left-1/2 top-1/2 z-10 w-[100px] -translate-x-1/2 -translate-y-1/2 sm:w-[120px]"
                >
                  <div className="overflow-hidden rounded-[1.5rem] border-[6px] border-neutral-700 bg-neutral-800" style={{ aspectRatio: '9/19' }}>
                    <div className="relative h-full w-full overflow-hidden rounded-[1.1rem] bg-neutral-700">
                      <Image src={useCoverSrc(1)} fill alt="Loro" className="object-cover" sizes="120px" onError={() => setCoverError(1)} />
                    </div>
                  </div>
                </motion.div>
                {[
                  { label: 'Comfortable Control', angle: 0 },
                  { label: 'Adjustable Airflow', angle: 60 },
                  { label: 'Power Optimization', angle: 120 },
                  { label: 'Universal Remote', angle: 180 },
                  { label: 'Scheduled Efficiency', angle: 240 },
                  { label: 'Smart Self-clean', angle: 300 },
                ].map((item, i) => {
                  const rad = (item.angle * Math.PI) / 180;
                  const rPct = 42;
                  const x = 50 + rPct * Math.cos(rad);
                  const y = 50 + rPct * Math.sin(rad);
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: 0.1 * i }}
                      viewport={{ once: true }}
                      className="absolute flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-white/30 bg-neutral-800/90 px-1 backdrop-blur-sm"
                      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                    >
                      <span className="text-center font-body text-[9px] leading-tight uppercase text-white/90 sm:text-[10px]">{item.label}</span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </MotionSection>

          {/* A Cleaner Future — text blocks + radar */}
          <MotionSection className="border-t border-white/5 bg-neutral-950 py-16 md:py-24" direction="up">
            <div className="container mx-auto grid items-center gap-12 px-4 md:px-6 lg:grid-cols-2 lg:gap-16">
              <div>
                <motion.h2
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className="font-body text-2xl font-normal uppercase tracking-tight text-white sm:text-3xl md:text-4xl"
                >
                  A Cleaner Future, and More Secure Energy Future
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  viewport={{ once: true }}
                  className="font-body mt-4 text-sm leading-relaxed text-white/70"
                >
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus, luctus nec ullamcorper mattis, pulvinar dapibus leo.
                </motion.p>
                <div className="mt-8 space-y-6">
                  {[
                    { title: 'Zero-Power Scanning. Free by Design.', desc: 'Efficient scanning without draining resources.' },
                    { title: 'Instant Wi-Fi Sync', desc: 'Seamless sync across all devices.' },
                    { title: 'Open-Ended Control, Data, and More', desc: 'Full control and transparency.' },
                  ].map((block, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.15 * i }}
                      viewport={{ once: true }}
                      className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                    >
                      <h3 className="font-body text-sm font-semibold uppercase text-white">{block.title}</h3>
                      <p className="font-body mt-1 text-xs text-white/60">{block.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7 }}
                viewport={{ once: true }}
                className="relative flex aspect-square max-w-md items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-sm"
              >
                {[1, 2, 3].map((ring) => (
                  <motion.div
                    key={ring}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 * ring }}
                    viewport={{ once: true }}
                    className="absolute rounded-full border border-white/20"
                    style={{ width: `${ring * 28}%`, height: `${ring * 28}%` }}
                  />
                ))}
                <motion.span
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  viewport={{ once: true }}
                  className="font-body text-xl font-semibold uppercase text-white"
                >
                  LORO
                </motion.span>
                {['Secure', 'Private', 'Efficient', 'Sustainable', 'Intelligent'].map((label, i) => {
                  const a = (i / 5) * 2 * Math.PI - Math.PI / 2;
                  const r = 42;
                  return (
                    <motion.span
                      key={label}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.5 + i * 0.05 }}
                      viewport={{ once: true }}
                      className="absolute font-body text-[10px] uppercase text-white/80"
                      style={{ left: `${50 + r * Math.cos(a)}%`, top: `${50 + r * Math.sin(a)}%`, transform: 'translate(-50%, -50%)' }}
                    >
                      {label}
                    </motion.span>
                  );
                })}
              </motion.div>
            </div>
          </MotionSection>

          {/* Keep Your Air Optimal — two phones */}
          <MotionSection className="border-t border-white/5 bg-neutral-900/80 py-16 md:py-24" direction="up">
            <div className="container mx-auto px-4 md:px-6">
              <motion.h2
                className="font-body mb-12 text-center text-2xl font-normal uppercase tracking-tight text-white sm:text-3xl md:text-4xl"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                Keep Your Air Optimal, Wear Comfort
              </motion.h2>
              <div className="flex flex-wrap items-center justify-center gap-12">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className="w-[clamp(120px,22vw,200px)]"
                >
                  <div className="overflow-hidden rounded-[2rem] border-[10px] border-neutral-700 bg-neutral-800" style={{ aspectRatio: '9/19' }}>
                    <div className="relative h-full w-full overflow-hidden rounded-[1.3rem] bg-neutral-700">
                      <Image src={useCoverSrc(0)} fill alt="Loro app" className="object-cover" sizes="200px" onError={() => setCoverError(0)} />
                    </div>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  viewport={{ once: true }}
                  className="w-[clamp(120px,22vw,200px)]"
                >
                  <div className="overflow-hidden rounded-[2rem] border-[10px] border-neutral-700 bg-neutral-800" style={{ aspectRatio: '9/19' }}>
                    <div className="relative h-full w-full overflow-hidden rounded-[1.3rem] bg-neutral-700">
                      <Image src={useCoverSrc(2)} fill alt="Loro app" className="object-cover" sizes="200px" onError={() => setCoverError(2)} />
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </MotionSection>

          {/* Video (kept for existing content) */}
          <MotionSection className="border-t border-white/5 bg-neutral-900/50 py-12 md:py-16" direction="up">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mx-auto max-w-4xl text-center">
                <motion.h2 className="font-body mb-8 text-2xl font-normal tracking-tighter uppercase text-white sm:text-3xl md:text-4xl" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>DISCOVER LORO</motion.h2>
                <motion.div className="relative mx-auto max-w-5xl" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} viewport={{ once: true }}>
                  <div className="relative overflow-hidden rounded-lg border border-white/10 aspect-video bg-neutral-800">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Dialog>
                        <DialogTrigger asChild>
                          <motion.button
                            type="button"
                            aria-label="Play video"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className="group flex h-20 w-20 cursor-pointer items-center justify-center rounded-full bg-white/90 shadow-lg transition-all duration-300 hover:bg-white hover:shadow-xl"
                          >
                            <div className="ml-1 h-0 w-0 border-y-[8px] border-y-transparent border-l-[12px] border-l-red-500" />
                          </motion.button>
                        </DialogTrigger>
                        <DialogContent className="h-full max-h-[90vh] w-full max-w-[90vw] p-0 sm:max-h-[80vh] sm:max-w-[80vw]">
                          <div className="relative h-full w-full">
                            <div className="aspect-video h-full w-full overflow-hidden rounded-lg bg-black">
                              <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&modestbranding=1" title="Discover Loro" className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="absolute inset-x-4 bottom-4 left-4 right-4 text-white">
                      <p className="font-body text-xs uppercase text-white/80">Watch how Loro transforms your business operations</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </MotionSection>

          {/* Testimonials — kept for #testimonials link */}
          <MotionSection id="testimonials" className="border-t border-white/5 bg-neutral-950 py-16 md:py-20" direction="up">
            <div className="container mx-auto px-4 md:px-6">
              <StaggerContainer className="mb-12 text-center" staggerChildren={0.2}>
                <StaggerItem><h2 className="font-body text-2xl font-normal tracking-tighter uppercase text-white sm:text-3xl md:text-4xl">What Our Users Say</h2></StaggerItem>
                <StaggerItem><p className="font-body mt-4 text-sm uppercase text-white/60">Hear from professionals who have transformed their operations with Loro</p></StaggerItem>
              </StaggerContainer>
              <StaggerContainer className="grid gap-8 md:grid-cols-3" staggerChildren={0.15}>
                {[
                  { initials: 'SM', name: 'Sarah M.', role: 'Graphic Designer', quote: 'Loro made it so easy to manage my freelance business! The platform and quoting features have been a game-changer.', stars: 5 },
                  { initials: 'JT', name: 'James T.', role: 'Startup Founder', quote: "I love the ERP integration—we use Loro for all our business operations, and the analytics help us track performance.", stars: 5 },
                  { initials: 'PR', name: 'Priya R.', role: 'Small Business Owner', quote: "Affordable and intuitive. I've received so many compliments on how organized we are—and I can update everything in real time.", stars: 4 },
                ].map((t, i) => (
                  <StaggerItem key={i} direction="up">
                    <motion.div className="h-full rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm" whileHover={{ y: -6 }} transition={{ duration: 0.3 }}>
                      <div className="mb-4 flex items-center gap-4">
                        <div className="font-body flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-xl uppercase text-white">{t.initials}</div>
                        <div><h3 className="font-body font-normal uppercase text-white">{t.name}</h3><p className="font-body text-[10px] uppercase text-white/60">{t.role}</p></div>
                      </div>
                      <p className="font-body text-xs italic text-white/70">&quot;{t.quote}&quot;</p>
                      <div className="mt-4 flex">{[1,2,3,4,5].map((star) => <span key={star} className={star <= t.stars ? 'text-amber-400' : 'text-amber-400/40'}>★</span>)}</div>
                    </motion.div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </MotionSection>

          {/* FAQ */}
          <MotionSection id="faq" className="border-t border-white/5 bg-neutral-900/80 py-16 md:py-20" direction="up">
            <div className="container mx-auto px-4 md:px-6">
              <StaggerContainer className="mb-12 text-center" staggerChildren={0.2}>
                <StaggerItem><h2 className="font-body text-3xl font-normal tracking-tighter uppercase sm:text-4xl md:text-5xl">Frequently Asked Questions</h2></StaggerItem>
                <StaggerItem><p className="font-body mt-4 text-xs uppercase text-muted-foreground md:text-xs">Find answers to common questions about Loro</p></StaggerItem>
              </StaggerContainer>
              <div className="mx-auto max-w-4xl space-y-12">
                <div>
                  <h3 className="font-body mb-6 text-center text-2xl font-normal uppercase">General</h3>
                  <StaggerContainer className="grid gap-4 md:gap-6" staggerChildren={0.1}>
                    {[
                      { icon: '💰', question: 'Can I switch plans later?', answer: 'Yes! Upgrades and downgrades are prorated automatically.' },
                      { icon: '🆓', question: 'Is there a free trial?', answer: 'Yes—Basic plan trials are available for all new users.' },
                      { icon: '❌', question: 'How do I cancel my subscription?', answer: 'You can cancel anytime from your dashboard or by contacting support.' },
                      { icon: '📊', question: 'What happens to my data if I cancel?', answer: 'Your data remains accessible for 30 days after cancellation for export.' },
                    ].map((faq, i) => (
                      <StaggerItem key={i} direction="up">
                        <motion.div className="rounded-lg bg-card p-6 shadow-sm" whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} transition={{ duration: 0.3 }}>
                          <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 mt-1"><span className="text-2xl">{faq.icon}</span></div>
                            <div className="flex-1"><h4 className="font-body mb-2 text-lg font-normal uppercase">{faq.question}</h4><p className="font-body text-xs uppercase text-muted-foreground">{faq.answer}</p></div>
                          </div>
                        </motion.div>
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                </div>
                <div>
                  <h3 className="font-body mb-6 text-center text-2xl font-normal uppercase">Technical</h3>
                  <StaggerContainer className="grid gap-4 md:gap-6" staggerChildren={0.1}>
                    {[
                      { icon: '🔒', question: 'Is my data secure?', answer: 'All data is encrypted both in transit and at rest using bank-grade security.' },
                      { icon: '📱', question: 'Can I use Loro offline?', answer: 'Yes! Our mobile app supports limited offline functionality; data syncs when back online.' },
                      { icon: '🔗', question: 'Do you offer API access?', answer: 'Enterprise plans include full API access for custom integrations.' },
                    ].map((faq, i) => (
                      <StaggerItem key={i} direction="up">
                        <motion.div className="rounded-lg bg-card p-6 shadow-sm" whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} transition={{ duration: 0.3 }}>
                          <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 mt-1"><span className="text-2xl">{faq.icon}</span></div>
                            <div className="flex-1"><h4 className="font-body mb-2 text-lg font-normal uppercase">{faq.question}</h4><p className="font-body text-xs uppercase text-muted-foreground">{faq.answer}</p></div>
                          </div>
                        </motion.div>
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                </div>
              </div>
              <motion.div className="mt-16 text-center" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} viewport={{ once: true }}>
                <p className="font-body mb-4 text-sm uppercase text-muted-foreground">Still have questions?</p>
                <Button asChild className="font-body text-xs font-normal uppercase"><Link href="/sign-up">Contact Support</Link></Button>
              </motion.div>
            </div>
          </MotionSection>

          {/* Membership CTA */}
          <MotionSection className="bg-primary py-16 text-primary-foreground" direction="none">
            <div className="container mx-auto px-4 md:px-6">
              <StaggerContainer className="mb-8 text-center" staggerChildren={0.2}>
                <StaggerItem><h2 className="font-body text-3xl font-normal tracking-tighter uppercase">Join Loro And Connect Your Business</h2></StaggerItem>
                <StaggerItem><p className="font-body mx-auto mt-4 max-w-2xl text-xs uppercase text-white">Level up your operations with one platform. Get access to field service, analytics, and more.</p></StaggerItem>
              </StaggerContainer>
              <motion.div className="mx-auto max-w-md" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} viewport={{ once: true }}>
                <div className="flex">
                  <Input type="email" placeholder="Enter your email address" className="rounded-r-none border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/50" />
                  <Button variant="secondary" className="font-body rounded-l-none text-xs font-normal uppercase">Subscribe</Button>
                </div>
              </motion.div>
            </div>
          </MotionSection>

          {/* Footer */}
          <MotionSection className="border-t bg-muted/30 py-12" direction="none">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mb-8 flex flex-col justify-between md:flex-row">
                <div className="mb-8 md:mb-0">
                  <div className="mb-4 flex items-center gap-2"><span className="font-body text-xl font-normal uppercase">LORO</span></div>
                  <div className="flex space-x-4">
                    {['twitter', 'instagram', 'linkedin'].map((s) => (
                      <Link key={s} href="#" className="text-muted-foreground hover:text-foreground"><span className="sr-only">{s}</span></Link>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                  {(['Account', 'Help', 'Company', 'Legal'] as const).map((cat) => (
                    <div key={cat}>
                      <h3 className="font-body mb-4 text-xs font-normal uppercase">{cat}</h3>
                      <ul className="space-y-2">
                        {cat === 'Account' && ['Dashboard', 'Settings', 'Billing'].map((item) => <li key={item}><Link href="#" className="font-body text-xs text-muted-foreground hover:text-foreground">{item}</Link></li>)}
                        {cat === 'Help' && ['Support', 'FAQ', 'Resources'].map((item) => <li key={item}><Link href="#" className="font-body text-xs text-muted-foreground hover:text-foreground">{item}</Link></li>)}
                        {cat === 'Company' && ['About', 'Careers', 'Contact'].map((item) => <li key={item}><Link href="#" className="font-body text-xs text-muted-foreground hover:text-foreground">{item}</Link></li>)}
                        {cat === 'Legal' && (['Privacy Policy', 'Terms', 'Cookies'] as const).map((name) => <li key={name}><Link href={name === 'Privacy Policy' ? '/privacy' : '#'} className="font-body text-xs text-muted-foreground hover:text-foreground">{name}</Link></li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t pt-8 text-center">
                <p className="font-body text-xs font-normal uppercase text-muted-foreground">© {new Date().getFullYear()} LORO. All rights reserved.</p>
              </div>
            </div>
          </MotionSection>
        </main>

        <ScrollToTop />
      </div>
    </PageTransition>
  );
}

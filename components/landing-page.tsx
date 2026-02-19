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
      <div className="flex min-h-screen flex-col">
        <SmoothScroll />
        <FadeIn duration={0.8}>
          <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="font-body text-xl font-normal uppercase tracking-tight"
              >
                <span className="md:hidden">LORO</span>
                <span className="hidden md:inline">LORO</span>
              </motion.span>

              <nav className="hidden items-center gap-6 md:flex">
                <Link href="#features" className="font-body text-xs font-normal uppercase text-foreground/80 hover:text-primary">Features</Link>
                <Link href="#benefits" className="font-body text-xs font-normal uppercase text-foreground/80 hover:text-primary">Benefits</Link>
                <Link href="#testimonials" className="font-body text-xs font-normal uppercase text-foreground/80 hover:text-primary">Testimonials</Link>
                <Link href="#faq" className="font-body text-xs font-normal uppercase text-foreground/80 hover:text-primary">FAQ</Link>
                {isCallActive ? (
                  <Button variant="ghost" size="sm" onClick={endDemoCall} className="font-body text-xs font-normal uppercase text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20">
                    END CALL {formattedTimeRemaining && `(${formattedTimeRemaining})`}
                  </Button>
                ) : connectionError ? (
                  <Button variant="ghost" size="sm" onClick={retryDemoCall} className="font-body text-xs font-normal uppercase text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/20">RETRY CALL</Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={startDemoCall} disabled={isCallInitializing} className="font-body text-xs font-normal uppercase hover:text-primary">
                    {isCallInitializing ? 'CONNECTING...' : 'DEMO CALL'}
                  </Button>
                )}
              </nav>

              <div className="hidden items-center gap-4 md:flex">
                <Link href="/sign-in" className="font-body text-xs font-normal uppercase text-foreground/80 hover:text-primary">Sign In</Link>
                <Button asChild className="font-body text-xs font-normal uppercase">
                  <Link href="/onboarding"><span className="text-white">Get Started</span></Link>
                </Button>
              </div>

              <div className="flex items-center gap-2 md:hidden">
                <motion.button onClick={(e) => { e.stopPropagation(); setIsMobileMenuOpen(!isMobileMenuOpen); }} className="rounded-lg p-2 hover:bg-muted" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <MenuIcon size={24} className="size-6" />
                </motion.button>
              </div>
            </div>

            <AnimatePresence>
              {isMobileMenuOpen && (
                <>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
                  <motion.div initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="fixed inset-y-0 right-0 z-[80] flex h-screen w-80 flex-1 flex-col border-l bg-background/95 shadow-xl backdrop-blur-md" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center border-b bg-background/80 p-4">
                      <span className="font-body text-lg uppercase">LORO</span>
                      <motion.button onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg p-2 hover:bg-muted"><XIcon size={24} className="size-6" /></motion.button>
                    </div>
                    <div className="flex flex-1 flex-col space-y-4 bg-background/90 p-4">
                      <Link href="#features" onClick={() => setIsMobileMenuOpen(false)} className="font-body rounded-lg p-3 text-sm uppercase hover:bg-muted hover:text-primary">Features</Link>
                      <Link href="#benefits" onClick={() => setIsMobileMenuOpen(false)} className="font-body rounded-lg p-3 text-sm uppercase hover:bg-muted hover:text-primary">Benefits</Link>
                      <Link href="#testimonials" onClick={() => setIsMobileMenuOpen(false)} className="font-body rounded-lg p-3 text-sm uppercase hover:bg-muted hover:text-primary">Testimonials</Link>
                      <Link href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="font-body rounded-lg p-3 text-sm uppercase hover:bg-muted hover:text-primary">FAQ</Link>
                      <div className="border-t pt-4 space-y-2">
                        <Link href="/sign-in" onClick={() => setIsMobileMenuOpen(false)} className="block font-body rounded-lg p-3 text-sm uppercase hover:bg-muted hover:text-primary">Sign In</Link>
                      </div>
                      <div className="border-t pt-4">
                        {isCallActive ? (
                          <Button variant="outline" onClick={endDemoCall} className="font-body w-full text-xs uppercase text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20">END CALL {formattedTimeRemaining && `(${formattedTimeRemaining})`}</Button>
                        ) : connectionError ? (
                          <Button variant="outline" onClick={retryDemoCall} className="font-body w-full text-xs uppercase text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/20"><PhoneCallIcon size={16} className="mr-2 inline" />RETRY CALL</Button>
                        ) : (
                          <Button onClick={startDemoCall} disabled={isCallInitializing} className="font-body w-full text-xs uppercase"><PhoneCallIcon size={16} className="mr-2 inline" />{isCallInitializing ? 'CONNECTING...' : 'DEMO CALL'}</Button>
                        )}
                      </div>
                      <div className="border-t pt-4">
                        <Button asChild className="font-body w-full text-xs uppercase">
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
          {/* Hero — three fanned phone frames with first 3 cover images */}
          <MotionSection className="py-8 md:py-16 lg:py-24" duration={0.8}>
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex w-full flex-col items-center justify-center gap-6 text-center">
                {/* Fanned phone stack: left, center, right */}
                <div className="relative flex items-center justify-center" style={{ minHeight: 'clamp(280px, 45vw, 420px)' }}>
                  {/* Left phone — angled left, behind */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="absolute left-1/2 z-[1] w-[clamp(100px,22vw,180px)] origin-bottom"
                    style={{ transform: 'translateX(-78%) rotate(-12deg)' }}
                  >
                    <div className="overflow-hidden rounded-[2rem] border-[10px] border-neutral-900 bg-neutral-900 shadow-xl dark:border-neutral-800 dark:bg-neutral-800" style={{ aspectRatio: '9/19' }}>
                      <div className="relative h-full w-full overflow-hidden rounded-[1.25rem] bg-muted">
                        <Image src={useCoverSrc(0)} fill alt="Loro — Productivity on the move" className="object-cover" sizes="(max-width:768px) 120px, 180px" onError={() => setCoverError(0)} />
                      </div>
                    </div>
                  </motion.div>
                  {/* Center phone — upright, forward */}
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                    className="relative z-[2] w-[clamp(120px,28vw,220px)] shadow-2xl"
                  >
                    <div className="overflow-hidden rounded-[2.25rem] border-[10px] border-neutral-900 bg-neutral-900 dark:border-neutral-800 dark:bg-neutral-800" style={{ aspectRatio: '9/19' }}>
                      <div className="relative h-full w-full overflow-hidden rounded-[1.4rem] bg-muted">
                        <Image src={useCoverSrc(1)} fill alt="Loro — Real-time updates" className="object-cover" sizes="(max-width:768px) 140px, 220px" onError={() => setCoverError(1)} />
                      </div>
                    </div>
                  </motion.div>
                  {/* Right phone — angled right, behind */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
                    className="absolute left-1/2 z-[1] w-[clamp(100px,22vw,180px)] origin-bottom"
                    style={{ transform: 'translateX(-22%) rotate(12deg)' }}
                  >
                    <div className="overflow-hidden rounded-[2rem] border-[10px] border-neutral-900 bg-neutral-900 shadow-xl dark:border-neutral-800 dark:bg-neutral-800" style={{ aspectRatio: '9/19' }}>
                      <div className="relative h-full w-full overflow-hidden rounded-[1.25rem] bg-muted">
                        <Image src={useCoverSrc(2)} fill alt="Loro — Enterprise-grade security" className="object-cover" sizes="(max-width:768px) 120px, 180px" onError={() => setCoverError(2)} />
                      </div>
                    </div>
                  </motion.div>
                </div>
                {/* Tagline */}
                <StaggerContainer className="flex w-full max-h-[600px] flex-col items-center justify-center gap-3 overflow-hidden lg:max-h-none lg:gap-4" delay={0.3} staggerChildren={0.15}>
                  <StaggerItem className="flex w-full flex-col items-center space-y-2">
                    <p className="font-body text-2xl font-normal tracking-tighter text-muted-foreground/90 sm:text-3xl md:text-4xl xl:text-5xl/none uppercase">
                      Enterprise features, SME pricing
                    </p>
                    <p className="font-body mx-auto max-w-[600px] text-center text-xs uppercase text-muted-foreground md:text-xs">
                      Stop juggling multiple systems. Loro combines field service management, inventory tracking, quotation system, task management, and real-time analytics in one powerful platform.
                    </p>
                  </StaggerItem>
                  <StaggerItem className="flex min-[400px]:flex-row flex-col justify-center items-center gap-2">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button size="lg" className="font-body text-xs font-normal uppercase bg-purple-600 text-white hover:bg-purple-700 border-0" asChild>
                        <a href="https://drive.google.com/uc?export=download&id=1ec6BfP1co9T6L0b6iiyiaWH4yzLc0a1y" target="_blank" rel="noopener noreferrer">Try our Android App</a>
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="outline" size="lg" className="font-body text-xs font-normal uppercase" asChild>
                        <Link href="#features">See Features</Link>
                      </Button>
                    </motion.div>
                  </StaggerItem>
                </StaggerContainer>
              </div>
            </div>
          </MotionSection>

          {/* Video */}
          <MotionSection className="py-12 md:py-16" direction="up">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mx-auto max-w-4xl text-center">
                <motion.h2 className="font-body mb-8 text-2xl font-normal tracking-tighter uppercase sm:text-3xl md:text-4xl" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>DISCOVER LORO</motion.h2>
                <motion.div className="relative mx-auto max-w-5xl" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} viewport={{ once: true }}>
                  <div className="relative overflow-hidden rounded-lg border border-border aspect-video bg-muted/50">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/10" />
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

          {/* Features */}
          <MotionSection className="bg-muted/50 py-16 md:py-24" direction="up" id="features">
            <div className="container mx-auto px-4 md:px-6">
              <StaggerContainer className="mb-12 text-center" staggerChildren={0.2}>
                <StaggerItem><h2 className="font-body text-3xl font-normal tracking-tighter uppercase sm:text-4xl md:text-5xl">Why South African Businesses Choose Loro</h2></StaggerItem>
                <StaggerItem><p className="font-body mx-auto mt-4 max-w-3xl text-xs uppercase text-muted-foreground md:text-xs">Loro isn&apos;t just another tool. It&apos;s your complete business command center.</p></StaggerItem>
              </StaggerContainer>
              <StaggerContainer className="mb-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4" staggerChildren={0.15}>
                {[
                  { emoji: '🎯', title: 'Smart Lead Management', desc: 'Capture, qualify, and convert leads with AI-powered lead scoring and automated follow-up sequences.', bullets: ['Automated lead assignment', 'Lead scoring & qualification', 'Follow-up reminders'], iconClass: 'bg-blue-100 text-blue-600' },
                  { emoji: '💰', title: 'Sales Pipeline Control', desc: 'Visual sales pipeline with drag-and-drop stages, deal probability tracking, and revenue forecasting.', bullets: ['Target tracking & progress', 'Revenue forecasting', 'Deal probability tracking'], iconClass: 'bg-green-100 text-green-600' },
                  { emoji: '✅', title: 'Task & Project Management', desc: 'Organize work with smart task assignment, priority management, and real-time progress tracking.', bullets: ['Smart task assignment', 'Priority & deadline tracking', 'Team collaboration tools'], iconClass: 'bg-purple-100 text-purple-600' },
                  { emoji: '⚡', title: 'Workflow Automation', desc: 'Automate repetitive tasks with intelligent workflows that trigger actions based on customer behavior.', bullets: ['Custom workflow builder', 'Trigger-based automation', 'Email & SMS automation'], iconClass: 'bg-orange-100 text-orange-600' },
                ].map((f, i) => (
                  <StaggerItem key={i} direction="up">
                    <motion.div className="group h-full rounded-xl border border-border bg-card p-6 shadow-sm" whileHover={{ y: -10, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} transition={{ duration: 0.3 }}>
                      <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${f.iconClass}`}><span className="text-xl">{f.emoji}</span></div>
                      <h3 className="font-body mb-3 text-lg font-normal uppercase">{f.title}</h3>
                      <p className="font-body mb-4 text-xs uppercase text-muted-foreground">{f.desc}</p>
                      <div className="space-y-2">
                        {f.bullets.map((b, j) => (
                          <div key={j} className="font-body flex items-center text-[10px] uppercase">
                            <div className="mr-2 h-2 w-2 rounded-full bg-primary" />{b}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </MotionSection>

          {/* ERP Integration */}
          <MotionSection className="bg-gradient-to-b from-muted/50 to-background py-16 md:py-24" direction="up">
            <div className="container mx-auto px-4 md:px-6">
              <StaggerContainer className="mb-12 text-center" staggerChildren={0.2}>
                <StaggerItem><h2 className="font-body text-3xl font-normal tracking-tighter uppercase sm:text-4xl md:text-5xl">ERP Integration & Live Visibility</h2></StaggerItem>
                <StaggerItem><p className="font-body mx-auto mt-4 max-w-3xl text-xs uppercase text-muted-foreground md:text-xs">See your sales and quotes live from your ERP system. Everything updates automatically in real-time.</p></StaggerItem>
              </StaggerContainer>
              <div className="grid items-center gap-8 md:grid-cols-2">
                <StaggerContainer className="space-y-6" staggerChildren={0.15} delay={0.3}>
                  <StaggerItem><h3 className="font-body mb-4 text-2xl font-normal uppercase">Real-Time ERP Data Integration</h3></StaggerItem>
                  {['Live Sales Performance & Target Tracking', 'Live Quotation Tracking', 'Location Tracking & Trip Summaries', 'Automatic Data Sync'].map((h, i) => (
                    <StaggerItem key={i} direction="left">
                      <div className="flex items-start gap-4">
                        <motion.div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10" whileHover={{ scale: 1.1 }}><CheckIcon size={20} className="text-primary" /></motion.div>
                        <div><h4 className="font-body mb-2 text-lg font-normal uppercase">{h}</h4><p className="font-body text-xs uppercase text-muted-foreground">Real-time visibility and automatic sync.</p></div>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
                <motion.div className="rounded-xl border bg-card p-8" initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
                  <div className="space-y-4">
                    <div className="rounded-lg bg-muted/50 p-4"><div className="mb-2 flex items-center justify-between"><span className="font-body text-xs uppercase text-muted-foreground">Live Sales</span><span className="font-body text-lg font-semibold text-green-600">R 125,450</span></div><div className="font-body text-[10px] uppercase text-muted-foreground">Updated in real-time from ERP</div></div>
                    <div className="rounded-lg bg-muted/50 p-4"><div className="mb-2 flex items-center justify-between"><span className="font-body text-xs uppercase text-muted-foreground">Active Quotes</span><span className="font-body text-lg font-semibold text-blue-600">23</span></div><div className="font-body text-[10px] uppercase text-muted-foreground">Live from ERP system</div></div>
                  </div>
                </motion.div>
              </div>
            </div>
          </MotionSection>

          {/* Benefits / Real Impact */}
          <MotionSection className="py-16 md:py-24" direction="up" id="benefits">
            <div className="container mx-auto px-4 md:px-6">
              <StaggerContainer className="mb-12 text-center" staggerChildren={0.2}>
                <StaggerItem><h2 className="font-body text-3xl font-normal tracking-tighter uppercase sm:text-4xl md:text-5xl">Real Impact, Real Results</h2></StaggerItem>
                <StaggerItem><p className="font-body mt-4 text-xs uppercase text-muted-foreground md:text-xs">Forget vague promises. Here&apos;s what Loro delivers.</p></StaggerItem>
              </StaggerContainer>
              <StaggerContainer className="grid gap-8 md:grid-cols-4" staggerChildren={0.15}>
                {[
                  { title: 'Slash Operational Costs', stats: ['Admin overhead 35% ↓', 'Fuel expenses 25% ↓'], desc: 'Cut administrative overhead with digital processes and smart route optimization.' },
                  { title: 'Boost Sales Performance', stats: ['Lead conversion 45% ↑', 'Quote speed 3x faster'], desc: 'Increase lead conversion with automated nurturing and mobile quoting.' },
                  { title: 'Supercharge Team Productivity', stats: ['Travel time 40% ↓', 'Quote generation 60% faster'], desc: 'Reduce travel time with AI-powered route planning.' },
                  { title: 'Elevate Customer Satisfaction', stats: ['On-time delivery 95%+', 'Response time <2 hours'], desc: 'Achieve exceptional on-time service delivery with smart scheduling.' },
                ].map((b, i) => (
                  <StaggerItem key={i} direction="up">
                    <motion.div className="h-full rounded-xl border border-border bg-card p-6 shadow-sm" whileHover={{ y: -10, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} transition={{ duration: 0.3 }}>
                      <h3 className="font-body mb-2 text-xl font-normal uppercase">{b.title}</h3>
                      <div className="mb-4 space-y-2 text-xs"><span className="font-body text-muted-foreground uppercase">{b.stats.join(' · ')}</span></div>
                      <p className="font-body text-xs uppercase text-muted-foreground">{b.desc}</p>
                    </motion.div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </MotionSection>

          {/* Take Control / Automate */}
          <MotionSection className="py-20" direction="up">
            <div className="container mx-auto px-4 md:px-6 flex flex-col items-center">
              <p className="font-body mb-8 max-w-4xl text-center text-xs uppercase leading-relaxed text-muted-foreground md:text-xs">
                Stop chasing information across multiple systems and spreadsheets. Loro puts you in the driver&apos;s seat with intelligent automation that handles the routine work while you focus on growing your business.
              </p>
              <div className="mb-16 flex flex-col items-center gap-4 md:flex-row md:justify-center md:max-w-4xl">
                <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="max-w-[96px] shrink-0">
                  <Image src={useCoverSrc(1)} alt="Automation" width={400} height={400} className="h-auto w-full rounded-xl object-cover" onError={() => setCoverError(1)} />
                </motion.div>
                <StaggerContainer className="space-y-6 text-center" staggerChildren={0.15} delay={0.3}>
                  <StaggerItem><h3 className="font-body mb-4 text-2xl font-normal uppercase">Automate What Matters, Control What Counts</h3></StaggerItem>
                  {['Smart Lead Distribution', 'Intelligent Follow-Up Sequences', 'Dynamic Route Planning', 'Order Directly from the Platform', 'Live ERP Visibility'].map((item, i) => (
                    <StaggerItem key={i} direction="left">
                      <div className="flex items-center justify-center gap-4 md:justify-center">
                        <motion.div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10" whileHover={{ scale: 1.1 }}><CheckIcon size={20} className="text-primary" /></motion.div>
                        <div><h4 className="font-body mb-2 text-lg font-normal uppercase">{item}</h4></div>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
              <div className="flex flex-col items-center gap-4 md:flex-row md:justify-center md:max-w-4xl">
                <motion.div className="max-w-[144px] shrink-0" initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
                  <Image src={useCoverSrc(2)} alt="Client management" width={600} height={400} className="h-auto w-full rounded-xl object-cover" onError={() => setCoverError(2)} />
                </motion.div>
                <StaggerContainer className="space-y-6 text-center" staggerChildren={0.15} delay={0.3}>
                  <StaggerItem><h3 className="font-body mb-4 text-2xl font-normal uppercase">Effortless Client Relationship Management</h3></StaggerItem>
                  {['Unified Client Timeline', 'Predictive Insights', 'Seamless Communication'].map((item, i) => (
                    <StaggerItem key={i} direction="right">
                      <div className="flex items-center justify-center gap-4 md:justify-center">
                        <motion.div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10" whileHover={{ scale: 1.1 }}><CheckIcon size={20} className="text-primary" /></motion.div>
                        <div><h4 className="font-body mb-2 text-lg font-normal uppercase">{item}</h4></div>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
              <motion.div className="mt-16 text-center" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }}>
                <h3 className="font-body mb-3 text-2xl font-normal tracking-tighter uppercase sm:text-3xl">Data-Driven Decision Making Made Simple</h3>
                <p className="font-body mx-auto max-w-2xl text-xs uppercase text-muted-foreground md:text-xs">
                  Transform your business intelligence from guesswork to precision with real-time analytics that actually help you grow.
                </p>
              </motion.div>
              <div className="mt-12 text-center">
                <Button asChild className="font-body text-xs font-normal uppercase"><Link href="/onboarding">Start Your Free Trial</Link></Button>
              </div>
            </div>
          </MotionSection>

          {/* What Sets Loro Apart */}
          <MotionSection className="bg-gradient-to-b from-background to-muted/30 py-20" direction="up">
            <div className="container mx-auto px-4 md:px-6">
              <StaggerContainer className="mb-12 text-center" staggerChildren={0.2}>
                <StaggerItem><h2 className="font-body text-3xl font-normal tracking-tighter uppercase sm:text-4xl md:text-5xl">What Sets Loro Apart</h2></StaggerItem>
                <StaggerItem><p className="font-body mt-4 text-xs uppercase text-muted-foreground md:text-xs">One platform. Everything connected.</p></StaggerItem>
              </StaggerContainer>
              <StaggerContainer className="grid gap-8 md:grid-cols-2 lg:grid-cols-3" staggerChildren={0.15}>
                {[
                  { icon: '🔄', title: 'ERP Live Integration', desc: 'See your sales and quotes live from your ERP system.' },
                  { icon: '🛒', title: 'Order From the Platform', desc: 'Order directly from Loro. Quotations convert to orders seamlessly.' },
                  { icon: '🔗', title: 'Everything Connected', desc: 'Field Service, ERP, Analytics — all in one platform.' },
                  { icon: '📱', title: 'Mobile-First Design', desc: 'Native mobile apps with offline capabilities and push notifications.' },
                  { icon: '⚡', title: 'Real-Time Analytics', desc: 'Make data-driven decisions with real-time dashboards.' },
                  { icon: '🎯', title: 'Built for South Africa', desc: 'Designed for South African businesses. Local support, ZAR pricing.' },
                ].map((c, i) => (
                  <StaggerItem key={i} direction="up">
                    <motion.div className="h-full rounded-xl border border-border bg-card p-6 shadow-sm" whileHover={{ y: -10, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} transition={{ duration: 0.3 }}>
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10"><span className="text-2xl">{c.icon}</span></div>
                        <h3 className="font-body text-xl font-normal uppercase">{c.title}</h3>
                      </div>
                      <p className="font-body text-xs uppercase text-muted-foreground">{c.desc}</p>
                    </motion.div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </MotionSection>

          {/* Testimonials */}
          <MotionSection id="testimonials" className="bg-muted py-20" direction="up">
            <div className="container mx-auto px-4 md:px-6">
              <StaggerContainer className="mb-12 text-center" staggerChildren={0.2}>
                <StaggerItem><h2 className="font-body text-3xl font-normal tracking-tighter uppercase sm:text-4xl md:text-5xl">What Our Users Say</h2></StaggerItem>
                <StaggerItem><p className="font-body mt-4 text-xl uppercase text-muted-foreground">Hear from professionals who have transformed their operations with Loro</p></StaggerItem>
              </StaggerContainer>
              <StaggerContainer className="grid gap-8 md:grid-cols-3" staggerChildren={0.15}>
                {[
                  { initials: 'SM', name: 'Sarah M.', role: 'Graphic Designer', quote: 'Loro made it so easy to manage my freelance business! The platform and quoting features have been a game-changer.', stars: 5 },
                  { initials: 'JT', name: 'James T.', role: 'Startup Founder', quote: "I love the ERP integration—we use Loro for all our business operations, and the analytics help us track performance.", stars: 5 },
                  { initials: 'PR', name: 'Priya R.', role: 'Small Business Owner', quote: "Affordable and intuitive. I've received so many compliments on how organized we are—and I can update everything in real time.", stars: 4 },
                ].map((t, i) => (
                  <StaggerItem key={i} direction="up">
                    <motion.div className="h-full rounded-xl bg-card p-6 shadow-sm" whileHover={{ y: -10, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} transition={{ duration: 0.3 }}>
                      <div className="mb-4 flex items-center gap-4">
                        <div className="font-body flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-xl uppercase text-primary">{t.initials}</div>
                        <div><h3 className="font-body font-normal uppercase">{t.name}</h3><p className="font-body text-[10px] uppercase text-muted-foreground">{t.role}</p></div>
                      </div>
                      <p className="font-body text-xs italic uppercase text-muted-foreground">&quot;{t.quote}&quot;</p>
                      <div className="mt-4 flex">{[1,2,3,4,5].map((star) => <span key={star} className={star <= t.stars ? 'text-yellow-500' : 'text-yellow-500/50'}>★</span>)}</div>
                    </motion.div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </MotionSection>

          {/* Customization */}
          <MotionSection className="bg-accent py-20" direction="up">
            <div className="container mx-auto px-4 md:px-6">
              <StaggerContainer className="mb-12 text-center" staggerChildren={0.2}>
                <StaggerItem><h2 className="font-body text-3xl font-normal tracking-tighter uppercase sm:text-4xl md:text-5xl">Complete Business Customization</h2></StaggerItem>
                <StaggerItem><p className="font-body mt-4 text-xs uppercase text-muted-foreground md:text-xs">Transform Loro to match your brand identity and business processes.</p></StaggerItem>
              </StaggerContainer>
              <div className="mt-12 text-center">
                <Button asChild className="font-body text-xs font-normal uppercase"><Link href="/sign-up">Start Customizing Your Business</Link></Button>
              </div>
            </div>
          </MotionSection>

          {/* FAQ */}
          <MotionSection id="faq" className="py-20" direction="up">
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

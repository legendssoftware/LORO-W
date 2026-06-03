'use client';

import Link from 'next/link';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import type Vapi from '@vapi-ai/web';
import { motion, AnimatePresence } from 'framer-motion';
import { MenuIcon, PhoneCallIcon, XIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toast-helpers';
import { handleVapiError, retryVapiOperation } from '@/lib/utils/vapi-error-handler';

const CALL_MAX_DURATION_MS =
  parseInt(process.env.NEXT_PUBLIC_MAX_CALL_DURATION_MINUTES ?? '5', 10) * 60 * 1000;
const WARNING_TIME_REMAINING_MS =
  parseInt(process.env.NEXT_PUBLIC_CALL_WARNING_SECONDS ?? '60', 10) * 1000;

type LandingSiteHeaderProps = {
  productHref?: string;
  solutionsHref?: string;
};

export function LandingSiteHeader({
  productHref = '#features',
  solutionsHref = '#solutions',
}: LandingSiteHeaderProps) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallInitializing, setIsCallInitializing] = useState(false);
  const [demoVapi, setDemoVapi] = useState<Vapi | null>(null);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const vapiInitRef = useRef<Promise<Vapi | null> | null>(null);
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
        toast('1 minute remaining in your call', {
          duration: 4000,
          position: 'bottom-center',
          icon: '⏱️',
        });
      }
      if (remaining <= 0) {
        toast('Call time limit reached (5 minutes)', {
          duration: 4000,
          position: 'bottom-center',
          icon: '⏰',
        });
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
        endDemoCall();
      }
    }, 1000);
  }, [endDemoCall]);

  const ensureDemoVapi = useCallback(async (): Promise<Vapi | null> => {
    if (demoVapi) return demoVapi;
    if (vapiInitRef.current) return vapiInitRef.current;

    vapiInitRef.current = (async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_VAPI_KEY;
        if (!apiKey) throw new Error('Vapi API key not defined');
        const { default: VapiClient } = await import('@vapi-ai/web');
        const vapi = new VapiClient(apiKey);
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
        return vapi;
      } catch (error) {
        vapiInitRef.current = null;
        setConnectionError(error instanceof Error ? error : new Error(String(error)));
        handleVapiError(error, toast);
        return null;
      }
    })();

    return vapiInitRef.current;
  }, [demoVapi, startCallTimer, stopCallTimer]);

  useEffect(() => {
    return () => {
      stopCallTimer();
      if (demoVapi) {
        try {
          demoVapi.stop();
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, [demoVapi, stopCallTimer]);

  const startDemoCall = async () => {
    const vapi = await ensureDemoVapi();
    if (!vapi) {
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
      await retryVapiOperation(() => vapi.start(assistantId), 2, toast, {
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

  const demoCallButton = isCallActive ? (
    <Button
      variant="outline"
      size="sm"
      onClick={endDemoCall}
      className="font-body text-xs font-normal text-red-400 border-0 bg-transparent hover:bg-red-500/20 hover:text-red-300"
    >
      END CALL {formattedTimeRemaining && `(${formattedTimeRemaining})`}
    </Button>
  ) : connectionError ? (
    <Button
      variant="outline"
      size="sm"
      onClick={retryDemoCall}
      className="font-body text-xs font-normal text-amber-400 border-0 bg-transparent hover:bg-amber-500/20"
    >
      RETRY CALL
    </Button>
  ) : (
    <Button
      variant="outline"
      size="sm"
      onClick={startDemoCall}
      disabled={isCallInitializing}
      className="font-body text-xs font-normal text-white border-0 bg-purple-600 hover:bg-purple-700 transition-colors"
    >
      {isCallInitializing ? 'CONNECTING...' : 'DEMO CALL'}
    </Button>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-900/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
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
          <Link
            href={productHref}
            className="font-body text-sm font-normal text-zinc-300 hover:text-white transition-colors"
          >
            Product
          </Link>
          <Link
            href={solutionsHref}
            className="font-body text-sm font-normal text-zinc-300 hover:text-white transition-colors"
          >
            Solutions
          </Link>
          <Link
            href="#"
            className="font-body text-sm font-normal text-zinc-300 hover:text-white transition-colors"
          >
            Careers
          </Link>
          <Link
            href="#"
            className="font-body text-sm font-normal text-zinc-300 hover:text-white transition-colors"
          >
            Research
          </Link>
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/sign-in"
            className="font-body text-sm font-normal text-zinc-300 hover:text-white transition-colors"
          >
            My Account
          </Link>
          {demoCallButton}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              setIsMobileMenuOpen(!isMobileMenuOpen);
            }}
            className="rounded-lg p-2 hover:bg-white/10 text-zinc-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Open menu"
          >
            <MenuIcon size={24} className="size-6" />
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="fixed inset-0 z-[80] flex h-screen w-full flex-col bg-zinc-950/95 shadow-xl backdrop-blur-md border-l border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-white/10 bg-zinc-900/80 p-4">
                <span className="font-body text-lg tracking-tight text-white">LORO</span>
                <motion.button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-full p-2 border border-white/20 bg-white/5 text-zinc-300 hover:bg-white/10"
                  aria-label="Close menu"
                >
                  <XIcon size={24} className="size-6" />
                </motion.button>
              </div>
              <div className="flex flex-1 flex-col items-center space-y-2 bg-zinc-950/90 p-4">
                <Link
                  href={productHref}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="font-body w-full rounded-lg p-3 text-center text-sm text-zinc-300 hover:bg-white/10 hover:text-white"
                >
                  Product
                </Link>
                <Link
                  href={solutionsHref}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="font-body w-full rounded-lg p-3 text-center text-sm text-zinc-300 hover:bg-white/10 hover:text-white"
                >
                  Solutions
                </Link>
                <Link
                  href="#"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="font-body w-full rounded-lg p-3 text-center text-sm text-zinc-300 hover:bg-white/10 hover:text-white"
                >
                  Careers
                </Link>
                <Link
                  href="#"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="font-body w-full rounded-lg p-3 text-center text-sm text-zinc-300 hover:bg-white/10 hover:text-white"
                >
                  Research
                </Link>
                <div className="flex w-full flex-col items-center border-t border-white/10 pt-4 space-y-2">
                  <Link
                    href="/sign-in"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="font-body block w-full rounded-lg p-3 text-center text-sm text-zinc-400 hover:bg-white/10 hover:text-white"
                  >
                    My Account
                  </Link>
                  {isCallActive ? (
                    <Button
                      variant="outline"
                      onClick={endDemoCall}
                      className="font-body w-full text-xs text-red-400 border-0 hover:bg-red-500/20"
                    >
                      END CALL {formattedTimeRemaining && `(${formattedTimeRemaining})`}
                    </Button>
                  ) : connectionError ? (
                    <Button
                      variant="outline"
                      onClick={retryDemoCall}
                      className="font-body w-full text-xs text-amber-400 border-0 hover:bg-amber-500/20"
                    >
                      <PhoneCallIcon size={16} className="mr-2 inline" />
                      RETRY CALL
                    </Button>
                  ) : (
                    <Button
                      onClick={startDemoCall}
                      disabled={isCallInitializing}
                      className="font-body w-full text-xs text-white border-0 bg-purple-600 hover:bg-purple-700 transition-colors"
                    >
                      <PhoneCallIcon size={16} className="mr-2 inline" />
                      {isCallInitializing ? 'CONNECTING...' : 'DEMO CALL'}
                    </Button>
                  )}
                  <Button
                    asChild
                    className="font-body w-full text-xs bg-white text-zinc-900 hover:bg-zinc-200 border-0 hover:bg-purple-600 hover:text-white"
                  >
                    <Link href="/onboarding" onClick={() => setIsMobileMenuOpen(false)}>
                      Get Started
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}

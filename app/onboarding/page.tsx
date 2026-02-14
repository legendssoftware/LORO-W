'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { onboardingData } from '@/lib/onboarding-data';
import { Button } from '@/components/ui/button';
import { CheckIcon, ChevronRightIcon } from '@/lib/icons';

const GRADIENT =
  'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 33%, #EC4899 66%, #F59E0B 100%)';

/** Slide transition — matches web app hero phrase animation (app/page.tsx) */
const slideVariants = {
  initial: { y: 50, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeInOut' as const } },
  exit: { y: -50, opacity: 0, transition: { duration: 0.5, ease: 'easeInOut' as const } },
};

const DRAG_THRESHOLD = 50;

export default function OnboardingPage() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = useCallback(() => {
    if (currentIndex < onboardingData.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const goTo = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, onboardingData.length - 1)));
  }, []);

  const onDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
      const dx = info.offset.x;
      const vx = info.velocity.x ?? 0;
      const swipeRight = dx > DRAG_THRESHOLD || vx > 300;
      const swipeLeft = dx < -DRAG_THRESHOLD || vx < -300;
      if (swipeLeft && currentIndex < onboardingData.length - 1) {
        handleNext();
      } else if (swipeRight && currentIndex > 0) {
        handlePrev();
      }
    },
    [currentIndex, handleNext, handlePrev]
  );

  const isLast = currentIndex === onboardingData.length - 1;

  return (
    <div
      className="relative flex min-h-screen flex-col"
      style={{ background: GRADIENT }}
    >
      <div className="absolute right-6 top-16 z-10">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button asChild variant="ghost" size="sm" className="rounded-full bg-white/20 px-5 py-2.5 text-xs font-normal uppercase text-white hover:bg-white/30">
            <Link href="/sign-in">Skip</Link>
          </Button>
        </motion.div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8 overflow-hidden">
        <motion.div
          className="max-w-md w-full text-center touch-pan-y"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={onDragEnd}
          style={{ touchAction: 'pan-y' }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentIndex}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="overflow-hidden"
            >
              <h2 className="mb-4 text-2xl font-normal tracking-tighter text-center uppercase text-white sm:text-3xl font-body">
                {onboardingData[currentIndex].title}
              </h2>
              <p className="text-xs uppercase text-white/90 font-body text-center max-w-[600px] mx-auto">
                {onboardingData[currentIndex].description}
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="px-8 pb-12">
        <div className="mb-4 flex justify-center gap-1">
          {onboardingData.map((_, i) => (
            <Button
              key={i}
              variant="ghost"
              size="icon"
              className="h-2 w-2 rounded-full p-0 transition-all data-[current]:w-8"
              style={{
                width: currentIndex === i ? 32 : 8,
                backgroundColor: currentIndex === i ? '#8B5CF6' : 'rgba(255,255,255,0.4)',
              }}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={currentIndex === i ? 'true' : undefined}
            />
          ))}
        </div>

        <div className="flex items-center justify-between">
          {currentIndex > 0 ? (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="ghost" size="sm" className="text-xs font-normal uppercase text-white hover:bg-white/20" onClick={handlePrev}>
                Prev
              </Button>
            </motion.div>
          ) : (
            <div />
          )}

          <div className="flex justify-center">
            <AnimatePresence mode="wait">
              {isLast ? (
                <motion.div
                  key="get-started"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <Button asChild size="icon" className="h-20 w-20 rounded-full bg-green-500 hover:bg-green-600" aria-label="Get started">
                    <Link href="/sign-in">
                      <CheckIcon className="size-6" />
                    </Link>
                  </Button>
                </motion.div>
              ) : (
                <motion.div key="next" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="icon"
                    className="h-20 w-20 rounded-full bg-white text-black hover:bg-white/90"
                    onClick={handleNext}
                    aria-label="Next slide"
                  >
                    <ChevronRightIcon className="size-6" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {currentIndex > 0 ? <div /> : <div />}
        </div>
      </div>
    </div>
  );
}

import type { Variants } from 'framer-motion';

/**
 * Detect if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if device is mobile for performance optimization
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

/**
 * Get optimized animation duration based on device and user preferences
 */
export function getOptimizedDuration(baseDuration: number): number {
  if (prefersReducedMotion()) return 0;
  if (isMobileDevice()) return baseDuration * 0.7;
  return baseDuration;
}

/**
 * Get optimized viewport threshold for mobile devices
 */
export function getViewportThreshold(baseThreshold = 0.2): number {
  if (isMobileDevice()) return Math.max(0.1, baseThreshold * 0.5);
  return baseThreshold;
}

/**
 * Mobile-optimized motion section props
 */
export function getMobileOptimizedMotionProps(): {
  threshold: number;
  rootMargin: string;
} {
  return {
    threshold: getViewportThreshold(),
    rootMargin: isMobileDevice() ? '0px 0px -50px 0px' : '0px 0px -100px 0px',
  };
}

export const pageTransitionVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.3, ease: 'easeInOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.3, ease: 'easeInOut' },
  },
};

export const slideUpVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: { duration: 0.3, ease: 'easeIn' },
  },
};

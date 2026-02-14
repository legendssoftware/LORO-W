'use client';

import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

const pageVariants: Variants = {
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

const slideUpVariants: Variants = {
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

interface PageTransitionProps {
  children: ReactNode;
  type?: 'fade' | 'slide-up';
}

export function PageTransition({
  children,
  type = 'fade',
}: PageTransitionProps) {
  const variants = type === 'slide-up' ? slideUpVariants : pageVariants;
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      className="h-full w-full overflow-hidden"
    >
      {children}
    </motion.div>
  );
}

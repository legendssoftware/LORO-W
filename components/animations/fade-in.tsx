'use client';

import { motion } from 'framer-motion';
import { getOptimizedDuration, prefersReducedMotion } from '@/lib/utils/animations';

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}

export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.5,
}: FadeInProps) {
  if (prefersReducedMotion()) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: getOptimizedDuration(duration),
        delay: getOptimizedDuration(delay),
        ease: 'easeOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

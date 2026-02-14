'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  getMobileOptimizedMotionProps,
  getOptimizedDuration,
  isMobileDevice,
} from '@/lib/utils/animations';

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  staggerChildren?: number;
  once?: boolean;
  threshold?: number;
}

export function StaggerContainer({
  children,
  className,
  delay = 0,
  staggerChildren,
  once = true,
  threshold,
}: StaggerContainerProps) {
  const ref = useRef(null);
  const mobileProps = getMobileOptimizedMotionProps();
  const finalThreshold = threshold ?? mobileProps.threshold;
  const isInView = useInView(ref, {
    once,
    amount: finalThreshold,
  });
  const optimizedStagger = staggerChildren ?? (isMobileDevice() ? 0.05 : 0.1);
  const optimizedDelay = getOptimizedDuration(delay);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: optimizedDelay,
        staggerChildren: optimizedStagger,
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={containerVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

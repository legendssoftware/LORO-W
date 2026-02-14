'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  getMobileOptimizedMotionProps,
  getOptimizedDuration,
} from '@/lib/utils/animations';

interface MotionSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  duration?: number;
  id?: string;
  once?: boolean;
  threshold?: number;
}

export function MotionSection({
  children,
  className,
  delay = 0,
  direction = 'up',
  duration = 0.5,
  id,
  once = true,
  threshold,
}: MotionSectionProps) {
  const ref = useRef(null);
  const mobileProps = getMobileOptimizedMotionProps();
  const finalThreshold = threshold ?? mobileProps.threshold;
  const isInView = useInView(ref, {
    once,
    amount: finalThreshold,
  });
  const optimizedDuration = getOptimizedDuration(duration);
  const optimizedDelay = getOptimizedDuration(delay);

  const getDirectionVariants = () => {
    const moveAmount = 50;
    switch (direction) {
      case 'up':
        return { hidden: { opacity: 0, y: moveAmount }, visible: { opacity: 1, y: 0 } };
      case 'down':
        return { hidden: { opacity: 0, y: -moveAmount }, visible: { opacity: 1, y: 0 } };
      case 'left':
        return { hidden: { opacity: 0, x: moveAmount }, visible: { opacity: 1, x: 0 } };
      case 'right':
        return { hidden: { opacity: 0, x: -moveAmount }, visible: { opacity: 1, x: 0 } };
      case 'none':
        return { hidden: { opacity: 0 }, visible: { opacity: 1 } };
    }
  };

  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={getDirectionVariants()}
      transition={{
        duration: optimizedDuration,
        delay: optimizedDelay,
        ease: 'easeOut',
      }}
      className={className}
      id={id}
    >
      {children}
    </motion.section>
  );
}

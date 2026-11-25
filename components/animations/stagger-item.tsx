'use client';

import { motion } from 'framer-motion';
import { getOptimizedDuration, prefersReducedMotion } from '@/lib/utils/animations';

interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  duration?: number;
}

export function StaggerItem({
  children,
  className,
  direction = 'up',
  duration = 0.5,
}: StaggerItemProps) {
  if (prefersReducedMotion()) {
    return <div className={className}>{children}</div>;
  }

  const getDirectionVariants = () => {
    switch (direction) {
      case 'up':
        return { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
      case 'down':
        return { hidden: { opacity: 0, y: -20 }, visible: { opacity: 1, y: 0 } };
      case 'left':
        return { hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0 } };
      case 'right':
        return { hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } };
      case 'none':
        return { hidden: { opacity: 0 }, visible: { opacity: 1 } };
      default: {
        const _exhaustive: never = direction;
        return _exhaustive;
      }
    }
  };

  return (
    <motion.div
      variants={getDirectionVariants()}
      transition={{ duration: getOptimizedDuration(duration), ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

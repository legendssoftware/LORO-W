import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names with Tailwind CSS conflict resolution.
 * @see https://ui.shadcn.com/docs/installation
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import Image from 'next/image';
import { cn } from '@/lib/utils';

type BrandMarkProps = {
  className?: string;
  wordmarkClassName?: string;
  imageClassName?: string;
  showWordmark?: boolean;
  priority?: boolean;
};

/**
 * Parrot mark plus optional LORO wordmark for headers, sidebar, and auth chrome.
 */
export function BrandMark({
  className,
  wordmarkClassName,
  imageClassName,
  showWordmark = true,
  priority = false,
}: BrandMarkProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Image
        src="/logo.png"
        alt=""
        width={56}
        height={40}
        className={cn('h-8 w-auto', imageClassName)}
        priority={priority}
      />
      {showWordmark ? (
        <span className={cn('font-body tracking-tight', wordmarkClassName)}>
          LORO
        </span>
      ) : null}
    </span>
  );
}

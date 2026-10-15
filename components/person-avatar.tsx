'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

/** Two-letter initials from a display name. */
export function personInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

/** Round photo with initials when the image is missing. */
export function PersonAvatar({
  name,
  photoURL,
  avatar,
  className,
}: {
  name: string;
  photoURL?: string | null;
  avatar?: string | null;
  className?: string;
}) {
  const src = photoURL || avatar || undefined;
  return (
    <Avatar className={cn('size-6', className)}>
      {src ? <AvatarImage src={src} alt={name} /> : null}
      <AvatarFallback className="text-[10px]">{personInitials(name)}</AvatarFallback>
    </Avatar>
  );
}

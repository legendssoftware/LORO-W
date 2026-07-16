'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { orgSiteInitials } from '@/lib/client-display';
import { cn } from '@/lib/utils';

export function BranchCatchmentLogo({
  branchName,
  logoUrl,
  className,
  size = 'md',
}: {
  branchName: string;
  logoUrl?: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setLogoFailed(false);
  }, [logoUrl]);

  const showLogo = Boolean(logoUrl) && !logoFailed;
  const initials = orgSiteInitials(branchName);
  const dim = size === 'sm' ? 'size-8' : 'size-10';

  if (showLogo && logoUrl) {
    return (
      <span
        className={cn(
          dim,
          'shrink-0 overflow-hidden rounded-full border-2 border-border bg-white',
          className,
        )}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- external branch logo URLs */}
        <img
          src={logoUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="size-full object-contain p-0.5"
          onError={() => setLogoFailed(true)}
        />
      </span>
    );
  }

  return (
    <Avatar size={size === 'sm' ? 'default' : 'lg'} className={cn('shrink-0', className)}>
      <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
    </Avatar>
  );
}

'use client';

import type { MouseEvent } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sourceLinkLabel } from '@/app/approvals/approval-display';

export function ApprovalSourceOpenButton({
  href,
  entityType,
  className,
}: {
  href?: string;
  entityType?: string;
  className?: string;
}) {
  if (!href) return null;

  function handleClick(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  return (
    <Button asChild variant="success" size="sm" className={className}>
      <Link href={href} onClick={handleClick}>
        <ExternalLink />
        {sourceLinkLabel(entityType)}
      </Link>
    </Button>
  );
}

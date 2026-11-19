'use client';

import { useTranslation } from 'react-i18next';
import type { MouseEvent } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TFunction } from 'i18next';

function translatedSourceLabel(entityType: string | undefined, t: TFunction): string {
  const type = String(entityType ?? '').toLowerCase();
  if (type === 'user') return t('approvals.openEmployee');
  if (type === 'claim') return t('approvals.openClaim');
  if (type === 'client_profile' || type === 'client_credit_limit' || type === 'client') {
    return t('approvals.openClient');
  }
  return t('approvals.openSource');
}

export function ApprovalSourceOpenButton({
  href,
  entityType,
  className,
}: {
  href?: string;
  entityType?: string;
  className?: string;
}) {
  const { t } = useTranslation('screens');
  if (!href) return null;

  function handleClick(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  return (
    <Button asChild variant="success" size="sm" className={className}>
      <Link href={href} onClick={handleClick}>
        <ExternalLink />
        {translatedSourceLabel(entityType, t)}
      </Link>
    </Button>
  );
}

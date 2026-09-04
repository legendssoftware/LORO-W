'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const NEGATIVE_CHIP_IDS = new Set(['missed_opportunity']);

function chipIsGood(id: string, value: boolean): boolean {
  return NEGATIVE_CHIP_IDS.has(id) ? !value : value;
}

export function ReportsCallOutcomeChip({
  id,
  label,
  value,
}: {
  id: string;
  label: string;
  value: boolean;
}) {
  const good = chipIsGood(id, value);
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] font-medium',
        good ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700',
      )}
    >
      {label}: {value ? 'Yes' : 'No'}
    </Badge>
  );
}

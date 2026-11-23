'use client';

import { LayoutGrid, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export type StandardListViewMode = 'grid' | 'list';

export interface ListViewToggleProps {
  value: StandardListViewMode;
  onChange: (value: StandardListViewMode) => void;
  /** Accessible name for the toggle group. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Shared grid/list layout toggle used by FeatureShell list pages.
 */
export function ListViewToggle({
  value,
  onChange,
  ariaLabel,
  className,
}: ListViewToggleProps) {
  const { t } = useTranslation('screens');

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next === 'grid' || next === 'list') onChange(next);
      }}
      variant="outline"
      size="sm"
      className={className ?? 'shrink-0'}
      aria-label={ariaLabel ?? t('claims.layout')}
    >
      <ToggleGroupItem value="grid" aria-label={t('claims.folderGrid')} className="px-2.5">
        <LayoutGrid className="size-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="list" aria-label={t('claims.userList')} className="px-2.5">
        <List className="size-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

'use client';

import * as React from 'react';
import { Ban, CheckCircle2, Clock, Filter, ListFilter, PauseCircle } from 'lucide-react';
import {
  SearchableOptionListPicker,
  type SearchableOptionRow,
} from '@/components/filters/searchable-filter-comboboxes';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input, filterToolbarSearchInputClassName } from '@/components/ui/input';
import { XIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { statusFilterIconClass } from '@/lib/status-filter-icon';
import { useTranslation } from 'react-i18next';

const selectTriggerClass =
  'h-9 w-full border-border bg-background text-foreground sm:w-auto';

function projectStatusIcon(status: string): React.ReactNode {
  const tone = cn('size-4 shrink-0', statusFilterIconClass(status));
  if (status === 'completed') return <CheckCircle2 className={tone} />;
  if (status === 'cancelled') return <Ban className={tone} />;
  if (status === 'on_hold') return <PauseCircle className={tone} />;
  return <Clock className={tone} />;
}

export const PROJECT_STATUS_LABEL_KEYS: Record<string, string> = {
  planning: 'chrome.projects.status.planning',
  in_progress: 'chrome.projects.status.in_progress',
  on_hold: 'chrome.projects.status.on_hold',
  completed: 'chrome.projects.status.completed',
  cancelled: 'chrome.projects.status.cancelled',
};

export function buildProjectStatusFilterOptions(t: (key: string) => string): SearchableOptionRow[] {
  return [
    { value: 'planning', label: t('chrome.projects.status.planning'), icon: projectStatusIcon('planning') },
    { value: 'in_progress', label: t('chrome.projects.status.in_progress'), icon: projectStatusIcon('in_progress') },
    { value: 'on_hold', label: t('chrome.projects.status.on_hold'), icon: projectStatusIcon('on_hold') },
    { value: 'completed', label: t('chrome.projects.status.completed'), icon: projectStatusIcon('completed') },
    { value: 'cancelled', label: t('chrome.projects.status.cancelled'), icon: projectStatusIcon('cancelled') },
  ];
}

export interface ProjectsFilterControlsProps {
  layout: 'row' | 'stack';
  statusFilter: string;
  onStatusChange: (v: string) => void;
  statusOptions: SearchableOptionRow[];
}

export function ProjectsFilterControls({
  layout,
  statusFilter,
  onStatusChange,
  statusOptions,
}: ProjectsFilterControlsProps) {
  const { t } = useTranslation('screens');
  const row = layout === 'row';
  const statusTrigger = row
    ? 'h-9 min-w-0 w-[170px] shrink-0'
    : 'h-9 w-full min-w-0';

  const wrapClass = row
    ? 'flex flex-nowrap items-center gap-2'
    : 'flex w-full flex-col gap-4';

  return (
    <div className={wrapClass}>
      <div className={cn('flex items-center gap-1 min-w-0', !row && 'w-full')}>
        <SearchableOptionListPicker
          selectedValue={statusFilter}
          onValueChange={onStatusChange}
          options={statusOptions}
          allOptionValue="all"
          placeholderLabelWhenAll={t('actions.allStatuses')}
          searchPlaceholder={t('chrome.projects.searchStatuses')}
          emptyMessage={t('actions.noStatusFound')}
          triggerIcon={<ListFilter className="size-4 shrink-0" />}
          triggerClassName={statusTrigger}
        />
        {statusFilter !== 'all' ? (
          <button
            type="button"
            onClick={() => onStatusChange('all')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded p-0.5 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-auto"
            aria-label={t('actions.clearStatusFilter')}
          >
            <XIcon className="size-4 text-muted-foreground" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ProjectsFiltersBar({
  searchInput,
  onSearchChange,
  statusFilter,
  onStatusChange,
  statusOptions,
}: {
  searchInput: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
  statusOptions?: SearchableOptionRow[];
}) {
  const { t } = useTranslation('screens');
  const resolvedOptions = statusOptions ?? buildProjectStatusFilterOptions(t);
  const [filtersDialogOpen, setFiltersDialogOpen] = React.useState(false);

  React.useEffect(() => {
    function onResize() {
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        setFiltersDialogOpen(false);
      }
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  function resetAll() {
    onSearchChange('');
    onStatusChange('all');
  }

  function renderSearchField(className?: string) {
    return (
      <div className={cn('relative w-full min-w-0 shrink-0 md:w-56 md:max-w-[16rem]', className)}>
        <Input
          placeholder={t('chrome.projects.searchPlaceholder')}
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(filterToolbarSearchInputClassName, searchInput && 'pr-8')}
        />
        {searchInput ? (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t('actions.clearSearch')}
          >
            <XIcon className="size-4" />
          </button>
        ) : null}
      </div>
    );
  }

  const filterProps: ProjectsFilterControlsProps = {
    layout: 'row',
    statusFilter,
    onStatusChange,
    statusOptions: resolvedOptions,
  };

  return (
    <div className="mb-4 flex shrink-0 flex-col gap-3" data-tour="projects-toolbar">
      <div className="flex flex-col gap-2 md:hidden">
        <Button
          type="button"
          variant="outline"
          className={cn(
            selectTriggerClass,
            'h-9 min-w-0 w-full justify-center'
          )}
          onClick={() => setFiltersDialogOpen(true)}
        >
          <Filter className="mr-2 size-4 shrink-0" aria-hidden />
          {t('actions.filter')}
        </Button>
        {renderSearchField('w-full')}
      </div>

      <Dialog open={filtersDialogOpen} onOpenChange={setFiltersDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('actions.filters')}</DialogTitle>
            <DialogDescription>
              {t('chrome.projects.filtersDescription')}
            </DialogDescription>
          </DialogHeader>
          <ProjectsFilterControls {...filterProps} layout="stack" />
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 w-full"
              onClick={() => {
                resetAll();
                setFiltersDialogOpen(false);
              }}
            >
              {t('actions.resetFilters')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="hidden min-w-0 items-center justify-between gap-3 md:flex">
        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max max-w-full flex-nowrap items-center gap-2">
            <ProjectsFilterControls {...filterProps} layout="row" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0"
              onClick={resetAll}
            >
              {t('actions.resetFilters')}
            </Button>
          </div>
        </div>
        <div className="shrink-0">{renderSearchField()}</div>
      </div>
    </div>
  );
}

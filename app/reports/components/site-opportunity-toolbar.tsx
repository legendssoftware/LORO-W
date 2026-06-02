'use client';

import { MapPin, Settings2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { SiteOpportunityMode, SiteOpportunitySettings } from '@/api/types/site-opportunity';

export function SiteOpportunityToolbar({
  showOpportunities,
  onToggleShow,
  mode,
  onModeChange,
  settings,
  onSettingsChange,
  className,
  isLoading = false,
}: {
  showOpportunities: boolean;
  onToggleShow: () => void;
  mode: SiteOpportunityMode;
  onModeChange: (mode: SiteOpportunityMode) => void;
  settings: SiteOpportunitySettings;
  onSettingsChange: (patch: Partial<SiteOpportunitySettings>) => void;
  className?: string;
  isLoading?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 py-2 px-1 border-b border-border/60',
        className
      )}
    >
      <Button
        type="button"
        size="sm"
        variant={showOpportunities ? 'default' : 'outline'}
        onClick={onToggleShow}
        disabled={isLoading && showOpportunities}
      >
        {isLoading && showOpportunities ? (
          <Loader2 className="size-4 mr-1.5 animate-spin" />
        ) : (
          <MapPin className="size-4 mr-1.5" />
        )}
        Suggested areas
      </Button>

      {showOpportunities ? (
        <>
          <div className="flex rounded-md border overflow-hidden text-sm">
            {(
              [
                ['greenfield', 'New sites'],
                ['catchment', 'Branch catchments'],
                ['both', 'Both'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onModeChange(value)}
                className={cn(
                  'px-3 py-1.5 transition-colors',
                  mode === value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-muted'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" size="sm" variant="ghost">
                <Settings2 className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="start">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="opp-radius">Radius (km)</Label>
                  <Input
                    id="opp-radius"
                    type="number"
                    min={1}
                    max={20}
                    value={settings.radiusMeters / 1000}
                    onChange={(e) =>
                      onSettingsChange({
                        radiusMeters: Number(e.target.value) * 1000,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="opp-top">Top zones</Label>
                  <Input
                    id="opp-top"
                    type="number"
                    min={3}
                    max={30}
                    value={settings.topN}
                    onChange={(e) =>
                      onSettingsChange({ topN: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="opp-sep">Min branch separation (km)</Label>
                  <Input
                    id="opp-sep"
                    type="number"
                    min={5}
                    max={50}
                    value={settings.minBranchSeparationKm}
                    onChange={(e) =>
                      onSettingsChange({
                        minBranchSeparationKm: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </>
      ) : null}
    </div>
  );
}

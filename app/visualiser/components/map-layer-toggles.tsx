'use client';

import { useState, type ComponentType, type CSSProperties } from 'react';
import {
  Building2,
  ChevronDown,
  Handshake,
  Store,
  Swords,
  UserRound,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  countLivePlottedReps,
  PlottedSalesRepsList,
} from '@/app/visualiser/components/plotted-sales-reps-list';
import { cn } from '@/lib/utils';
import type { VisualiserLayerVisibility } from '@/app/visualiser/hooks/use-visualiser-map-layers';
import {
  LAYER_META,
  type VisualiserLayerId,
  type VisualiserMapPoint,
} from '@/lib/utils/visualiser-map-points';

const LAYER_ORDER: VisualiserLayerId[] = [
  'hq',
  'branches',
  'competitors',
  'clients',
  'reps',
];

const LAYER_ICONS: Record<
  VisualiserLayerId,
  ComponentType<{ className?: string; style?: CSSProperties }>
> = {
  hq: Building2,
  branches: Store,
  competitors: Swords,
  clients: Handshake,
  reps: UserRound,
};

interface MapLayerTogglesProps {
  visibility: VisualiserLayerVisibility;
  counts: Record<VisualiserLayerId, number>;
  onChange: (layer: VisualiserLayerId, visible: boolean) => void;
  repPoints?: VisualiserMapPoint[];
  selectedRepUid?: number | null;
  onRepClick?: (point: VisualiserMapPoint) => void;
  className?: string;
}

function LayerIcon({
  layer,
  meta,
}: {
  layer: VisualiserLayerId;
  meta: (typeof LAYER_META)[VisualiserLayerId];
}) {
  const Icon = LAYER_ICONS[layer];
  return (
    <span
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-full',
        layer === 'hq' && 'ring-2 ring-green-500 ring-offset-1',
      )}
      style={{
        backgroundColor:
          layer === 'clients' || layer === 'reps'
            ? meta.color
            : `${meta.color}22`,
        color: layer === 'clients' || layer === 'reps' ? '#fff' : meta.color,
      }}
      aria-hidden
    >
      <Icon className="size-3" />
    </span>
  );
}

export function MapLayerToggles({
  visibility,
  counts,
  onChange,
  repPoints = [],
  selectedRepUid = null,
  onRepClick,
  className,
}: MapLayerTogglesProps) {
  const [repsExpanded, setRepsExpanded] = useState(false);
  const liveRepCount = countLivePlottedReps(repPoints);
  const repsMeta = LAYER_META.reps;
  const repsSwitchId = 'layer-reps';

  return (
    <div
      className={cn(
        'bg-background/95 w-full rounded-lg border p-3 shadow-sm backdrop-blur',
        className,
      )}
    >
      <p className="text-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
        Layers
      </p>
      <ul className="space-y-2">
        {LAYER_ORDER.map((layer) => {
          if (layer === 'reps') {
            return (
              <li key={layer}>
                <Collapsible open={repsExpanded} onOpenChange={setRepsExpanded}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-1">
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground flex size-6 shrink-0 items-center justify-center rounded-md transition-colors"
                          aria-expanded={repsExpanded}
                          aria-label={
                            repsExpanded
                              ? 'Collapse sales reps list'
                              : 'Expand sales reps list'
                          }
                        >
                          <ChevronDown
                            className={cn(
                              'size-3.5 transition-transform',
                              repsExpanded && 'rotate-180',
                            )}
                          />
                        </button>
                      </CollapsibleTrigger>
                      <LayerIcon layer={layer} meta={repsMeta} />
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="min-w-0 flex-1 truncate text-left text-sm font-normal"
                        >
                          {repsMeta.label}
                          <span className="text-muted-foreground ml-1 tabular-nums">
                            ({counts.reps})
                          </span>
                          {liveRepCount > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 ml-1 text-[10px] font-medium tabular-nums">
                              · {liveRepCount} live
                            </span>
                          ) : null}
                        </button>
                      </CollapsibleTrigger>
                    </div>
                    <Switch
                      id={repsSwitchId}
                      size="sm"
                      checked={visibility.reps}
                      onCheckedChange={(checked) => onChange('reps', checked)}
                      className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-500"
                    />
                  </div>
                  <CollapsibleContent className="mt-2 pl-7">
                    {onRepClick ? (
                      <PlottedSalesRepsList
                        reps={repPoints}
                        selectedRepUid={selectedRepUid}
                        onRepClick={onRepClick}
                        isLayerVisible={visibility.reps}
                      />
                    ) : null}
                  </CollapsibleContent>
                </Collapsible>
              </li>
            );
          }

          const meta = LAYER_META[layer];
          const id = `layer-${layer}`;
          return (
            <li key={layer} className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <LayerIcon layer={layer} meta={meta} />
                <Label htmlFor={id} className="truncate text-sm font-normal">
                  {meta.label}
                  <span className="text-muted-foreground ml-1 tabular-nums">
                    ({counts[layer]})
                  </span>
                </Label>
              </div>
              <Switch
                id={id}
                size="sm"
                checked={visibility[layer]}
                onCheckedChange={(checked) => onChange(layer, checked)}
                className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-500"
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

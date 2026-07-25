'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { VisualiserLayerVisibility } from '@/app/visualiser/hooks/use-visualiser-map-layers';
import {
  LAYER_META,
  type VisualiserLayerId,
} from '@/lib/utils/visualiser-map-points';

const LAYER_ORDER: VisualiserLayerId[] = [
  'hq',
  'branches',
  'competitors',
  'clients',
  'reps',
];

interface MapLayerTogglesProps {
  visibility: VisualiserLayerVisibility;
  counts: Record<VisualiserLayerId, number>;
  onChange: (layer: VisualiserLayerId, visible: boolean) => void;
  className?: string;
}

export function MapLayerToggles({
  visibility,
  counts,
  onChange,
  className,
}: MapLayerTogglesProps) {
  return (
    <div
      className={cn(
        'bg-background/95 absolute top-3 left-3 z-10 w-[min(100%-1.5rem,16rem)] rounded-lg border p-3 shadow-sm backdrop-blur',
        className,
      )}
    >
      <p className="text-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
        Layers
      </p>
      <ul className="space-y-2">
        {LAYER_ORDER.map((layer) => {
          const meta = LAYER_META[layer];
          const id = `layer-${layer}`;
          return (
            <li key={layer} className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: meta.color }}
                  aria-hidden
                />
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
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

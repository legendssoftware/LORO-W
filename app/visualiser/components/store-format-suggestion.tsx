'use client';

import {
  formatStoreFormatSizeRange,
  formatStoreFormatTurnoverRange,
  type BitDrywallStoreFormatSuggestion,
} from '@/lib/site-opportunity/bitdrywall-store-formats';

export function StoreFormatSuggestionCard({
  suggestion,
  recordedFloorSqm = null,
}: {
  suggestion: BitDrywallStoreFormatSuggestion;
  recordedFloorSqm?: number | null;
}) {
  return (
    <div className="space-y-1.5 text-[10px]">
      <p className="text-xs font-medium">Recommended BitDrywall store</p>
      <div className="divide-border overflow-hidden rounded-md border">
        <SuggestionRow
          label="Recommended format"
          value={suggestion.formatLabel}
        />
        <SuggestionRow
          label="Best office size"
          value={`${suggestion.suggestedSizeSqm.toLocaleString()} m²`}
        />
        <SuggestionRow
          label="Format size range"
          value={formatStoreFormatSizeRange(suggestion)}
        />
        <SuggestionRow
          label="Target monthly turnover"
          value={formatStoreFormatTurnoverRange(suggestion)}
        />
        {recordedFloorSqm != null ? (
          <SuggestionRow
            label="Recorded vs recommended"
            value={`${recordedFloorSqm.toLocaleString()} m² vs ${suggestion.suggestedSizeSqm.toLocaleString()} m²`}
          />
        ) : null}
      </div>
      {suggestion.belowRange ? (
        <p className="text-muted-foreground">
          Modelled turnover is below the Express band; suggesting the smallest
          format.
        </p>
      ) : null}
      {suggestion.aboveRange ? (
        <p className="text-muted-foreground">
          Modelled turnover exceeds the Hub band; suggesting the largest format.
        </p>
      ) : null}
    </div>
  );
}

function SuggestionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2 border-b px-1.5 py-1 last:border-0">
      <p className="text-muted-foreground">{label}</p>
      <p className="text-right text-xs font-semibold">{value}</p>
    </div>
  );
}

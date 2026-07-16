'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import { Search, X } from 'lucide-react';
import type { MapMarkerBase } from '@/api/types/map';
import {
  buildMarkerSearchIndex,
  searchMarkerIndex,
  type MarkerSearchEntry,
} from '@/lib/leaflet/build-marker-search-index';
import { cn } from '@/lib/utils';

const FLY_DURATION_S = 0.6;
const SEARCH_ZOOM = 14;

export interface MapMarkerSearchControlProps {
  markers: MapMarkerBase[];
  onSelectMarker?: (marker: MapMarkerBase) => void;
  className?: string;
}

export function MapMarkerSearchControl({
  markers,
  onSelectMarker,
  className,
}: MapMarkerSearchControlProps) {
  const map = useMap();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const index = useMemo(() => buildMarkerSearchIndex(markers), [markers]);
  const results = useMemo(
    () => searchMarkerIndex(index, query),
    [index, query]
  );

  const handleSelect = useCallback(
    (entry: MarkerSearchEntry) => {
      setQuery(entry.title.split(' · ')[0] ?? entry.title);
      setOpen(false);
      map.flyTo([entry.lat, entry.lng], Math.max(map.getZoom(), SEARCH_ZOOM), {
        duration: FLY_DURATION_S,
      });
      onSelectMarker?.(entry.marker);
    },
    [map, onSelectMarker]
  );

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'absolute top-2 left-12 z-[1000] w-[min(280px,calc(100%-6rem))]',
        className
      )}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          role="searchbox"
          aria-label="Search markers"
          autoComplete="off"
          value={query}
          placeholder="Search markers…"
          className="reports-viz-search-input h-8 w-full rounded-md border border-border bg-background/95 pl-8 pr-8 text-xs text-foreground shadow-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-ring"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {query ? (
          <button
            type="button"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
            onClick={() => {
              setQuery('');
              setOpen(false);
            }}
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
      {open && query.trim() && results.length > 0 ? (
        <ul
          className="mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-background/98 text-xs shadow-md backdrop-blur-sm"
          role="listbox"
        >
          {results.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                role="option"
                className="w-full px-3 py-2 text-left hover:bg-muted/80 truncate"
                onClick={() => handleSelect(entry)}
              >
                {entry.title}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {open && query.trim() && results.length === 0 ? (
        <p className="mt-1 rounded-md border border-border bg-background/98 px-3 py-2 text-xs text-muted-foreground shadow-md">
          No markers match &ldquo;{query}&rdquo;
        </p>
      ) : null}
    </div>
  );
}

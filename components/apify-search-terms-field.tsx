'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DEFAULT_BITDRYWALL_SEARCH_TERMS,
  EXTRA_BITDRYWALL_SEARCH_TERMS,
} from '@/lib/bitdrywall-search-terms';

export type ApifySearchTermsFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  searchTerms: string[];
  maxTerms: number;
};

function parseExistingKeys(raw: string): Set<string> {
  const keys = new Set<string>();
  for (const line of raw.split('\n')) {
    const t = line.trim().toLowerCase();
    if (t) keys.add(t);
  }
  return keys;
}

/**
 * Google Maps search terms textarea, prepopulated with BitDrywall construction
 * material queries. Users can edit lines or click remaining suggestions.
 */
export function ApifySearchTermsField({
  id,
  value,
  onChange,
  searchTerms,
  maxTerms,
}: ApifySearchTermsFieldProps) {
  const existing = parseExistingKeys(value);
  const suggestions = [...DEFAULT_BITDRYWALL_SEARCH_TERMS, ...EXTRA_BITDRYWALL_SEARCH_TERMS].filter(
    (term) => !existing.has(term.toLowerCase())
  );
  const canAdd = searchTerms.length < maxTerms;

  function addTerm(term: string) {
    if (!canAdd) return;
    const next = value.trim() ? `${value.trimEnd()}\n${term}` : term;
    onChange(next);
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Search terms (one per line)</Label>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={DEFAULT_BITDRYWALL_SEARCH_TERMS.join('\n')}
        className="min-h-20"
      />
      <span className="text-xs text-muted-foreground">
        {searchTerms.length}/{maxTerms} terms. Defaults are BitDrywall construction materials — add
        more if you need to.
      </span>
      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((term) => (
            <Button
              key={term}
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              disabled={!canAdd}
              onClick={() => addTerm(term)}
            >
              <Plus className="mr-1 size-3" aria-hidden />
              {term}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

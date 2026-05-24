'use client';

import type { ClaimGroup } from '@/api/types/claims';
import { useSubmitClaimGroupMutation } from '@/api/hooks/use-claims';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FolderOpen, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ClaimFoldersPanel({
  groups,
  isLoading,
  activeGroupUid,
  onSelectGroup,
}: {
  groups: ClaimGroup[];
  isLoading?: boolean;
  activeGroupUid?: string;
  onSelectGroup: (uid: string) => void;
}) {
  const submitMutation = useSubmitClaimGroupMutation();

  if (isLoading) {
    return (
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-20 min-w-[180px] animate-pulse rounded-lg bg-muted"
          />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <p className="mb-4 text-sm text-muted-foreground">
        No claim folders yet. Create a folder when submitting a claim to group
        multiple receipts before sending for approval.
      </p>
    );
  }

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-foreground">Claim folders</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => onSelectGroup('all')}
        >
          Show all claims
        </Button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {groups.map((g) => {
          const selected = activeGroupUid === String(g.uid);
          const isDraft = g.isDraft ?? g.submittedAt == null;
          return (
            <Card
              key={g.uid}
              className={cn(
                'min-w-[200px] shrink-0 cursor-pointer border transition-colors',
                selected
                  ? 'border-violet-400 bg-violet-50/60'
                  : 'border-gray-200 bg-white hover:border-violet-200'
              )}
              onClick={() => onSelectGroup(String(g.uid))}
            >
              <CardContent className="flex flex-col gap-2 p-3">
                <div className="flex items-start gap-2">
                  <FolderOpen className="mt-0.5 size-4 shrink-0 text-violet-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{g.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {g.claimCount ?? 0} claim
                      {(g.claimCount ?? 0) === 1 ? '' : 's'}
                    </p>
                  </div>
                  {isDraft ? (
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      Draft
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      Submitted
                    </Badge>
                  )}
                </div>
                {isDraft && (g.claimCount ?? 0) > 0 ? (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 w-full gap-1 bg-violet-600 text-xs text-white hover:bg-violet-700"
                    disabled={submitMutation.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      submitMutation.mutate(g.uid);
                    }}
                  >
                    {submitMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Send className="size-3.5" />
                    )}
                    Submit folder
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import type { ClaimGroup, ClaimGroupTotal } from '@/api/types/claims';
import {
  useCreateClaimGroupMutation,
  useSubmitClaimGroupMutation,
} from '@/api/hooks/use-claims';
import { ClaimFolderActions } from '@/app/claims/components/claim-folder-actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatZarAmount } from '@/lib/utils/zar-fx';
import { FolderOpen, Loader2, Plus, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ClaimFoldersPanel({
  groups,
  byGroup,
  isLoading,
  activeGroupUid,
  onSelectGroup,
}: {
  groups: ClaimGroup[];
  byGroup?: ClaimGroupTotal[];
  isLoading?: boolean;
  activeGroupUid?: string;
  onSelectGroup: (uid: string) => void;
}) {
  const submitMutation = useSubmitClaimGroupMutation();
  const createMutation = useCreateClaimGroupMutation();
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderTitle, setNewFolderTitle] = useState('');

  function handleCreateFolder() {
    const title = newFolderTitle.trim();
    if (!title) return;
    createMutation.mutate(
      { title, kind: 'other' },
      {
        onSuccess: () => {
          setShowNewFolder(false);
          setNewFolderTitle('');
        },
      }
    );
  }

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

  return (
    <div className="mb-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-foreground">Claim folders</h2>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => setShowNewFolder((open) => !open)}
          >
            <Plus className="size-3.5" />
            New folder
          </Button>
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
      </div>
      {showNewFolder ? (
        <div className="mb-3 flex max-w-md gap-2">
          <Input
            value={newFolderTitle}
            onChange={(event) => setNewFolderTitle(event.target.value)}
            placeholder="Folder name"
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleCreateFolder();
            }}
          />
          <Button
            type="button"
            size="sm"
            className="bg-violet-600 text-white hover:bg-violet-700"
            disabled={createMutation.isPending || !newFolderTitle.trim()}
            onClick={handleCreateFolder}
          >
            {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Create'}
          </Button>
        </div>
      ) : null}
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No claim folders yet. Create a folder to group receipts before sending them for approval.
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {groups.map((g) => {
            const selected = activeGroupUid === String(g.uid);
            const isDraft = g.isDraft ?? g.submittedAt == null;
            const totals = byGroup?.find((row) => row.claimGroupUid === g.uid);
            return (
              <Card
                key={g.uid}
                className={cn(
                  'min-w-[220px] shrink-0 cursor-pointer border transition-colors',
                  selected
                    ? 'border-violet-500 bg-background ring-1 ring-violet-500/40'
                    : 'border-border bg-background hover:border-violet-300 dark:hover:border-violet-600'
                )}
                onClick={() => onSelectGroup(String(g.uid))}
              >
                <CardContent className="flex flex-col gap-2 p-3">
                  <div className="flex items-start gap-2">
                    <FolderOpen className="mt-0.5 size-4 shrink-0 text-violet-600" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{g.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {totals?.count ?? g.claimCount ?? 0} claim
                        {(totals?.count ?? g.claimCount ?? 0) === 1 ? '' : 's'}
                        {totals ? ` · ${formatZarAmount(totals.totalZar)}` : ''}
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
                  <div className="flex flex-wrap gap-1" onClick={(event) => event.stopPropagation()}>
                    <ClaimFolderActions
                      uid={g.uid}
                      title={g.title}
                      onDeleted={() => {
                        if (selected) onSelectGroup('all');
                      }}
                    />
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
      )}
    </div>
  );
}

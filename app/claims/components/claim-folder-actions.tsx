'use client';

import { useEffect, useState } from 'react';
import {
  useDeleteClaimGroupMutation,
  useUpdateClaimGroupMutation,
} from '@/api/hooks/use-claims';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2 } from 'lucide-react';

/** Rename and delete controls for one claim folder. */
export function ClaimFolderActions({
  uid,
  title,
  onDeleted,
}: {
  uid: number;
  title: string;
  onDeleted?: () => void;
}) {
  const updateMutation = useUpdateClaimGroupMutation();
  const deleteMutation = useDeleteClaimGroupMutation();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(title);

  useEffect(() => {
    if (renameOpen) setName(title);
  }, [renameOpen, title]);

  function handleRename() {
    const next = name.trim();
    if (!next || next === title) {
      setRenameOpen(false);
      return;
    }
    updateMutation.mutate(
      { uid, title: next },
      { onSuccess: () => setRenameOpen(false) }
    );
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 gap-1 px-2 text-xs"
        onClick={(event) => {
          event.stopPropagation();
          setRenameOpen(true);
        }}
      >
        <Pencil className="size-3.5" />
        Rename
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 gap-1 px-2 text-xs text-destructive hover:text-destructive"
        onClick={(event) => {
          event.stopPropagation();
          setDeleteOpen(true);
        }}
      >
        <Trash2 className="size-3.5" />
        Delete
      </Button>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent
          onClick={(event) => event.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Rename folder</DialogTitle>
          </DialogHeader>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Folder name"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleRename();
            }}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-violet-600 text-white hover:bg-violet-700"
              disabled={updateMutation.isPending || !name.trim()}
              onClick={handleRename}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent onClick={(event) => event.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              Claims in “{title}” stay in the list and move out of this folder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteMutation.mutate(uid, {
                  onSuccess: () => {
                    setDeleteOpen(false);
                    onDeleted?.();
                  },
                })
              }
            >
              Delete folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

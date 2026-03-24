'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { format } from 'date-fns';
import { Loader2, Mic, Paperclip, Send } from 'lucide-react';
import toast from 'react-hot-toast';

import { useApiClient } from '@/api/hooks/use-api-client';
import { useCreateInteractionMutation, useInteractionsByLead } from '@/api/hooks/use-interactions';
import { uploadInteractionAttachment } from '@/api/endpoints/interactions';
import type { InteractionListItem, InteractionType } from '@/api/types/interactions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  fileLabelFromUrl,
  inferAttachmentPresentation,
  type AttachmentPresentation,
} from '@/lib/utils/interaction-attachments';

export interface LeadTeamChatProps {
  leadRef: number;
}

function senderLabel(item: InteractionListItem): string {
  const u = item.createdBy;
  const name = [u?.name, u?.surname].filter(Boolean).join(' ').trim();
  if (name) return name;
  const uname = u?.username?.trim();
  if (uname) return uname;
  if (u?.email) return u.email;
  return 'Unknown';
}

function senderEmail(item: InteractionListItem): string | undefined {
  return item.createdBy?.email ?? undefined;
}

function avatarSrc(item: InteractionListItem): string | undefined {
  const u = item.createdBy;
  const url = u?.photoURL || u?.avatar;
  return url?.trim() || undefined;
}

function initials(item: InteractionListItem): string {
  const u = item.createdBy;
  const n = u?.name?.[0] ?? '';
  const s = u?.surname?.[0] ?? '';
  const pair = `${n}${s}`.trim();
  if (pair) return pair.toUpperCase();
  const em = u?.email?.[0];
  return em ? em.toUpperCase() : '?';
}

function isOutgoing(item: InteractionListItem, clerkUserId: string | null | undefined): boolean {
  if (!clerkUserId) return false;
  return (
    item.createdByClerkUserId === clerkUserId || item.createdBy?.clerkUserId === clerkUserId
  );
}

/** Signed-in Clerk profile for fallback when API has no nested user yet. */
type MineProfile = {
  name: string;
  email?: string;
  imageUrl?: string;
};

function displayName(item: InteractionListItem, isMine: boolean, mine: MineProfile | null): string {
  const base = senderLabel(item);
  if (base !== 'Unknown') return base;
  if (isMine && mine?.name) return mine.name;
  return 'Unknown';
}

function displayEmail(item: InteractionListItem, isMine: boolean, mine: MineProfile | null): string | undefined {
  const e = senderEmail(item);
  if (e) return e;
  if (isMine && mine?.email) return mine.email;
  return undefined;
}

function displayAvatarSrc(item: InteractionListItem, isMine: boolean, mine: MineProfile | null): string | undefined {
  const a = avatarSrc(item);
  if (a) return a;
  if (isMine && mine?.imageUrl) return mine.imageUrl;
  return undefined;
}

function displayInitials(item: InteractionListItem, isMine: boolean, mine: MineProfile | null): string {
  const i = initials(item);
  if (i !== '?') return i;
  if (isMine && mine?.name) {
    const parts = mine.name.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? '';
    const b = parts[1]?.[0] ?? '';
    const pair = `${a}${b}`.trim();
    if (pair) return pair.toUpperCase();
    if (mine.email?.[0]) return mine.email[0].toUpperCase();
  }
  return '?';
}

function AttachmentContent({
  url,
  kind,
}: {
  url: string;
  kind: AttachmentPresentation;
}) {
  const label = fileLabelFromUrl(url);
  if (kind === 'image') {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block max-w-[min(100%,280px)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="max-h-48 w-full rounded-md object-contain" loading="lazy" />
      </a>
    );
  }
  if (kind === 'audio') {
    return (
      <audio controls className="w-full max-w-[min(100%,280px)]" preload="metadata">
        <source src={url} />
      </audio>
    );
  }
  if (kind === 'video') {
    return (
      <video controls className="max-h-48 max-w-[min(100%,280px)] rounded-md" preload="metadata">
        <source src={url} />
      </video>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm font-medium underline underline-offset-2"
    >
      {label}
    </a>
  );
}

function MessageRow({
  item,
  isMine,
  mine,
}: {
  item: InteractionListItem;
  isMine: boolean;
  mine: MineProfile | null;
}) {
  const time = format(new Date(item.createdAt), 'MMM d, yyyy h:mm a');
  const src = displayAvatarSrc(item, isMine, mine);
  const label = displayName(item, isMine, mine);
  const email = displayEmail(item, isMine, mine);
  const fall = displayInitials(item, isMine, mine);
  const bubble = (
    <div
      className={cn(
        'max-w-[min(100%,85%)] rounded-2xl px-3 py-2 text-sm shadow-sm',
        isMine
          ? 'bg-primary text-primary-foreground rounded-br-md'
          : 'rounded-bl-md border bg-card text-card-foreground'
      )}
    >
      {item.attachmentUrl?.trim() ? (
        <div className="space-y-2">
          <AttachmentContent
            url={item.attachmentUrl.trim()}
            kind={inferAttachmentPresentation(item.attachmentUrl.trim())}
          />
          {item.message.trim() && item.message.trim() !== 'Attachment' ? (
            <p className="whitespace-pre-wrap break-words">{item.message}</p>
          ) : null}
        </div>
      ) : (
        <p className="whitespace-pre-wrap break-words">{item.message}</p>
      )}
      <p
        className={cn(
          'mt-1.5 text-[10px] tabular-nums',
          isMine ? 'text-primary-foreground/80' : 'text-muted-foreground'
        )}
      >
        {time}
      </p>
    </div>
  );

  const meta = (
    <div className={cn('flex max-w-[200px] flex-col gap-0.5', isMine ? 'items-end' : 'items-start')}>
      <Avatar size="sm" className="size-8">
        {src ? <AvatarImage src={src} alt={label} /> : null}
        <AvatarFallback>{fall}</AvatarFallback>
      </Avatar>
      <span
        className={cn(
          'max-w-full truncate text-xs font-semibold leading-tight',
          isMine ? 'text-end' : 'text-start'
        )}
      >
        {label}
      </span>
      {email ? (
        <span
          className={cn(
            'max-w-full truncate text-[10px] text-muted-foreground',
            isMine ? 'text-end' : 'text-start'
          )}
        >
          {email}
        </span>
      ) : null}
    </div>
  );

  if (isMine) {
    return (
      <div className="flex justify-end gap-2">
        <div className="flex min-w-0 flex-col items-end gap-1">{bubble}</div>
        {meta}
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-2">
      {meta}
      <div className="flex min-w-0 flex-col gap-1">{bubble}</div>
    </div>
  );
}

function interactionTypeForAttachment(
  url: string,
  hasText: boolean
): InteractionType {
  const kind = inferAttachmentPresentation(url);
  if (!hasText && kind === 'file') return 'document';
  return 'message';
}

export function LeadTeamChat({ leadRef }: LeadTeamChatProps) {
  const { userId } = useAuth();
  const { user: clerkUser } = useUser();
  const mineProfile = useMemo((): MineProfile | null => {
    if (!clerkUser) return null;
    const name =
      clerkUser.fullName?.trim() ||
      clerkUser.primaryEmailAddress?.emailAddress ||
      '';
    if (!name) return null;
    return {
      name,
      email: clerkUser.primaryEmailAddress?.emailAddress,
      imageUrl: clerkUser.imageUrl || undefined,
    };
  }, [clerkUser]);
  const client = useApiClient();
  const listQuery = useInteractionsByLead(leadRef);
  const createMutation = useCreateInteractionMutation();
  const [draft, setDraft] = useState('');
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const items = listQuery.data?.data ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items.length, listQuery.isFetching]);

  async function onPickFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadInteractionAttachment(client, file);
      setPendingUrl(res.data.publicUrl);
      setPendingName(res.data.fileName);
      toast.success('File ready to send');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (audioInputRef.current) audioInputRef.current.value = '';
    }
  }

  async function handleSend() {
    const text = draft.trim();
    if (!text && !pendingUrl) {
      toast.error('Type a message or attach a file');
      return;
    }
    const message = text || 'Attachment';
    const attachmentUrl = pendingUrl ?? undefined;
    const hasText = text.length > 0;
    const type = attachmentUrl
      ? interactionTypeForAttachment(attachmentUrl, hasText)
      : 'message';

    try {
      await createMutation.mutateAsync({
        message,
        leadUid: leadRef,
        attachmentUrl,
        type,
      });
      setDraft('');
      setPendingUrl(null);
      setPendingName(null);
    } catch {
      toast.error('Could not send message');
    }
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div>
        <h3 className="text-sm font-semibold">Team chat</h3>
        <p className="text-xs text-muted-foreground">Visible to lead owner and assignees</p>
      </div>

      <div className="max-h-[min(420px,50vh)] space-y-3 overflow-y-auto rounded-md border bg-background/80 p-3">
        {listQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : listQuery.isError ? (
          <p className="text-center text-sm text-destructive">Could not load messages.</p>
        ) : items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          items.map((item) => (
            <MessageRow
              key={item.uid}
              item={item}
              isMine={isOutgoing(item, userId ?? undefined)}
              mine={mineProfile}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {pendingUrl ? (
        <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-2 py-1.5 text-xs">
          <span className="truncate">
            Ready: {pendingName ?? fileLabelFromUrl(pendingUrl)}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={() => { setPendingUrl(null); setPendingName(null); }}>
            Remove
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
        />
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
          className="hidden"
          onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
        />
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            disabled={uploading || createMutation.isPending}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach file"
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            disabled={uploading || createMutation.isPending}
            onClick={() => audioInputRef.current?.click()}
            aria-label="Attach audio"
          >
            <Mic className="size-4" />
          </Button>
        </div>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          className="min-h-10 flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
        />
        <Button
          type="button"
          onClick={() => void handleSend()}
          disabled={uploading || createMutation.isPending}
          className="gap-2 shrink-0"
        >
          {createMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          Send
        </Button>
      </div>
    </div>
  );
}

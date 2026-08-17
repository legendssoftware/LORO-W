'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  AudioLines,
  Building2,
  Clock,
  FileAudio,
  Fingerprint,
  GitBranch,
  Hash,
  IdCard,
  Loader2,
  MapPin,
  Phone,
  RotateCcw,
  Star,
  Timer,
  UserRound,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  useCall,
  useEnsureCallAudioMutation,
  useRetryCallTranscriptMutation,
  useSessionSync,
  useUsers,
} from '@/api/hooks';
import { getBranchDisplayLabel } from '@/api/types/branch';
import type {
  CallRecordingDetail,
  CallRecordingListItem,
  DialogueTurn,
  TranscriptStatus,
} from '@/api/types/calls';
import type { UserListItem } from '@/api/endpoints/user';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import {
  Message,
  MessageContent,
  MessageHeader,
} from '@/components/ui/message';
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller';
import {
  DetailDialogCloseButton,
  DetailFieldRow,
  DetailSectionHeading,
  LEAD_DETAIL_DIALOG_CONTENT_CLASS,
} from '@/components/detail-dialog/detail-dialog-primitives';
import { cn } from '@/lib/utils';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import type { CallPartyMatchIndex } from '@/lib/utils/call-party-match';
import {
  matchAgentParty,
  matchClientParty,
  matchNamedParty,
  uniqueMatchedBranches,
} from '@/lib/utils/call-party-match';
import { ORIGIN_LABEL, normalizeOrigin, originVariant } from '../origin-badge';
import { CallPartyLabel } from './call-party-label';
import {
  STATUS_LABEL,
  callDirectionIcon,
  callDirectionLabel,
  displayCallMeta,
  formatCallDuration,
  isRetryableTranscriptStatus,
  normalizeCallDirection,
  transcriptStatusVariant,
} from '../call-display';

const RETRY_LEVELS = new Set(['admin', 'owner', 'manager', 'developer']);
const CALL_DETAIL_FIELD_GRID_CLASS =
  'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3';

type CallDetailDialogProps = {
  uid: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fallback?: CallRecordingListItem | null;
  matchIndex: CallPartyMatchIndex;
};

export function CallDetailDialog({
  uid,
  open,
  onOpenChange,
  fallback,
  matchIndex,
}: CallDetailDialogProps) {
  const { backendUserData } = useSessionSync();
  const { data, isLoading, isError, refetch } = useCall(uid, {
    enabled: open && Boolean(uid),
  });
  const retryMutation = useRetryCallTranscriptMutation();
  const call = data?.call;
  const headerRow: CallRecordingListItem | CallRecordingDetail | undefined | null =
    call ?? fallback;
  const accessLevel = String(backendUserData?.accessLevel ?? '').toLowerCase();
  const canRetry = RETRY_LEVELS.has(accessLevel);
  const status: TranscriptStatus | undefined = call?.transcriptStatus ?? fallback?.transcriptStatus;
  const showRetry =
    canRetry && Boolean(uid) && isRetryableTranscriptStatus(status);
  const origin = normalizeOrigin(headerRow?.origin);
  const direction = normalizeCallDirection(headerRow?.callType);
  const DirectionIcon = callDirectionIcon(direction);

  const fromParty = useMemo(
    () =>
      headerRow
        ? matchNamedParty(headerRow.fromName, headerRow.fromNumber, matchIndex)
        : null,
    [headerRow, matchIndex],
  );
  const toParty = useMemo(
    () =>
      headerRow
        ? matchNamedParty(headerRow.toName, headerRow.toNumber, matchIndex)
        : null,
    [headerRow, matchIndex],
  );
  const agentParty = useMemo(
    () => (headerRow ? matchAgentParty(headerRow, matchIndex) : null),
    [headerRow, matchIndex],
  );
  const clientParty = useMemo(
    () => (headerRow ? matchClientParty(headerRow, matchIndex) : null),
    [headerRow, matchIndex],
  );
  const matchedBranches = useMemo(
    () => uniqueMatchedBranches([fromParty, toParty, agentParty, clientParty]),
    [fromParty, toParty, agentParty, clientParty],
  );

  const fromBranchId = matchedBranches[0]?.uid ?? null;
  const toBranchId =
    matchedBranches[1] && matchedBranches[1].uid !== fromBranchId
      ? matchedBranches[1].uid
      : null;
  const fromStaffQuery = useUsers({
    branchId: fromBranchId ?? undefined,
    limit: 100,
    enabled: open && fromBranchId != null,
  });
  const toStaffQuery = useUsers({
    branchId: toBranchId ?? undefined,
    limit: 100,
    enabled: open && toBranchId != null,
  });

  const whenLabel = headerRow?.startedAt
    ? format(new Date(headerRow.startedAt), 'dd MMM yyyy HH:mm')
    : 'Unknown time';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(LEAD_DETAIL_DIALOG_CONTENT_CLASS, 'flex flex-col')}
      >
        <DetailDialogCloseButton />
        <DialogHeader>
          <DialogTitle>Call dialogue</DialogTitle>
          <DialogDescription className="sr-only">
            {whenLabel} {headerRow?.fromName || headerRow?.fromNumber || 'unknown'} to{' '}
            {headerRow?.toName || headerRow?.toNumber || 'unknown'}
          </DialogDescription>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5 shrink-0" aria-hidden />
              {whenLabel}
            </span>
            {fromParty ? <CallPartyLabel party={fromParty} /> : null}
            <span aria-hidden>→</span>
            {toParty ? <CallPartyLabel party={toParty} /> : null}
            <span className="font-mono text-xs">
              {headerRow?.fromNumber || '—'} → {headerRow?.toNumber || '—'}
            </span>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <CallAudioPlayer
            uid={uid}
            open={open}
            audioUrl={call?.audioUrl}
            isDetailLoading={isLoading}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={originVariant(origin)}>{ORIGIN_LABEL[origin]}</Badge>
            <span className="inline-flex items-center gap-1.5 text-sm">
              <DirectionIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              {callDirectionLabel(direction, headerRow?.callType)}
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm tabular-nums">
              <Timer className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              {formatCallDuration(headerRow?.durationSeconds)}
            </span>
            {status ? (
              <Badge variant={transcriptStatusVariant(status)}>{STATUS_LABEL[status]}</Badge>
            ) : null}
            {showRetry ? (
              <Button
                type="button"
                size="sm"
                variant="default"
                className="gap-1.5"
                disabled={retryMutation.isPending}
                onClick={() => {
                  if (!uid) return;
                  retryMutation.mutate(uid, {
                    onSuccess: () => toast.success('Transcription queued'),
                    onError: () => toast.error('Could not queue transcription'),
                  });
                }}
              >
                {retryMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <RotateCcw className="size-4" aria-hidden />
                )}
                {retryMutation.isPending ? 'Queueing…' : 'Retry transcript'}
              </Button>
            ) : null}
          </div>

          {partyLinks(headerRow)}

          {isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading transcript…
            </div>
          ) : isError ? (
            <div className="flex items-center gap-2">
              <p className="text-sm text-destructive">Could not load this recording.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <CallMetadataGrid
                row={headerRow}
                detail={call}
                origin={origin}
                fromParty={fromParty}
                toParty={toParty}
                agentParty={agentParty}
                clientParty={clientParty}
              />

              <BranchStaffSection
                branches={matchedBranches}
                fromStaff={fromStaffQuery.data ?? []}
                toStaff={toStaffQuery.data ?? []}
                fromLoading={fromStaffQuery.isLoading}
                toLoading={toStaffQuery.isLoading}
                splitBranchId={toBranchId}
              />

              <DialogueThread
                turns={call?.dialogue ?? []}
                status={status}
                error={call?.transcriptError ?? headerRow?.transcriptError}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Prominent playback control. Uses a signed URL from GET detail, or downloads PBX audio on demand.
 */
function CallAudioPlayer({
  uid,
  open,
  audioUrl,
  isDetailLoading,
}: {
  uid: string | null;
  open: boolean;
  audioUrl: string | null | undefined;
  isDetailLoading: boolean;
}) {
  const { mutate: ensureAudio, isPending: isEnsuring } = useEnsureCallAudioMutation();
  const attemptedUidRef = useRef<string | null>(null);
  const [ensureError, setEnsureError] = useState<string | null>(null);

  useEffect(() => {
    attemptedUidRef.current = null;
    setEnsureError(null);
  }, [uid, open]);

  useEffect(() => {
    if (!open || !uid || isDetailLoading || audioUrl) return;
    if (attemptedUidRef.current === uid) return;
    attemptedUidRef.current = uid;
    ensureAudio(uid, {
      onError: (error) => {
        setEnsureError(getQueryErrorMessage(error, 'Could not load call audio.'));
      },
    });
  }, [open, uid, isDetailLoading, audioUrl, ensureAudio]);

  function retryEnsure() {
    if (!uid) return;
    attemptedUidRef.current = uid;
    setEnsureError(null);
    ensureAudio(uid, {
      onError: (error) => {
        setEnsureError(getQueryErrorMessage(error, 'Could not load call audio.'));
      },
    });
  }

  const isLoadingAudio = isDetailLoading || (isEnsuring && !audioUrl);

  return (
    <div className="rounded-md border p-3">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
        <AudioLines className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        Recording
      </p>
      {audioUrl ? (
        <audio controls className="w-full" src={audioUrl} preload="metadata">
          <track kind="captions" />
        </audio>
      ) : isLoadingAudio ? (
        <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading recording…
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {ensureError || 'No audio file stored for this call yet.'}
          </p>
          {uid ? (
            <Button type="button" variant="outline" size="sm" onClick={retryEnsure}>
              Retry
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function CallMetadataGrid({
  row,
  detail,
  origin,
  fromParty,
  toParty,
  agentParty,
  clientParty,
}: {
  row: CallRecordingListItem | CallRecordingDetail | undefined | null;
  detail: CallRecordingDetail | undefined;
  origin: ReturnType<typeof normalizeOrigin>;
  fromParty: ReturnType<typeof matchNamedParty> | null;
  toParty: ReturnType<typeof matchNamedParty> | null;
  agentParty: ReturnType<typeof matchAgentParty> | null;
  clientParty: ReturnType<typeof matchClientParty> | null;
}) {
  if (!row) return null;
  const srcExt = detail?.srcExt ?? null;
  const dstExt = detail?.dstExt ?? null;
  const callId = detail?.callId ?? null;
  const recordingId = detail?.recordingId ?? null;

  return (
    <div className="space-y-4">
      <div>
        <DetailSectionHeading title="Call" icon={Phone} />
        <div className={CALL_DETAIL_FIELD_GRID_CLASS}>
          <DetailFieldRow
            label="When"
            icon={Clock}
            value={
              row.startedAt ? format(new Date(row.startedAt), 'dd MMM yyyy HH:mm') : '—'
            }
          />
          <DetailFieldRow
            label="Duration"
            icon={Timer}
            value={formatCallDuration(row.durationSeconds)}
          />
          <DetailFieldRow
            label="Direction"
            icon={callDirectionIcon(normalizeCallDirection(row.callType))}
            value={callDirectionLabel(normalizeCallDirection(row.callType), row.callType)}
          />
          <DetailFieldRow label="Origin" icon={Phone} value={ORIGIN_LABEL[origin]} />
        </div>
      </div>

      <div>
        <DetailSectionHeading title="Parties" icon={UserRound} />
        <div className={CALL_DETAIL_FIELD_GRID_CLASS}>
          <DetailFieldRow
            label="From"
            icon={GitBranch}
            value={fromParty ? <CallPartyLabel party={fromParty} /> : '—'}
          />
          <DetailFieldRow
            label="To"
            icon={GitBranch}
            value={toParty ? <CallPartyLabel party={toParty} /> : '—'}
          />
          <DetailFieldRow
            label="Agent"
            icon={UserRound}
            value={agentParty ? <CallPartyLabel party={agentParty} /> : '—'}
          />
          <DetailFieldRow
            label="Client"
            icon={Building2}
            value={clientParty ? <CallPartyLabel party={clientParty} /> : '—'}
          />
          <DetailFieldRow
            label="Numbers"
            icon={Hash}
            value={
              <span className="font-mono text-xs">
                {displayCallMeta(row.fromNumber)} → {displayCallMeta(row.toNumber)}
              </span>
            }
          />
          <DetailFieldRow
            label="Owner"
            icon={UserRound}
            value={displayCallMeta(row.ownerName ?? row.ownerClerkUserId)}
          />
        </div>
      </div>

      <div>
        <DetailSectionHeading title="PBX identifiers" icon={Fingerprint} />
        <div className={CALL_DETAIL_FIELD_GRID_CLASS}>
          <DetailFieldRow label="CDR id" icon={Hash} value={displayCallMeta(row.cdrUid)} />
          <DetailFieldRow
            label="PBX extension"
            icon={Hash}
            value={displayCallMeta(row.pbxExtension)}
          />
          <DetailFieldRow label="Source ext" icon={Hash} value={displayCallMeta(srcExt)} />
          <DetailFieldRow label="Dest ext" icon={Hash} value={displayCallMeta(dstExt)} />
          <DetailFieldRow label="Call id" icon={IdCard} value={displayCallMeta(callId)} />
          <DetailFieldRow
            label="Recording id"
            icon={FileAudio}
            value={displayCallMeta(recordingId)}
          />
          <DetailFieldRow
            label="Local call id"
            icon={IdCard}
            value={displayCallMeta(detail?.localCallId)}
          />
          <DetailFieldRow
            label="Company caller ID"
            icon={Phone}
            value={
              row.companyCallerId
                ? `Client saw ${row.companyCallerId}`
                : 'Not stored on this call yet'
            }
          />
        </div>
      </div>

      <div>
        <DetailSectionHeading title="Transcript & audio" icon={FileAudio} />
        <div className={CALL_DETAIL_FIELD_GRID_CLASS}>
          <DetailFieldRow
            label="Status"
            icon={FileAudio}
            value={STATUS_LABEL[row.transcriptStatus]}
          />
          <DetailFieldRow
            label="Has audio"
            icon={AudioLines}
            value={row.hasAudio || detail?.audioUrl ? 'Yes' : 'No'}
          />
          <DetailFieldRow
            label="File name"
            icon={FileAudio}
            value={displayCallMeta(detail?.fileName)}
          />
          <DetailFieldRow
            label="Score"
            icon={Star}
            value={displayCallMeta(detail?.scoreOverall)}
          />
          <DetailFieldRow
            label="Check-in"
            icon={MapPin}
            value={displayCallMeta(detail?.checkInUid)}
          />
          <DetailFieldRow
            label="Error"
            icon={FileAudio}
            value={displayCallMeta(row.transcriptError)}
          />
        </div>
      </div>
    </div>
  );
}

function BranchStaffSection({
  branches,
  fromStaff,
  toStaff,
  fromLoading,
  toLoading,
  splitBranchId,
}: {
  branches: ReturnType<typeof uniqueMatchedBranches>;
  fromStaff: UserListItem[];
  toStaff: UserListItem[];
  fromLoading: boolean;
  toLoading: boolean;
  splitBranchId: number | null;
}) {
  if (branches.length === 0) return null;

  return (
    <div>
      <DetailSectionHeading title="People at branch" icon={Users} />
      <div className="space-y-3">
        {branches.map((branch, index) => {
          const staff = index === 0 ? fromStaff : toStaff;
          const loading = index === 0 ? fromLoading : toLoading;
          if (index > 0 && splitBranchId == null) return null;
          return (
            <div key={branch.uid} className="rounded-md border p-3">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400">
                <GitBranch className="size-3.5 shrink-0" aria-hidden />
                {getBranchDisplayLabel(branch) || branch.name || `Branch ${branch.uid}`}
              </p>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading people…</p>
              ) : staff.length === 0 ? (
                <p className="text-sm text-muted-foreground">No people listed at this branch.</p>
              ) : (
                <ul className="space-y-1">
                  {staff.map((user) => {
                    const name =
                      [user.name, user.surname].filter(Boolean).join(' ').trim() ||
                      `User ${user.uid}`;
                    const ext =
                      typeof user.pbxExtension === 'string' && user.pbxExtension.trim()
                        ? user.pbxExtension.trim()
                        : null;
                    return (
                      <li
                        key={user.uid}
                        className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400"
                      >
                        <UserRound className="size-3.5 shrink-0" aria-hidden />
                        <span>{name}</span>
                        {ext ? (
                          <span className="font-mono text-xs text-muted-foreground">ext {ext}</span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DialogueThread({
  turns,
  status,
  error,
}: {
  turns: DialogueTurn[];
  status?: TranscriptStatus;
  error?: string | null;
}) {
  if (status === 'processing' || status === 'pending') {
    return <p className="text-sm text-muted-foreground">Transcript is still being generated.</p>;
  }
  if (status === 'failed') {
    return (
      <p className="text-sm text-destructive">
        Transcription failed{error ? `: ${error}` : '.'}
      </p>
    );
  }
  if (status === 'skipped') {
    return (
      <p className="text-sm text-muted-foreground">
        Transcription skipped{error ? `: ${error}` : '.'}
      </p>
    );
  }
  if (!turns.length) {
    return <p className="text-sm text-muted-foreground">No dialogue turns yet.</p>;
  }

  return (
    <MessageScrollerProvider>
      <MessageScroller className="max-h-[50vh] rounded-md border">
        <MessageScrollerViewport>
          <MessageScrollerContent className="gap-3 p-3">
            {turns.map((turn, index) => {
              const isAgent = turn.speakerRole === 'agent';
              return (
                <MessageScrollerItem key={`${turn.speaker}-${index}`}>
                  <Message align={isAgent ? 'end' : 'start'}>
                    <MessageContent>
                      <MessageHeader>
                        <span className="text-xs font-medium">{turn.speaker}</span>
                      </MessageHeader>
                      <Bubble>
                        <BubbleContent>{turn.text}</BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              );
            })}
          </MessageScrollerContent>
        </MessageScrollerViewport>
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

function partyLinks(row: CallRecordingListItem | undefined | null) {
  if (!row?.client && !row?.lead) return null;
  return (
    <div className="flex flex-wrap gap-3 text-sm">
      {row.client ? (
        <Link
          href={`/clients/${row.client.uid}`}
          className="text-primary underline-offset-4 hover:underline"
        >
          Client: {row.client.name || 'Open client'}
        </Link>
      ) : null}
      {row.lead ? (
        <Link href="/leads" className="text-primary underline-offset-4 hover:underline">
          Lead: {row.lead.name || 'Open leads'}
        </Link>
      ) : null}
    </div>
  );
}

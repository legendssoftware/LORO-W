'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import type { LeadListItem } from '@/api/types/leads';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DetailDialogCloseButton,
  DetailFieldRow,
  DetailSectionHeading,
  DETAIL_DIALOG_CONTENT_CLASS,
  DETAIL_DIALOG_SMALL_CONTENT_CLASS,
  DETAIL_FIELD_GRID_CLASS,
} from '@/components/detail-dialog/detail-dialog-primitives';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  useUpdateLeadMutation,
  useDeleteLeadMutation,
  useReactivateLeadMutation,
  useReassignLeadsMutation,
  useEngageDraftMutation,
  useSendLeadEngageMutation,
  useInteractionsByLead,
  useCreateInteractionMutation,
  useUsers,
  useLead,
  useApiClient,
} from '@/api/hooks';
import { uploadFile } from '@/api/endpoints/upload';
import type { UpdateLeadPayload } from '@/api/types/leads';
import {
  LeadFormBody,
  createDefaultLeadForm,
  DEFAULT_LEAD_FORM_COLLAPSED,
  formStateToUpdatePayload,
  leadRecordToLeadForm,
  type LeadFormCollapsedKey,
  type LeadFormCollapsedState,
  type LeadFormState,
} from './lead-form-shared';
import {
  LEAD_STATUS_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  LEAD_TEMPERATURE_OPTIONS,
  LEAD_PRIORITY_OPTIONS,
} from '@/lib/lead-form-utils';
import { Loader2Icon } from '@/lib/icons';
import {
  Activity,
  ArrowRightLeft,
  BadgeCheck,
  Banknote,
  Building2,
  Check,
  CalendarCheck2,
  CalendarClock,
  CalendarPlus,
  ClipboardList,
  Hash,
  Layers,
  Clock,
  Contact,
  ListOrdered,
  Mail,
  MessageCircle,
  MessageSquare,
  Paperclip,
  Pencil,
  Phone,
  PhoneForwarded,
  RefreshCw,
  Smartphone,
  Send,
  Share2,
  StickyNote,
  Tag,
  Target,
  Thermometer,
  Timer,
  TrendingUp,
  User,
  UserCircle,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';

function getOptionLabel(
  options: { value: string; label: string }[],
  value: string | undefined
): string {
  if (!value) return '-';
  return options.find((o) => o.value === value)?.label ?? value;
}

/** Status pills in this dialog; discarded uses the dedicated “Discard this lead” action instead. */
const LEAD_STATUS_OPTIONS_FOR_DIALOG = LEAD_STATUS_OPTIONS.filter(
  (o) => o.value !== 'DISCARDED'
);

function formatDate(s: string | undefined): string {
  if (!s) return '-';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '-' : format(d, 'MMM d, yyyy');
}

function formatDateTime(s: string | undefined): string {
  if (!s) return '-';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '-' : format(d, 'MMM d, yyyy HH:mm');
}

function formatCurrency(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return '-';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatLifecycleStage(value: string | undefined): string {
  if (!value?.trim()) return '-';
  return value.replace(/_/g, ' ');
}

function formatLabels(labels: string[] | undefined): ReactNode {
  if (!labels?.length) return '-';
  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((l, i) => (
        <span
          key={`${l}-${i}`}
          className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
        >
          {l}
        </span>
      ))}
    </div>
  );
}

export interface LeadDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadListItem | null;
  onActionSuccess?: () => void;
}

export function LeadDetailDialog({
  open,
  onOpenChange,
  lead,
  onActionSuccess,
}: LeadDetailDialogProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [statusChangeOpen, setStatusChangeOpen] = useState(false);
  const [statusChangeTarget, setStatusChangeTarget] = useState<string | null>(null);
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [statusChangeDescription, setStatusChangeDescription] = useState('');
  const [leadEditForm, setLeadEditForm] = useState<LeadFormState>(() =>
    createDefaultLeadForm(null)
  );
  const [editCollapsed, setEditCollapsed] = useState<LeadFormCollapsedState>(
    DEFAULT_LEAD_FORM_COLLAPSED
  );
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editAttachmentFiles, setEditAttachmentFiles] = useState<File[]>([]);
  const [existingAttachmentUrls, setExistingAttachmentUrls] = useState<string[]>([]);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [engageOpen, setEngageOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTargetUid, setTransferTargetUid] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [engageChannel, setEngageChannel] = useState<'email' | 'sms' | 'whatsapp' | null>(null);
  const [engageDraft, setEngageDraft] = useState('');
  const [engageTone, setEngageTone] = useState<'professional' | 'friendly' | 'formal'>('professional');
  const [engageCasualness, setEngageCasualness] = useState<'casual' | 'neutral' | 'formal'>('neutral');

  const leadUid = lead?.uid;

  const updateMutation = useUpdateLeadMutation();
  const engageDraftMutation = useEngageDraftMutation();
  const deleteMutation = useDeleteLeadMutation();
  const reactivateMutation = useReactivateLeadMutation();
  const reassignMutation = useReassignLeadsMutation();
  const transferUsersQuery = useUsers({
    limit: 200,
    enabled: transferOpen,
  });
  const transferUsers = transferUsersQuery.data ?? [];
  const interactionsQuery = useInteractionsByLead(
    lead?.uid ?? null,
    { enabled: (lead?.uid != null) && chatOpen }
  );
  const createInteractionMutation = useCreateInteractionMutation();
  const sendEngageMutation = useSendLeadEngageMutation();
  const client = useApiClient();
  const leadDetailQuery = useLead(leadUid ?? null, {
    enabled: editOpen && leadUid != null,
  });

  const editImageInputRef = useRef<HTMLInputElement>(null);
  const editAttachmentInputRef = useRef<HTMLInputElement>(null);
  const editHydrateKeyRef = useRef('');

  const canReactivate =
    lead?.status === 'DECLINED' ||
    lead?.status === 'CANCELLED' ||
    lead?.status === 'DISCARDED';
  const isConverted = lead?.status === 'CONVERTED';
  const isDiscarded = lead?.status === 'DISCARDED';

  useEffect(() => {
    if (!open) {
      setChatOpen(false);
      setEngageOpen(false);
      setTransferOpen(false);
      setTransferTargetUid(null);
      setChatMessage('');
      setEngageChannel(null);
      setEngageDraft('');
      setEditOpen(false);
      setDiscardConfirmOpen(false);
      editHydrateKeyRef.current = '';
      setEditImageFile(null);
      setEditImagePreview(null);
      setEditAttachmentFiles([]);
    }
  }, [open]);

  useEffect(() => {
    if (!editImageFile) {
      setEditImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(editImageFile);
    setEditImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [editImageFile]);

  useEffect(() => {
    if (!editOpen || !lead || leadUid == null) return;
    if (leadDetailQuery.isPending) return;
    const src = leadDetailQuery.data?.lead ?? lead;
    const srcRecord = src as unknown as Record<string, unknown>;
    const updatedAt =
      typeof srcRecord.updatedAt === 'string' ? srcRecord.updatedAt : '';
    const key = `${leadUid}-${updatedAt}`;
    if (editHydrateKeyRef.current === key) return;
    editHydrateKeyRef.current = key;
    setLeadEditForm(leadRecordToLeadForm(srcRecord, null));
    const att = srcRecord.attachments;
    setExistingAttachmentUrls(
      Array.isArray(att) ? att.filter((u): u is string => typeof u === 'string') : []
    );
    const img = srcRecord.image;
    setExistingImageUrl(typeof img === 'string' && img.trim() ? img : null);
    setEditImageFile(null);
    if (editImageInputRef.current) editImageInputRef.current.value = '';
    setEditAttachmentFiles([]);
    setEditCollapsed(DEFAULT_LEAD_FORM_COLLAPSED);
  }, [editOpen, lead, leadUid, leadDetailQuery.isPending, leadDetailQuery.data?.lead]);

  const openEdit = () => {
    editHydrateKeyRef.current = '';
    setEditImageFile(null);
    setEditAttachmentFiles([]);
    setEditOpen(true);
  };

  const toggleEditSection = (key: LeadFormCollapsedKey) => {
    setEditCollapsed((c) => ({ ...c, [key]: !c[key] }));
  };

  const handleEditSubmit = async () => {
    if (leadUid == null) return;
    const hasName = (leadEditForm.name ?? '').trim() !== '';
    const hasEmail = (leadEditForm.email ?? '').trim() !== '';
    const hasPhone = (leadEditForm.phone ?? '').trim() !== '';
    if (!hasName && !hasEmail && !hasPhone) {
      toast.error('Please provide at least one of: name, email, or phone.');
      return;
    }

    let imageUrl: string | undefined;
    const newAttachmentUrls: string[] = [];
    try {
      for (const file of editAttachmentFiles) {
        try {
          newAttachmentUrls.push(await uploadFile(client, file));
        } catch {
          // Continue with others
        }
      }
      if (editImageFile) {
        try {
          imageUrl = await uploadFile(client, editImageFile);
        } catch (err) {
          toast.error(
            err instanceof Error
              ? err.message
              : 'Image upload failed. Saving without new image.'
          );
        }
      }

      const finalAttachments = [...existingAttachmentUrls, ...newAttachmentUrls];
      const payload: UpdateLeadPayload = formStateToUpdatePayload(leadEditForm, {
        ...(imageUrl && { imageUrl }),
        attachmentUrls: finalAttachments,
      });

      updateMutation.mutate(
        { ref: leadUid, payload },
        {
          onSuccess: () => {
            toast.success('Lead updated');
            setEditOpen(false);
            editHydrateKeyRef.current = '';
            onActionSuccess?.();
          },
          onError: (err: { message?: string }) => {
            toast.error(err?.message ?? 'Failed to update lead');
          },
        }
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to update lead. Please try again.';
      toast.error(msg);
    }
  };

  const handleDelete = () => {
    if (leadUid == null) return;
    deleteMutation.mutate(leadUid, {
      onSuccess: () => {
        toast.success('Lead deleted');
        setDeleteConfirmOpen(false);
        onOpenChange(false);
        onActionSuccess?.();
      },
      onError: (err: { message?: string }) => {
        toast.error(err?.message ?? 'Failed to delete lead');
      },
    });
  };

  const handleReactivate = () => {
    if (leadUid == null) return;
    reactivateMutation.mutate(leadUid, {
      onSuccess: () => {
        toast.success('Lead reactivated');
        onOpenChange(false);
        onActionSuccess?.();
      },
      onError: (err: { message?: string }) => {
        toast.error(err?.message ?? 'Failed to reactivate lead');
      },
    });
  };

  const handleDiscardLead = () => {
    if (leadUid == null) return;
    updateMutation.mutate(
      { ref: leadUid, payload: { status: 'DISCARDED' } },
      {
        onSuccess: () => {
          toast.success('Lead discarded');
          setDiscardConfirmOpen(false);
          onActionSuccess?.();
        },
        onError: (err: { message?: string }) => {
          toast.error(err?.message ?? 'Failed to discard lead');
        },
      }
    );
  };

  const handleConvertToClient = () => {
    if (leadUid == null || isConverted || isDiscarded) return;
    updateMutation.mutate(
      {
        ref: leadUid,
        payload: { status: 'CONVERTED' },
      },
      {
        onSuccess: () => {
          toast.success('Lead converted to client');
          onOpenChange(false);
          onActionSuccess?.();
        },
        onError: (err: { message?: string }) => {
          toast.error(err?.message ?? 'Failed to convert lead');
        },
      }
    );
  };

  const openChat = () => {
    setEngageOpen(false);
    setTransferOpen(false);
    setTransferTargetUid(null);
    setChatOpen((prev) => !prev);
  };

  const openEngage = () => {
    setChatOpen(false);
    setTransferOpen(false);
    setTransferTargetUid(null);
    setEngageOpen((prev) => {
      if (!prev) {
        setEngageChannel(null);
        setEngageDraft('');
      }
      return !prev;
    });
  };

  const toggleTransfer = () => {
    setChatOpen(false);
    setEngageOpen(false);
    setTransferOpen((prev) => {
      const next = !prev;
      if (!next) {
        setTransferTargetUid(null);
      }
      return next;
    });
  };

  const handleTransferConfirm = () => {
    if (!lead || leadUid == null || transferTargetUid == null) return;
    const targetUid = Number(transferTargetUid);
    if (Number.isNaN(targetUid)) return;
    if (lead.owner?.uid != null && targetUid === lead.owner.uid) {
      toast.error('Choose a different user than the current owner');
      return;
    }
    reassignMutation.mutate(
      {
        leadUids: [leadUid],
        targetUserUids: [targetUid],
        strategy: 'single',
      },
      {
        onSuccess: () => {
          toast.success('Lead transferred');
          setTransferOpen(false);
          setTransferTargetUid(null);
          onOpenChange(false);
          onActionSuccess?.();
        },
        onError: (err: { message?: string }) => {
          toast.error(
            (err as { response?: { data?: { message?: string } } })?.response?.data
              ?.message ?? (err as Error)?.message ?? 'Transfer failed'
          );
        },
      }
    );
  };

  const handleSendChatMessage = () => {
    const msg = chatMessage.trim();
    if (leadUid == null || !msg) return;
    createInteractionMutation.mutate(
      { message: msg, leadUid, type: 'message' },
      {
        onSuccess: () => {
          setChatMessage('');
          toast.success('Message sent');
          onActionSuccess?.();
        },
        onError: (err: { message?: string }) => {
          toast.error(err?.message ?? 'Failed to send message');
        },
      }
    );
  };

  /** Fallback draft when engage-draft API fails */
  const buildEngageDraft = (channel: 'email' | 'sms' | 'whatsapp') => {
    const name = lead?.name?.trim() || lead?.companyName?.trim() || 'there';
    const company = lead?.companyName?.trim() || '';
    const nextFollowUp = lead?.nextFollowUpDate
      ? format(new Date(lead.nextFollowUpDate), 'MMM d, yyyy')
      : '';
    const notes = lead?.notes?.trim() ? ` (Re: ${lead.notes.slice(0, 80)}${lead.notes.length > 80 ? '…' : ''})` : '';
    if (channel === 'email') {
      return `Hi ${name},\n\nI wanted to follow up${company ? ` regarding ${company}` : ''}.${notes}\n${nextFollowUp ? `Our next follow-up is scheduled for ${nextFollowUp}.` : ''}\n\nBest regards`;
    }
    if (channel === 'sms' || channel === 'whatsapp') {
      return `Hi ${name}, following up${company ? ` re ${company}` : ''}.${notes} ${nextFollowUp ? `Next follow-up: ${nextFollowUp}.` : ''}`;
    }
    return `Hi ${name}, following up.`;
  };

  const fetchEngageDraft = (channel: 'email' | 'sms' | 'whatsapp') => {
    if (leadUid == null) return;
    engageDraftMutation.mutate(
      {
        leadRef: leadUid,
        channel,
        tone: engageTone,
        casualness: engageCasualness,
      },
      {
        onSuccess: (data) => setEngageDraft(data.draft ?? ''),
        onError: () => {
          setEngageDraft(buildEngageDraft(channel));
          toast.error('AI draft unavailable; using template.');
        },
      }
    );
  };

  const handleSelectEngageChannel = (channel: 'email' | 'sms' | 'whatsapp') => {
    setEngageChannel(channel);
    setEngageDraft('');
    fetchEngageDraft(channel);
  };

  const handleEngageToneChange = (tone: 'professional' | 'friendly' | 'formal') => {
    setEngageTone(tone);
    if (engageChannel) fetchEngageDraft(engageChannel);
  };

  const handleEngageCasualnessChange = (casualness: 'casual' | 'neutral' | 'formal') => {
    setEngageCasualness(casualness);
    if (engageChannel) fetchEngageDraft(engageChannel);
  };

  const handleRegenerateDraft = () => {
    if (engageChannel) fetchEngageDraft(engageChannel);
  };

  const handleCopyEngageDraft = async () => {
    try {
      await navigator.clipboard.writeText(engageDraft);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleSendEngage = () => {
    if (leadUid == null || engageChannel == null || !engageDraft.trim()) return;
    const channelLabel = engageChannel === 'email' ? 'Email' : engageChannel === 'whatsapp' ? 'WhatsApp' : 'SMS';
    sendEngageMutation.mutate(
      { ref: leadUid, channel: engageChannel, message: engageDraft.trim() },
      {
        onSuccess: () => {
          toast.success(`Sent via ${channelLabel}`);
          onActionSuccess?.();
        },
        onError: (err: { message?: string }) => {
          toast.error(err?.message ?? `Failed to send via ${channelLabel}`);
        },
      }
    );
  };

  const openStatusChange = (status: string) => {
    setStatusChangeTarget(status);
    setStatusChangeReason('');
    setStatusChangeDescription('');
    setStatusChangeOpen(true);
  };

  const handleStatusChangeSubmit = () => {
    if (leadUid == null || statusChangeTarget == null) return;
    const payload: UpdateLeadPayload = {
      status: statusChangeTarget,
      ...(statusChangeReason.trim() && { statusChangeReason: statusChangeReason.trim() }),
      ...(statusChangeDescription.trim() && { statusChangeDescription: statusChangeDescription.trim() }),
    };
    updateMutation.mutate(
      { ref: leadUid, payload },
      {
        onSuccess: () => {
          toast.success('Status updated');
          setStatusChangeOpen(false);
          setStatusChangeTarget(null);
          onActionSuccess?.();
        },
        onError: (err: { message?: string }) => {
          toast.error(err?.message ?? 'Failed to update status');
        },
      }
    );
  };

  if (!lead) return null;

  const ownerFullName = lead.owner
    ? [lead.owner.name, lead.owner.surname].filter(Boolean).join(' ').trim() || '-'
    : '-';
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            DETAIL_DIALOG_CONTENT_CLASS,
            'flex flex-col overflow-hidden gap-0',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <Button
              size="sm"
              className="gap-1.5 bg-purple-600 text-white hover:bg-purple-700"
              onClick={(e) => {
                e.stopPropagation();
                openEdit();
              }}
              disabled={!leadUid}
            >
              <Pencil className="size-4" />
              Edit
            </Button>
            <Button
              size="sm"
              variant={chatOpen ? 'destructive' : 'outline'}
              className={chatOpen ? 'rounded-full gap-1.5 bg-red-600 text-white hover:bg-red-700' : 'rounded-full gap-1.5'}
              onClick={(e) => {
                e.stopPropagation();
                openChat();
              }}
              disabled={!leadUid}
            >
              <MessageCircle className="size-4" />
              {chatOpen ? 'Close chat' : 'Chat'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                openEngage();
              }}
              disabled={!leadUid}
            >
              <Send className="size-4" />
              Engage lead
            </Button>
            <Button
              size="sm"
              variant={transferOpen ? 'destructive' : 'outline'}
              className={
                transferOpen
                  ? 'rounded-full gap-1.5 bg-red-600 text-white hover:bg-red-700'
                  : 'rounded-full gap-1.5'
              }
              onClick={(e) => {
                e.stopPropagation();
                toggleTransfer();
              }}
              disabled={!leadUid || reassignMutation.isPending}
            >
              <ArrowRightLeft className="size-4" />
              {transferOpen ? 'Close transfer' : 'Transfer lead'}
            </Button>
            {canReactivate && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={handleReactivate}
                disabled={!leadUid || reactivateMutation.isPending}
              >
                {reactivateMutation.isPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  'Reactivate'
                )}
              </Button>
            )}
            <DetailDialogCloseButton />
          </div>
          <DialogHeader className="pr-24 pt-12 mt-2 gap-2 sm:pt-14 shrink-0">
            <DialogTitle>
              {lead.name?.trim() || lead.companyName?.trim() || `Lead #${lead.uid}`}
            </DialogTitle>
            <DialogDescription>
              {ownerFullName} · {formatDateTime(lead.updatedAt)}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto space-y-4">
          {chatOpen && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
              <h4 className="font-semibold text-sm">Team chat</h4>
              <p className="text-xs text-muted-foreground">Visible to lead owner and assignees.</p>
              <div className="max-h-48 overflow-y-auto space-y-2 min-h-[80px]">
                {interactionsQuery.isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (interactionsQuery.data?.data?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">No messages yet. Start the conversation.</p>
                ) : (
                  (interactionsQuery.data?.data ?? []).map((i) => (
                    <div key={i.uid} className="text-sm">
                      <span className="font-medium text-muted-foreground">
                        {i.createdBy
                          ? [i.createdBy.name, i.createdBy.surname].filter(Boolean).join(' ').trim() || i.createdBy.email || 'Someone'
                          : 'Someone'}
                        {' · '}
                        {formatDateTime(i.createdAt)}
                      </span>
                      <p className="mt-0.5 whitespace-pre-wrap">{i.message}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type a message…"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChatMessage();
                    }
                  }}
                  rows={2}
                  className="min-h-0 resize-none"
                />
                <Button
                  size="sm"
                  className={chatMessage.trim() && !createInteractionMutation.isPending ? 'bg-purple-600 text-white hover:bg-purple-700' : ''}
                  onClick={handleSendChatMessage}
                  disabled={!chatMessage.trim() || createInteractionMutation.isPending}
                >
                  {createInteractionMutation.isPending ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    'Send'
                  )}
                </Button>
              </div>
            </div>
          )}

          {transferOpen && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
              <h4 className="font-semibold text-sm">Transfer lead</h4>
              <p className="text-xs text-muted-foreground">
                Select a team member to own this lead. Interactions and history stay on the lead.
              </p>
              {transferUsersQuery.isLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="max-h-52 overflow-y-auto space-y-1 rounded-md border bg-background p-2">
                  {transferUsers
                    .filter((u) => u.uid !== lead.owner?.uid)
                    .map((u) => {
                      const fullName =
                        [u.name, u.surname].filter(Boolean).join(' ').trim() ||
                        u.email ||
                        `User ${u.uid}`;
                      const id = String(u.uid);
                      const selected = transferTargetUid === id;
                      const imgSrc =
                        (u as { photoURL?: string | null }).photoURL ??
                        (u as { avatar?: string | null }).avatar ??
                        undefined;
                      return (
                        <button
                          key={u.uid}
                          type="button"
                          onClick={() => setTransferTargetUid(id)}
                          aria-pressed={selected}
                          className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-all border-2 ${
                            selected
                              ? 'border-purple-600 bg-purple-50 shadow-sm dark:border-purple-500 dark:bg-purple-950/50'
                              : 'border-transparent bg-background hover:border-muted-foreground/25 hover:bg-muted/60'
                          }`}
                        >
                          <span
                            className={`flex size-5 shrink-0 items-center justify-center rounded border-2 ${
                              selected
                                ? 'border-purple-600 bg-purple-600 text-white dark:border-purple-400 dark:bg-purple-500'
                                : 'border-muted-foreground/45 bg-muted/30'
                            }`}
                            aria-hidden
                          >
                            {selected ? (
                              <Check className="size-3.5 stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round" />
                            ) : null}
                          </span>
                          <Avatar className="size-8 shrink-0">
                            <AvatarImage src={imgSrc} alt="" />
                            <AvatarFallback className="text-xs">
                              {fullName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="min-w-0 flex-1 truncate font-medium">{fullName}</span>
                        </button>
                      );
                    })}
                </div>
              )}
              <Button
                size="sm"
                className="w-full bg-purple-600 text-white hover:bg-purple-700"
                disabled={
                  transferTargetUid == null ||
                  reassignMutation.isPending ||
                  transferUsersQuery.isLoading
                }
                onClick={handleTransferConfirm}
              >
                {reassignMutation.isPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  'Confirm transfer'
                )}
              </Button>
            </div>
          )}

          {engageOpen && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
              <h4 className="font-semibold text-sm">Engage lead</h4>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className={`gap-1.5 ${engageChannel === 'email' ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600' : ''}`}
                  onClick={() => handleSelectEngageChannel('email')}
                  disabled={!lead?.email}
                >
                  <Mail className="size-4" />
                  Email
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={`gap-1.5 ${engageChannel === 'sms' ? 'bg-purple-600 text-white hover:bg-purple-700 border-purple-600' : ''}`}
                  onClick={() => handleSelectEngageChannel('sms')}
                  disabled={!lead?.phone}
                >
                  <MessageSquare className="size-4" />
                  SMS
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={`gap-1.5 ${engageChannel === 'whatsapp' ? 'bg-green-600 text-white hover:bg-green-700 border-green-600' : ''}`}
                  onClick={() => handleSelectEngageChannel('whatsapp')}
                  disabled={
                    !(lead?.whatsAppNumber?.trim() || lead?.phone?.trim())
                  }
                >
                  <Phone className="size-4" />
                  WhatsApp
                </Button>
              </div>
              {engageChannel && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Tone</Label>
                      <Select
                        value={engageTone}
                        onValueChange={(v) => handleEngageToneChange(v as 'professional' | 'friendly' | 'formal')}
                      >
                        <SelectTrigger className="h-8 text-sm mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="formal">Formal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Casualness</Label>
                      <Select
                        value={engageCasualness}
                        onValueChange={(v) => handleEngageCasualnessChange(v as 'casual' | 'neutral' | 'formal')}
                      >
                        <SelectTrigger className="h-8 text-sm mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="neutral">Neutral</SelectItem>
                          <SelectItem value="formal">Formal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Label className="text-xs">Draft</Label>
                  {engageDraftMutation.isPending ? (
                    <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-4 text-sm text-muted-foreground">
                      <Loader2Icon className="size-4 animate-spin" />
                      Generating draft…
                    </div>
                  ) : (
                    <Textarea
                      value={engageDraft}
                      onChange={(e) => setEngageDraft(e.target.value)}
                      rows={10}
                      className="resize-y text-sm"
                    />
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={handleCopyEngageDraft} disabled={!engageDraft.trim()}>
                      Copy to clipboard
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRegenerateDraft}
                      disabled={engageDraftMutation.isPending}
                    >
                      {engageDraftMutation.isPending ? (
                        <Loader2Icon className="size-4 animate-spin" />
                      ) : (
                        'Regenerate'
                      )}
                    </Button>
                    <Button
                      size="sm"
                      className={
                        engageChannel === 'email'
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : engageChannel === 'whatsapp'
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-purple-600 text-white hover:bg-purple-700'
                      }
                      onClick={handleSendEngage}
                      disabled={!engageDraft.trim() || sendEngageMutation.isPending}
                    >
                      {sendEngageMutation.isPending ? (
                        <Loader2Icon className="size-4 animate-spin" />
                      ) : (
                        `Send via ${engageChannel === 'email' ? 'Email' : engageChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'}`
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="space-y-4 text-sm">
            <div>
              <DetailSectionHeading title="Contact" icon={Contact} />
              <dl className={DETAIL_FIELD_GRID_CLASS}>
                <DetailFieldRow label="Name" value={lead.name?.trim() || '-'} icon={User} />
                <DetailFieldRow label="Email" value={lead.email?.trim() || '-'} icon={Mail} />
                <DetailFieldRow label="Phone" value={lead.phone?.trim() || '-'} icon={Phone} />
                <DetailFieldRow
                  label="Secondary phone"
                  value={lead.secondaryPhoneNumber?.trim() || '-'}
                  icon={PhoneForwarded}
                />
                <DetailFieldRow
                  label="WhatsApp"
                  value={lead.whatsAppNumber?.trim() || '-'}
                  icon={Smartphone}
                />
                <DetailFieldRow
                  label="Company"
                  value={lead.companyName?.trim() || '-'}
                  icon={Building2}
                />
              </dl>
            </div>
            <Separator />
            <div>
              <DetailSectionHeading title="Status" icon={BadgeCheck} />
              <dl className={DETAIL_FIELD_GRID_CLASS}>
                <DetailFieldRow
                  label="Status"
                  value={getOptionLabel(LEAD_STATUS_OPTIONS, lead.status)}
                  icon={BadgeCheck}
                />
                <DetailFieldRow
                  label="Source"
                  value={getOptionLabel(LEAD_SOURCE_OPTIONS, lead.source)}
                  icon={Share2}
                />
                <DetailFieldRow
                  label="Temperature"
                  value={getOptionLabel(LEAD_TEMPERATURE_OPTIONS, lead.temperature)}
                  icon={Thermometer}
                />
                <DetailFieldRow
                  label="Priority"
                  value={getOptionLabel(LEAD_PRIORITY_OPTIONS, lead.priority)}
                  icon={ListOrdered}
                />
                <DetailFieldRow
                  label="Stage"
                  value={formatLifecycleStage(lead.lifecycleStage)}
                  icon={Layers}
                />
                <DetailFieldRow
                  label="Form"
                  value={lead.form?.trim() || '-'}
                  icon={ClipboardList}
                />
                <DetailFieldRow
                  label="Channel"
                  value={lead.channel?.trim() || '-'}
                  icon={Hash}
                />
                <DetailFieldRow label="Labels" value={formatLabels(lead.labels)} icon={Tag} />
              </dl>
            </div>
            <Separator />
            <div>
              <DetailSectionHeading title="Scoring & value" icon={TrendingUp} />
              <dl className={DETAIL_FIELD_GRID_CLASS}>
                <DetailFieldRow
                  label="Lead score"
                  value={lead.leadScore != null ? `${lead.leadScore}` : '-'}
                  icon={Target}
                />
                <DetailFieldRow
                  label="Estimated value"
                  value={formatCurrency(lead.estimatedValue)}
                  icon={Banknote}
                />
              </dl>
            </div>
            <Separator />
            <div>
              <DetailSectionHeading title="Dates" icon={CalendarClock} />
              <dl className={DETAIL_FIELD_GRID_CLASS}>
                <DetailFieldRow
                  label="Created"
                  value={formatDateTime(lead.createdAt)}
                  icon={CalendarPlus}
                />
                <DetailFieldRow
                  label="Updated"
                  value={formatDateTime(lead.updatedAt)}
                  icon={RefreshCw}
                />
                <DetailFieldRow
                  label="Last contact"
                  value={formatDate(lead.lastContactDate)}
                  icon={Clock}
                />
                <DetailFieldRow
                  label="Next follow-up"
                  value={formatDate(lead.nextFollowUpDate)}
                  icon={CalendarCheck2}
                />
              </dl>
            </div>
            {(lead.totalInteractions != null || lead.averageResponseTime != null) && (
              <>
                <Separator />
                <div>
                  <DetailSectionHeading title="Activity" icon={Activity} />
                  <dl className={DETAIL_FIELD_GRID_CLASS}>
                    {lead.totalInteractions != null && (
                      <DetailFieldRow
                        label="Total interactions"
                        value={lead.totalInteractions}
                        icon={MessageSquare}
                      />
                    )}
                    {lead.averageResponseTime != null && (
                      <DetailFieldRow
                        label="Avg response time (hours)"
                        value={lead.averageResponseTime}
                        icon={Timer}
                      />
                    )}
                  </dl>
                </div>
              </>
            )}
            <Separator />
            <div>
              <DetailSectionHeading title="People" icon={Users} />
              <dl className={DETAIL_FIELD_GRID_CLASS}>
                <DetailFieldRow
                  label="Owner"
                  icon={UserCircle}
                  value={
                    lead.owner ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                          <AvatarImage
                            src={
                              lead.owner.photoURL ?? lead.owner.avatar ?? undefined
                            }
                            alt=""
                          />
                          <AvatarFallback className="text-xs">
                            {[lead.owner.name, lead.owner.surname]
                              .filter(Boolean)
                              .join(' ')
                              .slice(0, 2)
                              .toUpperCase() || '-'}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          {[lead.owner.name, lead.owner.surname]
                            .filter(Boolean)
                            .join(' ')
                            .trim() || lead.owner.email || '-'}
                        </span>
                      </div>
                    ) : (
                      '-'
                    )
                  }
                />
                {lead.assignees && lead.assignees.length > 0 ? (
                  <DetailFieldRow
                    label="Assignees"
                    icon={Users}
                    value={
                      <ul className="list-inside list-disc font-medium">
                        {lead.assignees.map((a, i) => (
                          <li key={i}>
                            {[a.name, a.email].filter(Boolean).join(' ') || '-'}
                          </li>
                        ))}
                      </ul>
                    }
                  />
                ) : (
                  <DetailFieldRow label="Assignees" value="-" icon={Users} />
                )}
              </dl>
            </div>
            {lead.notes?.trim() && (
              <>
                <Separator />
                <div>
                  <DetailSectionHeading title="Notes" icon={StickyNote} />
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {lead.notes.trim()}
                  </p>
                </div>
              </>
            )}
            {lead.attachments && lead.attachments.length > 0 && (
              <>
                <Separator />
                <div>
                  <DetailSectionHeading title="Attachments" icon={Paperclip} />
                  <ul className="space-y-1">
                    {lead.attachments.map((url, i) => (
                      <li key={i}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline hover:no-underline"
                        >
                          {url.length > 50 ? `${url.slice(0, 50)}…` : url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
          </div>

          <div className="shrink-0 border-t bg-background pt-3 mt-4 -mx-6 px-6 pb-1">
            <p className="font-semibold text-sm mb-2">Change status</p>
            <div
              className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-2"
              role="toolbar"
              aria-label="Lead actions"
            >
              <Button
                variant="outline"
                size="sm"
                className="rounded-full shrink-0 border-destructive/60 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={!leadUid}
              >
                Delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full shrink-0"
                onClick={handleConvertToClient}
                disabled={!leadUid || isConverted || isDiscarded || updateMutation.isPending}
              >
                {updateMutation.isPending && !isConverted ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  'Convert to client'
                )}
              </Button>
              {LEAD_STATUS_OPTIONS_FOR_DIALOG.map((opt) => (
                <Button
                  key={opt.value}
                  variant={lead.status === opt.value ? 'secondary' : 'outline'}
                  size="sm"
                  className="rounded-full shrink-0"
                  disabled={
                    !leadUid ||
                    lead.status === opt.value ||
                    isDiscarded ||
                    isConverted
                  }
                  onClick={() => openStatusChange(opt.value)}
                >
                  Set to {opt.label}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="rounded-full shrink-0"
                onClick={() => setDiscardConfirmOpen(true)}
                disabled={
                  !leadUid ||
                  isDiscarded ||
                  isConverted ||
                  updateMutation.isPending
                }
              >
                Discard this lead
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit lead dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(next) => {
          setEditOpen(next);
          if (!next) {
            editHydrateKeyRef.current = '';
            setEditImageFile(null);
            setEditImagePreview(null);
            setEditAttachmentFiles([]);
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[36rem] max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute top-4 right-4 z-10">
            <DetailDialogCloseButton />
          </div>
          <DialogHeader className="pr-24">
            <DialogTitle>Edit lead</DialogTitle>
            <DialogDescription>
              Update lead details. At least one of name, email, or phone is required.
            </DialogDescription>
          </DialogHeader>
          {leadDetailQuery.isPending && editOpen ? (
            <div className="flex justify-center py-16">
              <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <LeadFormBody
              form={leadEditForm}
              setForm={setLeadEditForm}
              collapsed={editCollapsed}
              toggleSection={toggleEditSection}
              idPrefix="edit-lead"
              displayImageSrc={editImagePreview ?? existingImageUrl}
              imageInputRef={editImageInputRef}
              onImageInputChange={(file) => setEditImageFile(file)}
              onClearImageSelection={() => {
                setEditImageFile(null);
                setExistingImageUrl(null);
                if (editImageInputRef.current) editImageInputRef.current.value = '';
              }}
              attachmentFiles={editAttachmentFiles}
              attachmentInputRef={editAttachmentInputRef}
              onAttachmentFilesAdded={(files) =>
                setEditAttachmentFiles((prev) => [...prev, ...files])
              }
              onRemovePendingAttachment={(index) =>
                setEditAttachmentFiles((prev) => prev.filter((_, j) => j !== index))
              }
              existingAttachmentUrls={existingAttachmentUrls}
              onRemoveExistingAttachment={(url) =>
                setExistingAttachmentUrls((prev) => prev.filter((u) => u !== url))
              }
            />
          )}
          <DialogFooter className="gap-3">
            <Button
              variant="cancel"
              className="rounded-full"
              onClick={() => setEditOpen(false)}
              disabled={leadDetailQuery.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              className="rounded-full"
              onClick={() => void handleEditSubmit()}
              disabled={
                updateMutation.isPending ||
                leadDetailQuery.isPending ||
                !leadUid
              }
            >
              {updateMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the lead. You can restore it later if
              needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={discardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              The lead will be marked as discarded. You can reactivate it later from
              this dialog, like declined or cancelled leads.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={handleDiscardLead}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                'Discard lead'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change status sub-dialog */}
      <Dialog open={statusChangeOpen} onOpenChange={setStatusChangeOpen}>
        <DialogContent
          showCloseButton={false}
          className={DETAIL_DIALOG_SMALL_CONTENT_CLASS}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute top-4 right-4 z-10">
            <DetailDialogCloseButton />
          </div>
          <DialogHeader className="pr-24">
            <DialogTitle>
              Set status to{' '}
              {statusChangeTarget
                ? getOptionLabel(LEAD_STATUS_OPTIONS, statusChangeTarget)
                : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="status-reason">Reason (optional)</Label>
              <Input
                id="status-reason"
                value={statusChangeReason}
                onChange={(e) => setStatusChangeReason(e.target.value)}
                placeholder="e.g. Customer requested callback"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status-description">Description (optional)</Label>
              <Textarea
                id="status-description"
                value={statusChangeDescription}
                onChange={(e) => setStatusChangeDescription(e.target.value)}
                placeholder="Additional notes"
                rows={6}
                className="min-h-[120px] resize-y rounded-md"
              />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button
              variant="cancel"
              className="rounded-full"
              onClick={() => setStatusChangeOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              className="rounded-full"
              onClick={handleStatusChangeSubmit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                'Confirm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

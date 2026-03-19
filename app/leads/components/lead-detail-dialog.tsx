'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { format } from 'date-fns';
import type { LeadListItem } from '@/api/types/leads';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  useUpdateLeadMutation,
  useDeleteLeadMutation,
  useReactivateLeadMutation,
  useEngageDraftMutation,
  useSendLeadEngageMutation,
  useInteractionsByLead,
  useCreateInteractionMutation,
} from '@/api/hooks';
import type { UpdateLeadPayload } from '@/api/types/leads';
import {
  LEAD_STATUS_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  LEAD_TEMPERATURE_OPTIONS,
  LEAD_PRIORITY_OPTIONS,
} from '@/lib/lead-form-utils';
import { Loader2Icon, XIcon } from '@/lib/icons';
import { Pencil, MessageCircle, Send, Mail, MessageSquare, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

function getOptionLabel(
  options: { value: string; label: string }[],
  value: string | undefined
): string {
  if (!value) return '-';
  return options.find((o) => o.value === value)?.label ?? value;
}

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
  const [statusChangeOpen, setStatusChangeOpen] = useState(false);
  const [statusChangeTarget, setStatusChangeTarget] = useState<string | null>(null);
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [statusChangeDescription, setStatusChangeDescription] = useState('');
  const [editForm, setEditForm] = useState<{
    status?: string;
    priority?: string;
    temperature?: string;
    notes?: string;
    nextFollowUpDate?: string;
  }>({});
  const [chatOpen, setChatOpen] = useState(false);
  const [engageOpen, setEngageOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [engageChannel, setEngageChannel] = useState<'email' | 'sms' | 'whatsapp' | null>(null);
  const [engageDraft, setEngageDraft] = useState('');
  const [engageTone, setEngageTone] = useState<'professional' | 'friendly' | 'formal'>('professional');
  const [engageCasualness, setEngageCasualness] = useState<'casual' | 'neutral' | 'formal'>('neutral');

  const updateMutation = useUpdateLeadMutation();
  const engageDraftMutation = useEngageDraftMutation();
  const deleteMutation = useDeleteLeadMutation();
  const reactivateMutation = useReactivateLeadMutation();
  const interactionsQuery = useInteractionsByLead(
    lead?.uid ?? null,
    { enabled: (lead?.uid != null) && chatOpen }
  );
  const createInteractionMutation = useCreateInteractionMutation();
  const sendEngageMutation = useSendLeadEngageMutation();

  const canReactivate =
    lead?.status === 'DECLINED' || lead?.status === 'CANCELLED';
  const isConverted = lead?.status === 'CONVERTED';
  const leadUid = lead?.uid;

  const openEdit = () => {
    setEditForm({
      status: lead?.status ?? '',
      priority: lead?.priority ?? '',
      temperature: lead?.temperature ?? '',
      notes: lead?.notes ?? '',
      nextFollowUpDate: lead?.nextFollowUpDate
        ? lead.nextFollowUpDate.slice(0, 10)
        : '',
    });
    setEditOpen(true);
  };

  const handleEditSubmit = () => {
    if (leadUid == null) return;
    const payload: UpdateLeadPayload = {
      ...(editForm.status && { status: editForm.status }),
      ...(editForm.priority && { priority: editForm.priority }),
      ...(editForm.temperature && { temperature: editForm.temperature }),
      ...(editForm.notes !== undefined && { notes: editForm.notes }),
      ...(editForm.nextFollowUpDate && {
        nextFollowUpDate: editForm.nextFollowUpDate,
      }),
    };
    updateMutation.mutate(
      { ref: leadUid, payload },
      {
        onSuccess: () => {
          toast.success('Lead updated');
          setEditOpen(false);
          onActionSuccess?.();
        },
        onError: (err: { message?: string }) => {
          toast.error(err?.message ?? 'Failed to update lead');
        },
      }
    );
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

  const handleConvertToClient = () => {
    if (leadUid == null || isConverted) return;
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
    setChatOpen((prev) => !prev);
  };

  const openEngage = () => {
    setChatOpen(false);
    setEngageOpen((prev) => {
      if (!prev) {
        setEngageChannel(null);
        setEngageDraft('');
      }
      return !prev;
    });
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
  const fieldGridClass = 'grid grid-cols-2 gap-x-6 gap-y-3';
  const fieldCell = (label: string, value: ReactNode) => (
    <div>
      <span className="text-muted-foreground">{label}</span>
      <div className="font-medium">{value}</div>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[calc(100%-3rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6 pt-12 pr-14"
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
              variant="outline"
              className="rounded-full"
              onClick={handleConvertToClient}
              disabled={!leadUid || isConverted || updateMutation.isPending}
            >
              {updateMutation.isPending && !isConverted ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                'Convert to client'
              )}
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
            <DialogClose asChild>
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-full border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Close"
              >
                <XIcon className="size-5" />
              </button>
            </DialogClose>
          </div>
          <DialogHeader className="pr-24">
            <DialogTitle>
              {lead.name?.trim() || lead.companyName?.trim() || `Lead #${lead.uid}`}
            </DialogTitle>
            <DialogDescription>
              {ownerFullName} · {formatDateTime(lead.updatedAt)}
            </DialogDescription>
          </DialogHeader>

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
                  disabled={!lead?.phone}
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
              <h4 className="font-semibold mb-2">Contact</h4>
              <dl className={fieldGridClass}>
                {fieldCell('Name', lead.name?.trim() || '-')}
                {fieldCell('Email', lead.email?.trim() || '-')}
                {fieldCell('Phone', lead.phone?.trim() || '-')}
                {fieldCell('Company', lead.companyName?.trim() || '-')}
              </dl>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold mb-2">Status</h4>
              <dl className={fieldGridClass}>
                {fieldCell('Status', getOptionLabel(LEAD_STATUS_OPTIONS, lead.status))}
                {fieldCell('Source', getOptionLabel(LEAD_SOURCE_OPTIONS, lead.source))}
                {fieldCell('Temperature', getOptionLabel(LEAD_TEMPERATURE_OPTIONS, lead.temperature))}
                {fieldCell('Priority', getOptionLabel(LEAD_PRIORITY_OPTIONS, lead.priority))}
              </dl>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold mb-2">Scoring & value</h4>
              <dl className={fieldGridClass}>
                {fieldCell('Lead score', lead.leadScore != null ? `${lead.leadScore}` : '-')}
                {fieldCell('Estimated value', formatCurrency(lead.estimatedValue))}
              </dl>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold mb-2">Dates</h4>
              <dl className={fieldGridClass}>
                {fieldCell('Created', formatDateTime(lead.createdAt))}
                {fieldCell('Updated', formatDateTime(lead.updatedAt))}
                {fieldCell('Last contact', formatDate(lead.lastContactDate))}
                {fieldCell('Next follow-up', formatDate(lead.nextFollowUpDate))}
              </dl>
            </div>
            {(lead.totalInteractions != null || lead.averageResponseTime != null) && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Activity</h4>
                  <dl className={fieldGridClass}>
                    {lead.totalInteractions != null &&
                      fieldCell('Total interactions', lead.totalInteractions)}
                    {lead.averageResponseTime != null &&
                      fieldCell('Avg response time (hours)', lead.averageResponseTime)}
                  </dl>
                </div>
              </>
            )}
            <Separator />
            <div>
              <h4 className="font-semibold mb-2">People</h4>
              <dl className={fieldGridClass}>
                <div>
                  <span className="text-muted-foreground">Owner</span>
                  <div className="mt-0.5 flex items-center gap-2 font-medium">
                    {lead.owner ? (
                      <>
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
                      </>
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
                {lead.assignees && lead.assignees.length > 0 ? (
                  <div>
                    <span className="text-muted-foreground">Assignees</span>
                    <ul className="mt-0.5 list-inside list-disc font-medium">
                      {lead.assignees.map((a, i) => (
                        <li key={i}>
                          {[a.name, a.email].filter(Boolean).join(' ') || '-'}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  fieldCell('Assignees', '-')
                )}
              </dl>
            </div>
            {lead.notes?.trim() && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Notes</h4>
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
                  <h4 className="font-semibold mb-2">Attachments</h4>
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

          <DialogFooter className="gap-3">
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={!leadUid}
            >
              Delete
            </Button>
          </DialogFooter>

          <div className="border-t pt-3">
            <p className="font-semibold mb-2">
              Change status
            </p>
            <div className="flex flex-wrap gap-2">
              {LEAD_STATUS_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={lead.status === opt.value ? 'secondary' : 'outline'}
                  size="sm"
                  className="rounded-full"
                  disabled={!leadUid || lead.status === opt.value}
                  onClick={() => openStatusChange(opt.value)}
                >
                  Set to {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit lead dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[calc(100%-3rem)] sm:max-w-md max-h-[90vh] overflow-y-auto p-6 pt-12 pr-14"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute top-4 right-4 z-10">
            <DialogClose asChild>
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-full border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Close"
              >
                <XIcon className="size-5" />
              </button>
            </DialogClose>
          </div>
          <DialogHeader className="pr-24">
            <DialogTitle>Edit lead</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={editForm.status || ''}
                onValueChange={(v) =>
                  setEditForm((f) => ({ ...f, status: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select
                value={editForm.priority || ''}
                onValueChange={(v) =>
                  setEditForm((f) => ({ ...f, priority: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Temperature</Label>
              <Select
                value={editForm.temperature || ''}
                onValueChange={(v) =>
                  setEditForm((f) => ({ ...f, temperature: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select temperature" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_TEMPERATURE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Next follow-up date</Label>
              <Input
                type="date"
                value={editForm.nextFollowUpDate || ''}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    nextFollowUpDate: e.target.value || undefined,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                value={editForm.notes || ''}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button
              variant="cancel"
              className="rounded-full"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              className="rounded-full"
              onClick={handleEditSubmit}
              disabled={updateMutation.isPending}
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

      {/* Change status sub-dialog */}
      <Dialog open={statusChangeOpen} onOpenChange={setStatusChangeOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[calc(100%-3rem)] sm:max-w-md max-h-[90vh] overflow-y-auto p-6 pt-12 pr-14"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute top-4 right-4 z-10">
            <DialogClose asChild>
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-full border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Close"
              >
                <XIcon className="size-5" />
              </button>
            </DialogClose>
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

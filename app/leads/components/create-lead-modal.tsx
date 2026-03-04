'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSessionSync, useBranches, useCreateLeadMutation, useApiClient } from '@/api/hooks';
import { uploadFile } from '@/api/endpoints/upload';
import {
  LEAD_STATUS_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  LEAD_TEMPERATURE_OPTIONS,
  LEAD_PRIORITY_OPTIONS,
  INDUSTRY_OPTIONS,
  BUSINESS_SIZE_OPTIONS,
  DECISION_MAKER_ROLE_OPTIONS,
  LEAD_INTENT_OPTIONS,
  LIFECYCLE_STAGE_OPTIONS,
  BUDGET_RANGE_OPTIONS,
  TIMELINE_OPTIONS,
  COMMUNICATION_PREFERENCE_OPTIONS,
  TIMEZONE_OPTIONS,
  BEST_CONTACT_TIME_OPTIONS,
  CURRENCY_OPTIONS,
} from '@/lib/lead-form-utils';
import { Image as ImageIcon, Paperclip as PaperclipIcon } from 'lucide-react';
import { Loader2Icon, ChevronDownIcon, ChevronUpIcon, XIcon, HandshakeIcon, MapPinIcon } from '@/lib/icons';
import toast from 'react-hot-toast';
import type { CreateLeadPayload } from '@/api/types/leads';

/** Optional initial form values (e.g. from a visit when converting to lead). */
export type CreateLeadModalInitialValues = Partial<
  Record<keyof typeof defaultForm, string | number | null | undefined>
>;

export interface CreateLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after lead is created; receives the created lead when available (e.g. to link visit to lead). */
  onSuccess?: (createdLead?: { uid: number }) => void;
  /** When set, form is prefilled on open. Used when converting a visit to a lead. */
  initialValues?: CreateLeadModalInitialValues;
}

const defaultForm = {
  name: '',
  companyName: '',
  email: '',
  phone: '',
  notes: '',
  status: 'PENDING' as string,
  source: 'WEBSITE' as string,
  temperature: 'WARM' as string,
  priority: 'MEDIUM' as string,
  branchUid: null as number | null,
  jobTitle: '',
  industry: 'OTHER' as string,
  businessSize: 'UNKNOWN' as string,
  decisionMakerRole: 'UNKNOWN' as string,
  intent: 'ENQUIRY' as string,
  userQualityRating: 3 as number,
  lifecycleStage: 'LEAD' as string,
  budgetRange: 'UNKNOWN' as string,
  currency: 'ZAR' as string,
  estimatedValue: undefined as number | undefined,
  purchaseTimeline: 'UNKNOWN' as string,
  preferredCommunication: 'EMAIL' as string,
  timezone: 'Africa/Johannesburg' as string,
  bestContactTime: 'business_hours' as string,
  painPoints: '',
  referralSource: '',
  competitorInfo: '',
  campaignName: '',
  landingPage: '',
  utmSource: '',
  utmMedium: '',
  utmCampaign: '',
  utmTerm: '',
  utmContent: '',
  lastContactDate: undefined as string | undefined,
  nextFollowUpDate: undefined as string | undefined,
};

export function CreateLeadModal({
  open,
  onOpenChange,
  onSuccess,
  initialValues,
}: CreateLeadModalProps) {
  const [form, setForm] = useState(defaultForm);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [collapsed, setCollapsed] = useState({
    companyDetails: true,
    leadQualification: true,
    financial: true,
    communication: true,
    additional: true,
    marketing: true,
    fileAttachments: true,
  });
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const client = useApiClient();
  const { backendUserData } = useSessionSync();
  const sessionBranchUid = backendUserData?.branch?.uid ?? null;
  const { data: branches = [] } = useBranches({ enabled: open });
  const createMutation = useCreateLeadMutation();

  const hasSessionBranch = sessionBranchUid != null;
  const effectiveBranchUid = form.branchUid ?? sessionBranchUid;

  useEffect(() => {
    if (open) {
      const base = { ...defaultForm, branchUid: sessionBranchUid };
      const merged = initialValues
        ? { ...base, ...initialValues, branchUid: (initialValues.branchUid as number | null) ?? sessionBranchUid }
        : base;
      setForm(merged as React.SetStateAction<typeof defaultForm>);
      setValidationError(null);
      setImageFile(null);
      setImagePreview(null);
      setAttachmentFiles([]);
    }
    // Keep dependency array fixed size (3) so React does not warn about changing size between renders.
  }, [open, sessionBranchUid, initialValues]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  /** When initialValues is set (e.g. visit conversion), no validation is applied. */
  function validate(): boolean {
    if (initialValues != null) {
      setValidationError(null);
      return true;
    }
    const hasName = (form.name ?? '').trim() !== '';
    const hasEmail = (form.email ?? '').trim() !== '';
    const hasPhone = (form.phone ?? '').trim() !== '';
    if (!hasName && !hasEmail && !hasPhone) {
      setValidationError('Please provide at least one of: name, email, or phone.');
      return false;
    }
    if (effectiveBranchUid == null) {
      setValidationError('Please select a branch.');
      return false;
    }
    setValidationError(null);
    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;

    let imageUrl: string | undefined;
    const attachmentUrls: string[] = [];

    try {
      for (const file of attachmentFiles) {
        try {
          const url = await uploadFile(client, file);
          attachmentUrls.push(url);
        } catch {
          // Continue with others (APK behavior)
        }
      }
      if (imageFile) {
        try {
          imageUrl = await uploadFile(client, imageFile);
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : 'Image upload failed. Creating lead without image.'
          );
        }
      }

      const branchUid = effectiveBranchUid ?? sessionBranchUid;
      const payload: CreateLeadPayload = {
        branch: { uid: branchUid! },
        name: (form.name ?? '').trim() || undefined,
        companyName: (form.companyName ?? '').trim() || undefined,
        email: (form.email ?? '').trim() || undefined,
        phone: (form.phone ?? '').trim() || undefined,
        notes: (form.notes ?? '').trim() || undefined,
        status: form.status || undefined,
        source: form.source || undefined,
        temperature: form.temperature || undefined,
        priority: form.priority || undefined,
        ...(imageUrl && { image: imageUrl }),
        ...(attachmentUrls.length > 0 && { attachments: attachmentUrls }),
        jobTitle: (form.jobTitle ?? '').trim() || undefined,
        industry: form.industry !== 'OTHER' ? form.industry : undefined,
        businessSize: form.businessSize !== 'UNKNOWN' ? form.businessSize : undefined,
        decisionMakerRole: form.decisionMakerRole !== 'UNKNOWN' ? form.decisionMakerRole : undefined,
        intent: form.intent || undefined,
        userQualityRating: form.userQualityRating,
        lifecycleStage: form.lifecycleStage || undefined,
        budgetRange: form.budgetRange !== 'UNKNOWN' ? form.budgetRange : undefined,
        ...(form.currency && { currency: form.currency }),
        estimatedValue: form.estimatedValue,
        purchaseTimeline: form.purchaseTimeline !== 'UNKNOWN' ? form.purchaseTimeline : undefined,
        preferredCommunication: form.preferredCommunication || undefined,
        timezone: form.timezone || undefined,
        bestContactTime: form.bestContactTime || undefined,
        painPoints: (form.painPoints ?? '').trim() || undefined,
        referralSource: (form.referralSource ?? '').trim() || undefined,
        competitorInfo: (form.competitorInfo ?? '').trim() || undefined,
        campaignName: (form.campaignName ?? '').trim() || undefined,
        landingPage: (form.landingPage ?? '').trim() || undefined,
        utmSource: (form.utmSource ?? '').trim() || undefined,
        utmMedium: (form.utmMedium ?? '').trim() || undefined,
        utmCampaign: (form.utmCampaign ?? '').trim() || undefined,
        utmTerm: (form.utmTerm ?? '').trim() || undefined,
        utmContent: (form.utmContent ?? '').trim() || undefined,
        ...(form.lastContactDate && { lastContactDate: form.lastContactDate }),
        ...(form.nextFollowUpDate && { nextFollowUpDate: form.nextFollowUpDate }),
      };

      const result = await createMutation.mutateAsync(payload);
      toast.success('Lead created successfully');
      onOpenChange(false);
      const createdLead = result?.data?.uid != null ? { uid: result.data.uid } : undefined;
      onSuccess?.(createdLead);
    } catch (err: unknown) {
      const axiosData =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data
          : undefined;
      const message =
        typeof axiosData?.message === 'string'
          ? axiosData.message
          : 'Failed to create lead. Please try again.';
      toast.error(message);
    }
  }

  const canSubmit = initialValues != null
    ? !createMutation.isPending
    : effectiveBranchUid != null &&
      ((form.name ?? '').trim() !== '' ||
        (form.email ?? '').trim() !== '' ||
        (form.phone ?? '').trim() !== '') &&
      !createMutation.isPending;

  function toggleSection(key: keyof typeof collapsed) {
    setCollapsed((c) => ({ ...c, [key]: !c[key] }));
  }

  function SectionTrigger({
    id,
    title,
  }: {
    id: keyof typeof collapsed;
    title: string;
  }) {
    return (
      <button
        type="button"
        onClick={() => toggleSection(id)}
        className="flex w-full items-center justify-between rounded-lg border bg-muted/50 px-3 py-2 text-left text-sm font-medium"
      >
        {title}
        {collapsed[id] ? (
          <ChevronDownIcon className="size-4" />
        ) : (
          <ChevronUpIcon className="size-4" />
        )}
      </button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[36rem] max-h-[90vh] overflow-y-auto"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>Create lead</DialogTitle>
          <DialogDescription>
            Add a new sales lead. At least one of name, email, or phone is required.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Image uploader - full width */}
          <div className="grid w-full gap-2">
            <Label>Lead image</Label>
            <div className="flex w-full flex-col gap-2">
              {imagePreview ? (
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border bg-muted">
                  <img
                    src={imagePreview}
                    alt="Lead preview"
                    className="h-full w-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute right-2 top-2"
                    onClick={() => {
                      setImageFile(null);
                      if (imageInputRef.current) imageInputRef.current.value = '';
                    }}
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-dashed bg-muted/50 text-muted-foreground text-sm">
                  No image selected
                </div>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit gap-2"
                onClick={() => imageInputRef.current?.click()}
              >
                <ImageIcon className="size-4" />
                {imagePreview ? 'Change image' : 'From gallery'}
              </Button>
            </div>
          </div>

          {/* Name, Company, Email, Phone, Notes */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="create-lead-name">Name *</Label>
              <Input
                id="create-lead-name"
                placeholder="e.g. John Doe"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-lead-company">Company</Label>
              <Input
                id="create-lead-company"
                placeholder="e.g. Acme Inc."
                value={form.companyName}
                onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="create-lead-email">Email</Label>
              <Input
                id="create-lead-email"
                type="email"
                placeholder="e.g. john@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-lead-phone">Phone</Label>
              <Input
                id="create-lead-phone"
                placeholder="e.g. +27 12 345 6789"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="create-lead-notes">Notes</Label>
            <Textarea
              id="create-lead-notes"
              placeholder="Optional notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Company details */}
          <div className="grid gap-2">
            <SectionTrigger id="companyDetails" title="Company details" />
            {!collapsed.companyDetails && (
              <div className="grid gap-4 rounded-lg border p-3">
                <div className="grid gap-2">
                  <Label>Job title</Label>
                  <Input
                    placeholder="e.g. Marketing Manager"
                    value={form.jobTitle}
                    onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Industry</Label>
                  <Select
                    value={form.industry}
                    onValueChange={(v) => setForm((f) => ({ ...f, industry: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INDUSTRY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          <span className="flex items-center gap-2">
                            <o.icon className="size-4 shrink-0" />
                            {o.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Business size</Label>
                  <Select
                    value={form.businessSize}
                    onValueChange={(v) => setForm((f) => ({ ...f, businessSize: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BUSINESS_SIZE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          <span className="flex items-center gap-2">
                            <o.icon className="size-4 shrink-0" />
                            {o.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Decision maker role</Label>
                  <Select
                    value={form.decisionMakerRole}
                    onValueChange={(v) => setForm((f) => ({ ...f, decisionMakerRole: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DECISION_MAKER_ROLE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          <span className="flex items-center gap-2">
                            <o.icon className="size-4 shrink-0" />
                            {o.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Lead qualification */}
          <div className="grid gap-2">
            <SectionTrigger id="leadQualification" title="Lead qualification" />
            {!collapsed.leadQualification && (
              <div className="grid gap-4 rounded-lg border p-3">
                <div className="grid gap-2">
                  <Label>Intent</Label>
                  <Select
                    value={form.intent}
                    onValueChange={(v) => setForm((f) => ({ ...f, intent: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEAD_INTENT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          <span className="flex items-center gap-2">
                            <o.icon className="size-4 shrink-0" />
                            {o.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Temperature</Label>
                    <Select
                      value={form.temperature}
                      onValueChange={(v) => setForm((f) => ({ ...f, temperature: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LEAD_TEMPERATURE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            <span className="flex items-center gap-2">
                              <o.icon className="size-4 shrink-0" />
                              {o.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Priority</Label>
                    <Select
                      value={form.priority}
                      onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LEAD_PRIORITY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            <span className="flex items-center gap-2">
                              <o.icon className="size-4 shrink-0" />
                              {o.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Source</Label>
                  <Select
                    value={form.source}
                    onValueChange={(v) => setForm((f) => ({ ...f, source: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEAD_SOURCE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          <span className="flex items-center gap-2">
                            <o.icon className="size-4 shrink-0" />
                            {o.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Lifecycle stage</Label>
                  <Select
                    value={form.lifecycleStage}
                    onValueChange={(v) => setForm((f) => ({ ...f, lifecycleStage: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LIFECYCLE_STAGE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          <span className="flex items-center gap-2">
                            <o.icon className="size-4 shrink-0" />
                            {o.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Quality rating (1-5)</Label>
                  <Select
                    value={String(form.userQualityRating)}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, userQualityRating: Number(v) }))
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} / 5
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Status (top-level) */}
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    <span className="flex items-center gap-2">
                      <o.icon className="size-4 shrink-0" />
                      {o.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Financial */}
          <div className="grid gap-2">
            <SectionTrigger id="financial" title="Financial information" />
            {!collapsed.financial && (
              <div className="grid gap-4 rounded-lg border p-3">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Budget range</Label>
                    <Select
                      value={form.budgetRange}
                      onValueChange={(v) => setForm((f) => ({ ...f, budgetRange: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BUDGET_RANGE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            <span className="flex items-center gap-2">
                              <o.icon className="size-4 shrink-0" />
                              {o.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Currency</Label>
                    <Select
                      value={form.currency}
                      onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            <span className="flex items-center gap-2">
                              <o.icon className="size-4 shrink-0" />
                              {o.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Estimated value</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="e.g. 50000"
                      value={form.estimatedValue ?? ''}
                      onChange={(e) => {
                        const v = e.target.value ? Number(e.target.value) : undefined;
                        setForm((f) => ({ ...f, estimatedValue: v }));
                      }}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Purchase timeline</Label>
                    <Select
                      value={form.purchaseTimeline}
                      onValueChange={(v) => setForm((f) => ({ ...f, purchaseTimeline: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIMELINE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            <span className="flex items-center gap-2">
                              <o.icon className="size-4 shrink-0" />
                              {o.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Communication */}
          <div className="grid gap-2">
            <SectionTrigger id="communication" title="Communication preferences" />
            {!collapsed.communication && (
              <div className="grid gap-4 rounded-lg border p-3">
                <div className="grid gap-2">
                  <Label>Preferred communication</Label>
                  <Select
                    value={form.preferredCommunication}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, preferredCommunication: v }))
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COMMUNICATION_PREFERENCE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          <span className="flex items-center gap-2">
                            <o.icon className="size-4 shrink-0" />
                            {o.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Timezone</Label>
                  <Select
                    value={form.timezone}
                    onValueChange={(v) => setForm((f) => ({ ...f, timezone: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          <span className="flex items-center gap-2">
                            <o.icon className="size-4 shrink-0" />
                            {o.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Best contact time</Label>
                  <Select
                    value={form.bestContactTime}
                    onValueChange={(v) => setForm((f) => ({ ...f, bestContactTime: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BEST_CONTACT_TIME_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          <span className="flex items-center gap-2">
                            <o.icon className="size-4 shrink-0" />
                            {o.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Additional info */}
          <div className="grid gap-2">
            <SectionTrigger id="additional" title="Additional information" />
            {!collapsed.additional && (
              <div className="grid gap-4 rounded-lg border p-3">
                <div className="grid gap-2">
                  <Label>Pain points</Label>
                  <Textarea
                    placeholder="List main pain points..."
                    value={form.painPoints}
                    onChange={(e) => setForm((f) => ({ ...f, painPoints: e.target.value }))}
                    rows={2}
                    className="resize-none"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Referral source</Label>
                  <Input
                    placeholder="Who referred this lead?"
                    value={form.referralSource}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, referralSource: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Competitor info</Label>
                  <Input
                    placeholder="Current solutions they use"
                    value={form.competitorInfo}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, competitorInfo: e.target.value }))
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Marketing */}
          <div className="grid gap-2">
            <SectionTrigger id="marketing" title="Marketing information" />
            {!collapsed.marketing && (
              <div className="grid gap-4 rounded-lg border p-3">
                <div className="grid gap-2">
                  <Label>Campaign name</Label>
                  <Input
                    placeholder="e.g. Summer2024"
                    value={form.campaignName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, campaignName: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Landing page</Label>
                  <Input
                    placeholder="https://..."
                    value={form.landingPage}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, landingPage: e.target.value }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>UTM source</Label>
                    <Input
                      placeholder="google"
                      value={form.utmSource}
                      onChange={(e) => setForm((f) => ({ ...f, utmSource: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>UTM medium</Label>
                    <Input
                      placeholder="cpc"
                      value={form.utmMedium}
                      onChange={(e) => setForm((f) => ({ ...f, utmMedium: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>UTM campaign</Label>
                  <Input
                    placeholder="summer-2024"
                    value={form.utmCampaign}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, utmCampaign: e.target.value }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>UTM term</Label>
                    <Input
                      value={form.utmTerm}
                      onChange={(e) => setForm((f) => ({ ...f, utmTerm: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>UTM content</Label>
                    <Input
                      value={form.utmContent}
                      onChange={(e) => setForm((f) => ({ ...f, utmContent: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* File attachments */}
          <div className="grid gap-2">
            <SectionTrigger id="fileAttachments" title="File attachments" />
            {!collapsed.fileAttachments && (
              <div className="grid gap-4 rounded-lg border p-3">
                <input
                  ref={attachmentInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    setAttachmentFiles((prev) => [...prev, ...files]);
                    e.target.value = '';
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit gap-2"
                  onClick={() => attachmentInputRef.current?.click()}
                >
                  <PaperclipIcon className="size-4" />
                  Add files (PDF, images, documents)
                </Button>
                {attachmentFiles.length > 0 && (
                  <ul className="flex flex-col gap-1 text-sm">
                    {attachmentFiles.map((file, i) => (
                      <li
                        key={`${file.name}-${i}`}
                        className="flex items-center justify-between rounded border px-2 py-1"
                      >
                        <span className="truncate">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() =>
                            setAttachmentFiles((prev) =>
                              prev.filter((_, j) => j !== i)
                            )
                          }
                        >
                          <XIcon className="size-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Branch */}
          {!hasSessionBranch && (
            <div className="grid gap-2">
              <Label>Branch (required)</Label>
              <Select
                value={effectiveBranchUid != null ? String(effectiveBranchUid) : ''}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, branchUid: v ? Number(v) : null }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.uid} value={String(b.uid)}>
                      <span className="flex items-center gap-2">
                        <MapPinIcon className="size-4 shrink-0" />
                        {b.name ?? `Branch ${b.uid}`}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {validationError && (
            <p className="text-sm text-destructive" role="alert">
              {validationError}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!canSubmit} className="gap-2">
            {createMutation.isPending ? (
              <>
                <Loader2Icon className="size-4 shrink-0 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <HandshakeIcon className="size-4 shrink-0" />
                Create lead
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

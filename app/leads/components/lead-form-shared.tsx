'use client';

import { useTranslation } from 'react-i18next';
import type { Dispatch, RefObject, SetStateAction } from 'react';
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
import { ChevronDownIcon, ChevronUpIcon, XIcon, MapPinIcon } from '@/lib/icons';
import type { CreateLeadPayload, UpdateLeadPayload } from '@/api/types/leads';
import type { BranchListItem } from '@/api/types/branch';
import toast from 'react-hot-toast';
import { isAllowedLeadAttachment, isHttpsAttachmentUrl } from '@/lib/lead-attachments';

/** Collapsible section ids (accordion). */
export type LeadFormCollapsedKey =
  | 'companyDetails'
  | 'leadQualification'
  | 'financial'
  | 'communication'
  | 'additional'
  | 'marketing'
  | 'fileAttachments';

export type LeadFormCollapsedState = Record<LeadFormCollapsedKey, boolean>;

export const DEFAULT_LEAD_FORM_COLLAPSED: LeadFormCollapsedState = {
  companyDetails: true,
  leadQualification: true,
  financial: true,
  communication: true,
  additional: true,
  marketing: true,
  fileAttachments: true,
};

export type LeadFormState = {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  secondaryPhoneNumber: string;
  whatsAppNumber: string;
  form: string;
  channel: string;
  labelsComma: string;
  notes: string;
  status: string;
  source: string;
  temperature: string;
  priority: string;
  branchUid: number | null;
  jobTitle: string;
  industry: string;
  businessSize: string;
  decisionMakerRole: string;
  intent: string;
  userQualityRating: number;
  lifecycleStage: string;
  budgetRange: string;
  currency: string;
  estimatedValue: number | undefined;
  purchaseTimeline: string;
  preferredCommunication: string;
  timezone: string;
  bestContactTime: string;
  painPoints: string;
  referralSource: string;
  competitorInfo: string;
  campaignName: string;
  landingPage: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  lastContactDate: string | undefined;
  nextFollowUpDate: string | undefined;
};

export function createDefaultLeadForm(sessionBranchUid: number | null): LeadFormState {
  return {
    name: '',
    companyName: '',
    email: '',
    phone: '',
    secondaryPhoneNumber: '',
    whatsAppNumber: '',
    form: '',
    channel: '',
    labelsComma: '',
    notes: '',
    status: 'PENDING',
    source: 'WEBSITE',
    temperature: 'WARM',
    priority: 'MEDIUM',
    branchUid: sessionBranchUid,
    jobTitle: '',
    industry: 'OTHER',
    businessSize: 'UNKNOWN',
    decisionMakerRole: 'UNKNOWN',
    intent: 'ENQUIRY',
    userQualityRating: 3,
    lifecycleStage: 'LEAD',
    budgetRange: 'UNKNOWN',
    currency: 'ZAR',
    estimatedValue: undefined,
    purchaseTimeline: 'UNKNOWN',
    preferredCommunication: 'EMAIL',
    timezone: 'Africa/Johannesburg',
    bestContactTime: 'business_hours',
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
    lastContactDate: undefined,
    nextFollowUpDate: undefined,
  };
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function dateSlice(v: unknown): string | undefined {
  if (typeof v !== 'string' || !v.trim()) return undefined;
  return v.slice(0, 10);
}

function labelsToComma(labels: unknown): string {
  if (!Array.isArray(labels)) return '';
  return labels.filter((x): x is string => typeof x === 'string').join(', ');
}

/** Map API lead / detail record into full form state for edit. */
export function leadRecordToLeadForm(
  lead: Record<string, unknown>,
  sessionBranchUid: number | null = null
): LeadFormState {
  const base = createDefaultLeadForm(sessionBranchUid);
  const rating = lead.userQualityRating;
  const ev = lead.estimatedValue;
  return {
    ...base,
    name: str(lead.name),
    companyName: str(lead.companyName),
    email: str(lead.email),
    phone: str(lead.phone),
    secondaryPhoneNumber: str(lead.secondaryPhoneNumber),
    whatsAppNumber: str(lead.whatsAppNumber),
    form: str(lead.form),
    channel: str(lead.channel),
    labelsComma: labelsToComma(lead.labels),
    notes: str(lead.notes),
    status: str(lead.status) || base.status,
    source: str(lead.source) || base.source,
    temperature: str(lead.temperature) || base.temperature,
    priority: str(lead.priority) || base.priority,
    jobTitle: str(lead.jobTitle),
    industry: str(lead.industry) || base.industry,
    businessSize: str(lead.businessSize) || base.businessSize,
    decisionMakerRole: str(lead.decisionMakerRole) || base.decisionMakerRole,
    intent: str(lead.intent) || base.intent,
    userQualityRating:
      typeof rating === 'number' && !Number.isNaN(rating) ? rating : base.userQualityRating,
    lifecycleStage: str(lead.lifecycleStage) || base.lifecycleStage,
    budgetRange: str(lead.budgetRange) || base.budgetRange,
    currency: str(lead.currency) || base.currency,
    estimatedValue: typeof ev === 'number' && !Number.isNaN(ev) ? ev : undefined,
    purchaseTimeline: str(lead.purchaseTimeline) || base.purchaseTimeline,
    preferredCommunication: str(lead.preferredCommunication) || base.preferredCommunication,
    timezone: str(lead.timezone) || base.timezone,
    bestContactTime: str(lead.bestContactTime) || base.bestContactTime,
    painPoints: str(lead.painPoints),
    referralSource: str(lead.referralSource),
    competitorInfo: str(lead.competitorInfo),
    campaignName: str(lead.campaignName),
    landingPage: str(lead.landingPage),
    utmSource: str(lead.utmSource),
    utmMedium: str(lead.utmMedium),
    utmCampaign: str(lead.utmCampaign),
    utmTerm: str(lead.utmTerm),
    utmContent: str(lead.utmContent),
    lastContactDate: dateSlice(lead.lastContactDate),
    nextFollowUpDate: dateSlice(lead.nextFollowUpDate),
  };
}

function labelsFromComma(
  comma: string,
  whenEmpty: 'omit' | 'empty-array'
): string[] | undefined {
  const arr = comma
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (arr.length) return arr;
  return whenEmpty === 'empty-array' ? [] : undefined;
}

function mapFormToApiFields(
  form: LeadFormState,
  labelEmpty: 'omit' | 'empty-array'
): Omit<CreateLeadPayload, 'branch' | 'image' | 'attachments'> {
  return {
    name: (form.name ?? '').trim() || undefined,
    companyName: (form.companyName ?? '').trim() || undefined,
    email: (form.email ?? '').trim() || undefined,
    phone: (form.phone ?? '').trim() || undefined,
    notes: (form.notes ?? '').trim() || undefined,
    status: form.status || undefined,
    source: form.source || undefined,
    temperature: form.temperature || undefined,
    priority: form.priority || undefined,
    secondaryPhoneNumber: (form.secondaryPhoneNumber ?? '').trim() || undefined,
    whatsAppNumber: (form.whatsAppNumber ?? '').trim() || undefined,
    form: (form.form ?? '').trim() || undefined,
    channel: (form.channel ?? '').trim() || undefined,
    labels: labelsFromComma(form.labelsComma ?? '', labelEmpty),
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
}

export function formStateToCreatePayload(
  form: LeadFormState,
  args: { branchUid: number; imageUrl?: string; attachmentUrls?: string[] }
): CreateLeadPayload {
  const fields = mapFormToApiFields(form, 'omit');
  return {
    branch: { uid: args.branchUid },
    ...fields,
    ...(args.imageUrl && { image: args.imageUrl }),
    ...(args.attachmentUrls?.length && { attachments: args.attachmentUrls }),
  };
}

export function formStateToUpdatePayload(
  form: LeadFormState,
  args: { imageUrl?: string; attachmentUrls?: string[] }
): UpdateLeadPayload {
  const fields = mapFormToApiFields(form, 'empty-array');
  return {
    ...fields,
    ...(args.imageUrl && { image: args.imageUrl }),
    ...(args.attachmentUrls !== undefined && { attachments: args.attachmentUrls }),
  };
}

export function LeadFormSectionTrigger({
  title,
  collapsed,
  onToggle,
}: {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-lg border bg-muted/50 px-3 py-2 text-left text-sm font-medium"
    >
      {title}
      {collapsed ? (
        <ChevronDownIcon className="size-4" />
      ) : (
        <ChevronUpIcon className="size-4" />
      )}
    </button>
  );
}

export interface LeadFormBodyProps {
  form: LeadFormState;
  setForm: Dispatch<SetStateAction<LeadFormState>>;
  collapsed: LeadFormCollapsedState;
  toggleSection: (key: LeadFormCollapsedKey) => void;
  idPrefix: string;
  /** Shown in image area: blob URL from new file or existing server URL */
  displayImageSrc: string | null;
  imageInputRef: RefObject<HTMLInputElement | null>;
  onImageInputChange: (file: File | null) => void;
  onClearImageSelection: () => void;
  attachmentFiles: File[];
  attachmentInputRef: RefObject<HTMLInputElement | null>;
  onAttachmentFilesAdded: (files: File[]) => void;
  onRemovePendingAttachment: (index: number) => void;
  /** Existing URLs (edit); optional remove */
  existingAttachmentUrls?: string[];
  onRemoveExistingAttachment?: (url: string) => void;
  showBranchPicker?: boolean;
  branches?: BranchListItem[];
  effectiveBranchUid?: number | null;
  getBranchDisplayLabel?: (b: BranchListItem) => string;
  validationError?: string | null;
}

export function LeadFormBody({
  form,
  setForm,
  collapsed,
  toggleSection,
  idPrefix,
  displayImageSrc,
  imageInputRef,
  onImageInputChange,
  onClearImageSelection,
  attachmentFiles,
  attachmentInputRef,
  onAttachmentFilesAdded,
  onRemovePendingAttachment,
  existingAttachmentUrls = [],
  onRemoveExistingAttachment,
  showBranchPicker = false,
  branches = [],
  effectiveBranchUid,
  getBranchDisplayLabel,
  validationError,
}: LeadFormBodyProps) {
  const { t } = useTranslation('screens');
  return (
    <div className="grid gap-4 py-2">
      <div className="grid w-full gap-2">
        <Label>{t('leads.form.leadImage')}</Label>
        <div className="flex w-full flex-col gap-2">
          {displayImageSrc ? (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border bg-muted">
              <img src={displayImageSrc} alt={t('leads.form.leadPreview')} className="h-full w-full object-cover" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute right-2 top-2"
                onClick={onClearImageSelection}
              >
                <XIcon className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-dashed bg-muted/50 text-muted-foreground text-sm">{t('leads.form.noImage')}</div>
          )}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onImageInputChange(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit gap-2"
            onClick={() => imageInputRef.current?.click()}
          >
            <ImageIcon className="size-4" />
            {displayImageSrc ? t('leads.form.changeImage') : t('leads.form.fromGallery')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-name`}>{t('leads.form.name')}</Label>
          <Input
            id={`${idPrefix}-name`}
            placeholder={t('leads.form.namePlaceholder')}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-company`}>{t('leads.form.company')}</Label>
          <Input
            id={`${idPrefix}-company`}
            placeholder={t('leads.form.companyPlaceholder')}
            value={form.companyName}
            onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-email`}>{t('leads.form.email')}</Label>
          <Input
            id={`${idPrefix}-email`}
            type="email"
            placeholder={t('leads.form.emailPlaceholder')}
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-phone`}>{t('leads.form.phone')}</Label>
          <Input
            id={`${idPrefix}-phone`}
            placeholder={t('leads.form.phonePlaceholder')}
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-secondary-phone`}>{t('leads.form.secondaryPhone')}</Label>
          <Input
            id={`${idPrefix}-secondary-phone`}
            placeholder={t('leads.form.optional')}
            value={form.secondaryPhoneNumber}
            onChange={(e) => setForm((f) => ({ ...f, secondaryPhoneNumber: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-whatsapp`}>{t('leads.form.whatsapp')}</Label>
          <Input
            id={`${idPrefix}-whatsapp`}
            placeholder={t('leads.form.optional')}
            value={form.whatsAppNumber}
            onChange={(e) => setForm((f) => ({ ...f, whatsAppNumber: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-form`}>{t('leads.form.form')}</Label>
          <Input
            id={`${idPrefix}-form`}
            placeholder={t('leads.form.formPlaceholder')}
            value={form.form}
            onChange={(e) => setForm((f) => ({ ...f, form: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-channel`}>{t('leads.form.channel')}</Label>
          <Input
            id={`${idPrefix}-channel`}
            placeholder={t('leads.form.channelPlaceholder')}
            value={form.channel}
            onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-labels`}>{t('leads.form.labels')}</Label>
        <Input
          id={`${idPrefix}-labels`}
          placeholder={t('leads.form.labelsPlaceholder')}
          value={form.labelsComma}
          onChange={(e) => setForm((f) => ({ ...f, labelsComma: e.target.value }))}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-notes`}>{t('leads.form.notes')}</Label>
        <Textarea
          id={`${idPrefix}-notes`}
          placeholder={t('leads.form.notesPlaceholder')}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={3}
          className="resize-none"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-last-contact`}>{t('leads.form.lastContact')}</Label>
          <Input
            id={`${idPrefix}-last-contact`}
            type="date"
            value={form.lastContactDate || ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                lastContactDate: e.target.value || undefined,
              }))
            }
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-next-followup`}>{t('leads.form.nextFollowUp')}</Label>
          <Input
            id={`${idPrefix}-next-followup`}
            type="date"
            value={form.nextFollowUpDate || ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                nextFollowUpDate: e.target.value || undefined,
              }))
            }
          />
        </div>
      </div>

      <div className="grid gap-2">
        <LeadFormSectionTrigger
          title={t('leads.form.companyDetails')}
          collapsed={collapsed.companyDetails}
          onToggle={() => toggleSection('companyDetails')}
        />
        {!collapsed.companyDetails && (
          <div className="grid gap-4 rounded-lg border p-3">
            <div className="grid gap-2">
              <Label>{t('leads.form.jobTitle')}</Label>
              <Input
                placeholder={t('leads.form.jobTitlePlaceholder')}
                value={form.jobTitle}
                onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('leads.form.industry')}</Label>
              <Select
                value={form.industry}
                onValueChange={(v) => setForm((f) => ({ ...f, industry: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <span className="flex items-center gap-2">
                        <o.icon className="size-4 shrink-0" />
                        {t(o.labelKey)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t('leads.form.businessSize')}</Label>
              <Select
                value={form.businessSize}
                onValueChange={(v) => setForm((f) => ({ ...f, businessSize: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_SIZE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <span className="flex items-center gap-2">
                        <o.icon className="size-4 shrink-0" />
                        {t(o.labelKey)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t('leads.form.decisionMaker')}</Label>
              <Select
                value={form.decisionMakerRole}
                onValueChange={(v) => setForm((f) => ({ ...f, decisionMakerRole: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DECISION_MAKER_ROLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <span className="flex items-center gap-2">
                        <o.icon className="size-4 shrink-0" />
                        {t(o.labelKey)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <LeadFormSectionTrigger
          title={t('leads.form.qualification')}
          collapsed={collapsed.leadQualification}
          onToggle={() => toggleSection('leadQualification')}
        />
        {!collapsed.leadQualification && (
          <div className="grid gap-4 rounded-lg border p-3">
            <div className="grid gap-2">
              <Label>{t('leads.form.intent')}</Label>
              <Select
                value={form.intent}
                onValueChange={(v) => setForm((f) => ({ ...f, intent: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_INTENT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <span className="flex items-center gap-2">
                        <o.icon className="size-4 shrink-0" />
                        {t(o.labelKey)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('leads.form.temperature')}</Label>
                <Select
                  value={form.temperature}
                  onValueChange={(v) => setForm((f) => ({ ...f, temperature: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_TEMPERATURE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        <span className="flex items-center gap-2">
                          <o.icon className="size-4 shrink-0" />
                          {t(o.labelKey)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t('leads.form.priority')}</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_PRIORITY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        <span className="flex items-center gap-2">
                          <o.icon className="size-4 shrink-0" />
                          {t(o.labelKey)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t('leads.form.source')}</Label>
              <Select
                value={form.source}
                onValueChange={(v) => setForm((f) => ({ ...f, source: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <span className="flex items-center gap-2">
                        <o.icon className="size-4 shrink-0" />
                        {t(o.labelKey)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t('leads.form.lifecycle')}</Label>
              <Select
                value={form.lifecycleStage}
                onValueChange={(v) => setForm((f) => ({ ...f, lifecycleStage: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIFECYCLE_STAGE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <span className="flex items-center gap-2">
                        <o.icon className="size-4 shrink-0" />
                        {t(o.labelKey)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t('leads.form.quality')}</Label>
              <Select
                value={String(form.userQualityRating)}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, userQualityRating: Number(v) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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

      <div className="grid gap-2">
        <Label>{t('leads.form.status')}</Label>
        <Select
          value={form.status}
          onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEAD_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                <span className="flex items-center gap-2">
                  <o.icon className="size-4 shrink-0" />
                  {t(o.labelKey)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <LeadFormSectionTrigger
          title={t('leads.form.financial')}
          collapsed={collapsed.financial}
          onToggle={() => toggleSection('financial')}
        />
        {!collapsed.financial && (
          <div className="grid gap-4 rounded-lg border p-3">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>{t('leads.form.budget')}</Label>
                <Select
                  value={form.budgetRange}
                  onValueChange={(v) => setForm((f) => ({ ...f, budgetRange: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_RANGE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        <span className="flex items-center gap-2">
                          <o.icon className="size-4 shrink-0" />
                          {t(o.labelKey)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t('leads.form.currency')}</Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                <Label>{t('leads.form.estimatedValue')}</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder={t('leads.form.valuePlaceholder')}
                  value={form.estimatedValue ?? ''}
                  onChange={(e) => {
                    const v = e.target.value ? Number(e.target.value) : undefined;
                    setForm((f) => ({ ...f, estimatedValue: v }));
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t('leads.form.timeline')}</Label>
                <Select
                  value={form.purchaseTimeline}
                  onValueChange={(v) => setForm((f) => ({ ...f, purchaseTimeline: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMELINE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        <span className="flex items-center gap-2">
                          <o.icon className="size-4 shrink-0" />
                          {t(o.labelKey)}
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

      <div className="grid gap-2">
        <LeadFormSectionTrigger
          title={t('leads.form.communication')}
          collapsed={collapsed.communication}
          onToggle={() => toggleSection('communication')}
        />
        {!collapsed.communication && (
          <div className="grid gap-4 rounded-lg border p-3">
            <div className="grid gap-2">
              <Label>{t('leads.form.preferred')}</Label>
              <Select
                value={form.preferredCommunication}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, preferredCommunication: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMUNICATION_PREFERENCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <span className="flex items-center gap-2">
                        <o.icon className="size-4 shrink-0" />
                        {t(o.labelKey)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t('leads.form.timezone')}</Label>
              <Select
                value={form.timezone}
                onValueChange={(v) => setForm((f) => ({ ...f, timezone: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <span className="flex items-center gap-2">
                        <o.icon className="size-4 shrink-0" />
                        {t(o.labelKey)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t('leads.form.bestTime')}</Label>
              <Select
                value={form.bestContactTime}
                onValueChange={(v) => setForm((f) => ({ ...f, bestContactTime: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BEST_CONTACT_TIME_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <span className="flex items-center gap-2">
                        <o.icon className="size-4 shrink-0" />
                        {t(o.labelKey)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <LeadFormSectionTrigger
          title={t('leads.form.additional')}
          collapsed={collapsed.additional}
          onToggle={() => toggleSection('additional')}
        />
        {!collapsed.additional && (
          <div className="grid gap-4 rounded-lg border p-3">
            <div className="grid gap-2">
              <Label>{t('leads.form.painPoints')}</Label>
              <Textarea
                placeholder={t('leads.form.painPlaceholder')}
                value={form.painPoints}
                onChange={(e) => setForm((f) => ({ ...f, painPoints: e.target.value }))}
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('leads.form.referral')}</Label>
              <Input
                placeholder={t('leads.form.referralPlaceholder')}
                value={form.referralSource}
                onChange={(e) =>
                  setForm((f) => ({ ...f, referralSource: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('leads.form.competitor')}</Label>
              <Input
                placeholder={t('leads.form.competitorPlaceholder')}
                value={form.competitorInfo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, competitorInfo: e.target.value }))
                }
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <LeadFormSectionTrigger
          title={t('leads.form.marketing')}
          collapsed={collapsed.marketing}
          onToggle={() => toggleSection('marketing')}
        />
        {!collapsed.marketing && (
          <div className="grid gap-4 rounded-lg border p-3">
            <div className="grid gap-2">
              <Label>{t('leads.form.campaign')}</Label>
              <Input
                placeholder={t('leads.form.campaignPlaceholder')}
                value={form.campaignName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, campaignName: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('leads.form.landing')}</Label>
              <Input
                placeholder={t('leads.form.landingPlaceholder')}
                value={form.landingPage}
                onChange={(e) =>
                  setForm((f) => ({ ...f, landingPage: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('leads.form.utmSource')}</Label>
                <Input
                  placeholder="google"
                  value={form.utmSource}
                  onChange={(e) => setForm((f) => ({ ...f, utmSource: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t('leads.form.utmMedium')}</Label>
                <Input
                  placeholder="cpc"
                  value={form.utmMedium}
                  onChange={(e) => setForm((f) => ({ ...f, utmMedium: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t('leads.form.utmCampaign')}</Label>
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
                <Label>{t('leads.form.utmTerm')}</Label>
                <Input
                  value={form.utmTerm}
                  onChange={(e) => setForm((f) => ({ ...f, utmTerm: e.target.value }))}
                  placeholder={t('leads.form.utmTermPlaceholder')}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t('leads.form.utmContent')}</Label>
                <Input
                  value={form.utmContent}
                  onChange={(e) => setForm((f) => ({ ...f, utmContent: e.target.value }))}
                  placeholder={t('leads.form.utmContentPlaceholder')}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <LeadFormSectionTrigger
          title={t('leads.form.attachments')}
          collapsed={collapsed.fileAttachments}
          onToggle={() => toggleSection('fileAttachments')}
        />
        {!collapsed.fileAttachments && (
          <div className="grid gap-4 rounded-lg border p-3">
            <input
              ref={attachmentInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.heic,.heif,.bmp,.doc,.docx,.xls,.xlsx,.txt,.csv,application/pdf,image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                const allowed = files.filter(isAllowedLeadAttachment);
                if (allowed.length !== files.length) {
                  toast.error(t('leads.form.attachmentError'));
                }
                if (allowed.length > 0) onAttachmentFilesAdded(allowed);
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
              <PaperclipIcon className="size-4" />{t('leads.form.addFiles')}</Button>
            {existingAttachmentUrls.length > 0 && (
              <ul className="flex flex-col gap-1 text-sm">
                {existingAttachmentUrls.map((url) => {
                  const linkable = isHttpsAttachmentUrl(url);
                  const label = url.length > 60 ? `${url.slice(0, 60)}…` : url;
                  return (
                  <li
                    key={url}
                    className="flex items-center justify-between gap-2 rounded border px-2 py-1"
                  >
                    {linkable ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-0 truncate text-primary underline"
                      >
                        {label}
                      </a>
                    ) : (
                      <span className="min-w-0 truncate text-muted-foreground">{label}</span>
                    )}
                    {onRemoveExistingAttachment ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => onRemoveExistingAttachment(url)}
                      >
                        <XIcon className="size-4" />
                      </Button>
                    ) : null}
                  </li>
                  );
                })}
              </ul>
            )}
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
                      onClick={() => onRemovePendingAttachment(i)}
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

      {showBranchPicker && getBranchDisplayLabel ? (
        <div className="grid gap-2">
          <Label>{t('leads.form.branchRequired')}</Label>
          <Select
            value={effectiveBranchUid != null ? String(effectiveBranchUid) : ''}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, branchUid: v ? Number(v) : null }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t('leads.form.selectBranch')} />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.uid} value={String(b.uid)}>
                  <span className="flex items-center gap-2">
                    <MapPinIcon className="size-4 shrink-0" />
                    {getBranchDisplayLabel(b) || t('leads.form.branchFallback', { uid: b.uid })}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {validationError ? (
        <p className="text-sm text-destructive" role="alert">
          {validationError}
        </p>
      ) : null}
    </div>
  );
}

export type CreateLeadModalInitialValues = Partial<
  Record<keyof LeadFormState, string | number | null | undefined>
>;

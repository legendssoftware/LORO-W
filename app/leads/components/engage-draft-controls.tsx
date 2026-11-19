'use client';

import { useTranslation } from 'react-i18next';
import { INDUSTRY_OPTIONS } from '@/lib/lead-form-utils';
import {
  ENGAGE_INTENT_OPTIONS,
  ENGAGE_MIXED_INDUSTRY,
  ENGAGE_TONE_OPTIONS,
  type EngageIntent,
  type EngageTone,
} from '@/lib/engage-draft';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type EngageDraftControlsProps = {
  intent: EngageIntent;
  tone: EngageTone;
  /** Industry enum value, or empty when the bulk draft stays industry-neutral. */
  industry: string;
  need: string;
  /** Bulk engage can leave industry unset so one message fits every lead. */
  allowMixedIndustry: boolean;
  onIntentChange: (intent: EngageIntent) => void;
  onToneChange: (tone: EngageTone) => void;
  onIndustryChange: (industry: string) => void;
  onNeedChange: (need: string) => void;
};

/**
 * Intent, tone, industry, and need for an Engage draft.
 */
export function EngageDraftControls({
  intent,
  tone,
  industry,
  need,
  allowMixedIndustry,
  onIntentChange,
  onToneChange,
  onIndustryChange,
  onNeedChange,
}: EngageDraftControlsProps) {
  const { t } = useTranslation('screens');
  const industryValue = industry || (allowMixedIndustry ? ENGAGE_MIXED_INDUSTRY : '__none__');

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">{t('leads.intent')}</Label>
          <Select value={intent} onValueChange={(value) => onIntentChange(value as EngageIntent)}>
            <SelectTrigger className="mt-1 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENGAGE_INTENT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{t('leads.tone')}</Label>
          <Select value={tone} onValueChange={(value) => onToneChange(value as EngageTone)}>
            <SelectTrigger className="mt-1 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENGAGE_TONE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs">{t('leads.industry')}</Label>
        <Select
          value={industryValue}
          onValueChange={(value) =>
            onIndustryChange(value === ENGAGE_MIXED_INDUSTRY || value === '__none__' ? '' : value)
          }
        >
          <SelectTrigger className="mt-1 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allowMixedIndustry ? (
              <SelectItem value={ENGAGE_MIXED_INDUSTRY}>{t('leads.useEachIndustry')}</SelectItem>
            ) : (
              <SelectItem value="__none__">{t('leads.notSet')}</SelectItem>
            )}
            {INDUSTRY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">{t('leads.need')}</Label>
        <Input
          value={need}
          onChange={(event) => onNeedChange(event.target.value.slice(0, 160))}
          className="mt-1 h-8 text-sm"
          placeholder={t('leads.needPlaceholder')}
          maxLength={160}
        />
      </div>
    </div>
  );
}

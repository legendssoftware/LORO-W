'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import type { PulseMood, PulsePeriod, PulseSubmitBody, PulseTalkTo } from '@/api/types/pulse';
import { getMissingPulseFields, NO_CONTRIBUTOR, toggleContributor } from '@/lib/pulse-form';

const MOODS: { value: PulseMood; label: string }[] = [
  { value: 'excellent', label: '😄 Excellent' },
  { value: 'good', label: '🙂 Good' },
  { value: 'okay', label: '😐 Okay' },
  { value: 'stressed', label: '😟 Stressed' },
  { value: 'not_feeling_well', label: '😞 Not Feeling Well' },
];

const MORNING_TAGS = [
  { value: 'feeling_tired', label: 'Feeling tired' },
  { value: 'personal_or_family', label: 'Personal or family matters' },
  { value: 'financial_concerns', label: 'Financial concerns' },
  { value: 'health', label: 'Health' },
  { value: 'work_related_issue', label: 'Work-related issue' },
  { value: 'conflict_with_colleague', label: 'Conflict with colleague' },
  { value: 'conflict_with_manager', label: 'Conflict with manager' },
  { value: 'poor_sleep', label: 'Poor sleep' },
  { value: NO_CONTRIBUTOR, label: 'Nothing in particular' },
  { value: 'other', label: 'Other' },
];

const EVENING_TAGS = [
  { value: 'customers', label: 'Customers' },
  { value: 'teamwork', label: 'Teamwork' },
  { value: 'my_manager', label: 'My Manager' },
  { value: 'personal_matters', label: 'Personal Matters' },
  { value: 'achieved_my_goals', label: 'Achieved my goals' },
  { value: 'felt_appreciated', label: 'Felt appreciated' },
  { value: 'equipment_system_issues', label: 'Equipment/System Issues' },
  { value: 'training_needed', label: 'Training Needed' },
  { value: NO_CONTRIBUTOR, label: 'Nothing in particular' },
  { value: 'other', label: 'Other' },
];

const TALK_TO: { value: PulseTalkTo; label: string }[] = [
  { value: 'none', label: "No, I'm okay" },
  { value: 'manager', label: 'My Manager' },
  { value: 'hr', label: 'HR' },
  { value: 'regional_manager', label: 'Regional Manager' },
  { value: 'confidential', label: 'Confidential Support' },
];

const COMMENTS_MAX_LENGTH = 2000;

/** Section heading; a trailing asterisk marks the sections that must be answered. */
function SectionTitle({ children, required = true }: { children: string; required?: boolean }) {
  return (
    <p className="text-sm font-medium">
      {children}
      {required ? <span className="text-destructive" aria-hidden> *</span> : null}
    </p>
  );
}

export interface PulseDialogProps {
  open: boolean;
  period: PulsePeriod;
  submitting?: boolean;
  /**
   * Abandons the pending shift action (clock-in or clock-out). The pulse is mandatory, so this
   * never lets the shift proceed: it is only reachable through Escape.
   */
  onCancel: () => void;
  onSubmit: (body: PulseSubmitBody) => void;
}

export function PulseDialog({ open, period, submitting, onCancel, onSubmit }: PulseDialogProps) {
  const [mood, setMood] = useState<PulseMood | ''>('');
  const [contributors, setContributors] = useState<string[]>([]);
  // Nothing is pre-selected: an unanswered question must not be recorded as "No".
  const [talkTo, setTalkTo] = useState<PulseTalkTo | null>(null);
  const [followUp, setFollowUp] = useState<'no' | 'yes' | ''>('');
  const [comments, setComments] = useState('');

  useEffect(() => {
    if (!open) return;
    setMood('');
    setContributors([]);
    setTalkTo(null);
    setFollowUp('');
    setComments('');
  }, [open, period]);

  const tags = period === 'morning' ? MORNING_TAGS : EVENING_TAGS;
  const title = period === 'morning' ? 'Start My Day' : 'Finish My Day';
  const description =
    period === 'morning'
      ? 'How are you feeling as you start your day?'
      : "How are you feeling after today's work?";

  const missing = useMemo(
    () =>
      getMissingPulseFields({
        period,
        mood,
        contributors,
        talkTo,
        followUpRequested: followUp === '' ? null : followUp === 'yes',
      }),
    [period, mood, contributors, talkTo, followUp]
  );
  const canSubmit = missing.length === 0;

  function toggleTag(value: string, checked: boolean) {
    setContributors((current) => toggleContributor(current, value, checked));
  }

  function handleSubmit() {
    if (!canSubmit || !mood || submitting) return;
    onSubmit({
      period,
      mood,
      contributors,
      talkTo: period === 'morning' ? (talkTo ?? undefined) : 'none',
      followUpRequested: period === 'evening' ? followUp === 'yes' : false,
      comments: comments.trim() || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !submitting) onCancel(); }}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        showCloseButton={false}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <SectionTitle>Your mood</SectionTitle>
        <RadioGroup
          value={mood}
          onValueChange={(value) => setMood(value as PulseMood)}
          className="gap-2"
        >
          {MOODS.map((item) => (
            <div key={item.value} className="flex items-center gap-2">
              <RadioGroupItem id={`pulse-mood-${item.value}`} value={item.value} />
              <Label htmlFor={`pulse-mood-${item.value}`}>{item.label}</Label>
            </div>
          ))}
        </RadioGroup>
        <SectionTitle>
          {period === 'morning'
            ? "What's contributing to how you feel? (Select all that apply)"
            : 'What influenced your day? (Select all that apply)'}
        </SectionTitle>
        <div className="grid gap-2">
          {tags.map((tag) => (
            <label key={tag.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={contributors.includes(tag.value)}
                onCheckedChange={(checked) => toggleTag(tag.value, checked === true)}
              />
              {tag.label}
            </label>
          ))}
        </div>
        {period === 'morning' ? (
          <div className="space-y-2">
            <SectionTitle>Would you like to talk to someone?</SectionTitle>
            <RadioGroup value={talkTo ?? ''} onValueChange={(value) => setTalkTo(value as PulseTalkTo)}>
              {TALK_TO.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <RadioGroupItem id={`pulse-talk-${option.value}`} value={option.value} />
                  <Label htmlFor={`pulse-talk-${option.value}`}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ) : (
          <div className="space-y-2">
            <SectionTitle>Would you like someone to follow up?</SectionTitle>
            <RadioGroup value={followUp} onValueChange={(value) => setFollowUp(value as 'no' | 'yes')}>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="pulse-follow-no" value="no" />
                <Label htmlFor="pulse-follow-no">No</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="pulse-follow-yes" value="yes" />
                <Label htmlFor="pulse-follow-yes">Yes</Label>
              </div>
            </RadioGroup>
          </div>
        )}
        <SectionTitle required={false}>Note (optional)</SectionTitle>
        <Textarea
          value={comments}
          maxLength={COMMENTS_MAX_LENGTH}
          onChange={(event) => setComments(event.target.value)}
          placeholder={
            period === 'morning'
              ? 'Is there anything we can do to support you today?'
              : 'Additional comments'
          }
        />
        {!canSubmit ? (
          <p className="text-sm text-muted-foreground">Still needed: {missing.join(', ')}.</p>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

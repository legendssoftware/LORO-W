'use client';

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
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
  { value: 'other', label: 'Other' },
];

const TALK_TO: { value: PulseTalkTo; label: string }[] = [
  { value: 'none', label: "No, I'm okay" },
  { value: 'manager', label: 'My Manager' },
  { value: 'hr', label: 'HR' },
  { value: 'regional_manager', label: 'Regional Manager' },
  { value: 'confidential', label: 'Confidential Support' },
];

const pulseFormSchema = z.object({
  mood: z.enum(['excellent', 'good', 'okay', 'stressed', 'not_feeling_well']),
  contributors: z.array(z.string()),
  talkTo: z.enum(['none', 'manager', 'hr', 'regional_manager', 'confidential']),
  followUp: z.enum(['no', 'yes']),
  comments: z.string().max(2000),
});

export interface PulseDialogProps {
  open: boolean;
  period: PulsePeriod;
  submitting?: boolean;
  onSkip: () => void;
  onSubmit: (body: PulseSubmitBody) => void;
}

export function PulseDialog({ open, period, submitting, onSkip, onSubmit }: PulseDialogProps) {
  const [mood, setMood] = useState<PulseMood | ''>('');
  const [contributors, setContributors] = useState<string[]>([]);
  const [talkTo, setTalkTo] = useState<PulseTalkTo>('none');
  const [followUp, setFollowUp] = useState<'no' | 'yes'>('no');
  const [comments, setComments] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMood('');
    setContributors([]);
    setTalkTo('none');
    setFollowUp('no');
    setComments('');
    setError(null);
  }, [open, period]);

  const tags = period === 'morning' ? MORNING_TAGS : EVENING_TAGS;
  const title = period === 'morning' ? 'Start My Day' : 'Finish My Day';
  const description =
    period === 'morning'
      ? 'How are you feeling as you start your day?'
      : "How are you feeling after today's work?";

  const canSubmit = useMemo(() => mood !== '', [mood]);

  function toggleTag(value: string, checked: boolean) {
    setContributors((current) =>
      checked ? [...current, value] : current.filter((item) => item !== value)
    );
  }

  function handleSubmit() {
    const parsed = pulseFormSchema.safeParse({
      mood,
      contributors,
      talkTo,
      followUp,
      comments,
    });
    if (!parsed.success) {
      setError('Please choose how you feel.');
      return;
    }
    setError(null);
    onSubmit({
      period,
      mood: parsed.data.mood,
      contributors: parsed.data.contributors,
      talkTo: period === 'morning' ? parsed.data.talkTo : 'none',
      followUpRequested: period === 'evening' ? parsed.data.followUp === 'yes' : false,
      comments: parsed.data.comments.trim() || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onSkip(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
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
        <p className="text-sm font-medium">
          {period === 'morning'
            ? "What's contributing to how you feel? (Optional)"
            : 'What influenced your day?'}
        </p>
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
            <p className="text-sm font-medium">Would you like to talk to someone?</p>
            <RadioGroup value={talkTo} onValueChange={(value) => setTalkTo(value as PulseTalkTo)}>
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
            <p className="text-sm font-medium">Would you like someone to follow up?</p>
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
        <Textarea
          value={comments}
          onChange={(event) => setComments(event.target.value)}
          placeholder={
            period === 'morning'
              ? 'Is there anything we can do to support you today?'
              : 'Additional comments'
          }
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onSkip} disabled={submitting}>
            Skip
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

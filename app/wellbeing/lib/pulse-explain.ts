import type { PulseMood, PulseNamedPerson, PulseTalkTo } from '@/api/types/pulse';
import type { PulseTone } from './pulse-tone';

type PulseRiskReason = NonNullable<PulseNamedPerson['riskReason']>;

export interface MoodExplanation {
  label: string;
  score: number;
  plainText: string;
}

export interface RiskReasonExplanation {
  label: string;
  plainText: string;
  suggestedAction: string;
}

/** Mirrors server `PULSE_MOOD_SCORE` so the UI explains the same numbers the dashboard averages. */
export const MOOD_EXPLANATIONS: Record<PulseMood, MoodExplanation> = {
  excellent: { label: 'Excellent', score: 10, plainText: 'Feeling great and full of energy.' },
  good: { label: 'Good', score: 8, plainText: 'Feeling positive and ready for the day.' },
  okay: { label: 'Okay', score: 6, plainText: 'Feeling neutral, neither good nor bad.' },
  stressed: { label: 'Stressed', score: 4, plainText: 'Feeling under pressure or worried.' },
  not_feeling_well: {
    label: 'Not feeling well',
    score: 2,
    plainText: 'Feeling unwell or very low. This is the lowest rating.',
  },
};

export const RISK_REASON_EXPLANATIONS: Record<PulseRiskReason, RiskReasonExplanation> = {
  support: {
    label: 'Support',
    plainText:
      'They asked to speak to someone (their manager, HR, a regional manager or confidential support) or asked for a follow-up.',
    suggestedAction: 'Reach out today, listen first, and agree on a next step together.',
  },
  day_drop: {
    label: 'Sharp drop during the day',
    plainText:
      'They started the day feeling good or better in the morning, but ended it feeling "not feeling well" in the evening. Something may have happened during the day.',
    suggestedAction: 'Check in gently to find out what changed and whether they need help.',
  },
  declining_streak: {
    label: 'Declining streak',
    plainText:
      'Their evening mood has gotten lower every day for the last 4 days in a row. This is a trend, not a one-off bad day.',
    suggestedAction: 'Have a private conversation soon, before the pattern turns into burnout.',
  },
};

export const TALK_TO_LABELS: Record<PulseTalkTo, string> = {
  none: "No, they're okay",
  manager: 'their manager',
  hr: 'HR',
  regional_manager: 'their regional manager',
  confidential: 'confidential support',
};

/** Mirrors `apk/modules/pulse/pulse-constants.ts` morning and evening contributor options. */
export const CONTRIBUTOR_LABELS: Record<string, string> = {
  feeling_tired: 'Feeling tired',
  personal_or_family: 'Personal or family matters',
  financial_concerns: 'Financial concerns',
  health: 'Health',
  work_related_issue: 'Work-related issue',
  conflict_with_colleague: 'Conflict with colleague',
  conflict_with_manager: 'Conflict with manager',
  poor_sleep: 'Poor sleep',
  customers: 'Customers',
  teamwork: 'Teamwork',
  my_manager: 'My manager',
  personal_matters: 'Personal matters',
  achieved_my_goals: 'Achieved my goals',
  felt_appreciated: 'Felt appreciated',
  equipment_system_issues: 'Equipment or system issues',
  training_needed: 'Training needed',
  nothing_in_particular: 'Nothing in particular',
  other: 'Other',
};

/** Raw mood to display text; a dash means the check-in has not been submitted. */
export function moodLabel(mood: PulseMood | string | null | undefined): string {
  if (!mood) return '—';
  return mood.replaceAll('_', ' ');
}

export function contributorLabel(tag: string): string {
  return CONTRIBUTOR_LABELS[tag] ?? tag.replaceAll('_', ' ');
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || 'This person';
}

function moodPhrase(mood: PulseMood): string {
  return MOOD_EXPLANATIONS[mood].label.toLowerCase();
}

/** Short plain-English description of one person's day based on today's check-ins. */
export function buildPersonSummary(person: PulseNamedPerson): string {
  const name = firstName(person.name);
  const parts: string[] = [];

  if (person.morningMood) parts.push(`${name} checked in this morning feeling ${moodPhrase(person.morningMood)}.`);
  else parts.push(`${name} has not done a morning check-in today.`);

  if (person.eveningMood) parts.push(`In the evening they felt ${moodPhrase(person.eveningMood)}.`);
  else parts.push('The evening check-in has not been done yet.');

  if (person.talkTo !== 'none') {
    parts.push(`They asked to speak to ${TALK_TO_LABELS[person.talkTo]}.`);
  } else if (person.followUpRequested) {
    parts.push('They asked for a follow-up.');
  }

  // The "support" reason is already covered by the talk-to / follow-up sentence above.
  if (person.riskReason && person.riskReason !== 'support') parts.push(RISK_REASON_EXPLANATIONS[person.riskReason].plainText);

  return parts.join(' ');
}

export interface StatusDescription {
  label: string;
  detail: string;
  tone: PulseTone;
}

/** Evening minus morning change (in score points) that counts as a notable, not a steady, day. */
const STEADY_BAND = 0.3;
const STRONG_CHANGE = 2;

function formatScore(score: number): string {
  return String(Math.round(score * 10) / 10);
}

function formatDelta(delta: number): string {
  const rounded = Math.round(delta * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded}`;
}

/**
 * Describes how the day went from the morning to the evening score.
 * `strongChange` is the size of change counted as "much better" / "sharp drop"
 * (mood steps are 2 points apart, so people use a higher value than branch averages).
 */
export function describeTrend(
  morning: number | null | undefined,
  evening: number | null | undefined,
  strongChange: number = STRONG_CHANGE,
): StatusDescription {
  if (morning == null && evening == null) {
    return { label: 'No check-ins yet', detail: 'Nobody has checked in for this period.', tone: 'neutral' };
  }
  if (morning == null) {
    return { label: 'No morning check-in', detail: `Evening score ${formatScore(evening as number)}.`, tone: 'neutral' };
  }
  if (evening == null) {
    return {
      label: 'Awaiting evening check-in',
      detail: `Morning score ${formatScore(morning)}; the evening check-in is not in yet.`,
      tone: 'neutral',
    };
  }

  // Round first so float noise (e.g. 6.3 - 6 = 0.2999...) cannot flip a boundary.
  const delta = Math.round((evening - morning) * 10) / 10;
  const detail = `Morning ${formatScore(morning)} \u2192 Evening ${formatScore(evening)} (${formatDelta(delta)})`;
  if (delta >= strongChange) return { label: 'Much better by evening', detail, tone: 'good' };
  if (delta >= STEADY_BAND) return { label: 'Improving through the day', detail, tone: 'good' };
  if (delta > -STEADY_BAND) return { label: 'Steady', detail, tone: 'warn' };
  if (delta > -strongChange) return { label: 'Dipping through the day', detail, tone: 'bad' };
  return { label: 'Sharp drop', detail, tone: 'bad' };
}

function moodScore(mood: PulseMood | null): number | null {
  return mood ? MOOD_EXPLANATIONS[mood].score : null;
}

/** Coloured headline for a person card: flags first, then how their day moved. */
export function describePersonStatus(person: PulseNamedPerson): StatusDescription {
  const morning = moodScore(person.morningMood);
  const evening = moodScore(person.eveningMood);
  const moods =
    person.morningMood && person.eveningMood
      ? `${MOOD_EXPLANATIONS[person.morningMood].label} \u2192 ${MOOD_EXPLANATIONS[person.eveningMood].label}`
      : '';

  if (person.riskReason === 'day_drop') {
    return { label: 'Mood dropped sharply during the day', detail: moods, tone: 'bad' };
  }
  if (person.riskReason === 'declining_streak') {
    return {
      label: 'Mood declining 4 days in a row',
      detail: 'Evening mood has been lower every day recently.',
      tone: 'bad',
    };
  }

  // Mood steps are 2 points apart, so a single step is a dip, not a sharp drop.
  const trend = describeTrend(morning, evening, STRONG_CHANGE + 1);
  if (person.riskReason === 'support' && trend.tone !== 'bad') {
    return { label: 'Asked for support', detail: `${trend.label}. ${trend.detail}`, tone: 'warn' };
  }
  return { ...trend, detail: moods || trend.detail };
}

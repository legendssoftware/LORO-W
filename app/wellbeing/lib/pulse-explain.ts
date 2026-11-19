import type { PulseMood, PulseNamedPerson, PulseTalkTo } from '@/api/types/pulse';
import type { PulseTone } from './pulse-tone';

type PulseRiskReason = NonNullable<PulseNamedPerson['riskReason']>;

export interface MoodExplanation {
  labelKey: string;
  score: number;
  plainTextKey: string;
}

export interface RiskReasonExplanation {
  labelKey: string;
  plainTextKey: string;
  suggestedActionKey: string;
}

/** Mirrors server `PULSE_MOOD_SCORE` so the UI explains the same numbers the dashboard averages. */
export const MOOD_EXPLANATIONS: Record<PulseMood, MoodExplanation> = {
  excellent: { labelKey: 'chrome.wellbeing.mood.excellent', score: 10, plainTextKey: 'chrome.wellbeing.mood.excellentDesc' },
  good: { labelKey: 'chrome.wellbeing.mood.good', score: 8, plainTextKey: 'chrome.wellbeing.mood.goodDesc' },
  okay: { labelKey: 'chrome.wellbeing.mood.okay', score: 6, plainTextKey: 'chrome.wellbeing.mood.okayDesc' },
  stressed: { labelKey: 'chrome.wellbeing.mood.stressed', score: 4, plainTextKey: 'chrome.wellbeing.mood.stressedDesc' },
  not_feeling_well: {
    labelKey: 'chrome.wellbeing.mood.notFeelingWell',
    score: 2,
    plainTextKey: 'chrome.wellbeing.mood.notFeelingWellDesc',
  },
};

export const RISK_REASON_EXPLANATIONS: Record<PulseRiskReason, RiskReasonExplanation> = {
  support: {
    labelKey: 'chrome.wellbeing.risk.support',
    plainTextKey: 'chrome.wellbeing.risk.supportDesc',
    suggestedActionKey: 'chrome.wellbeing.risk.supportAction',
  },
  day_drop: {
    labelKey: 'chrome.wellbeing.risk.dayDrop',
    plainTextKey: 'chrome.wellbeing.risk.dayDropDesc',
    suggestedActionKey: 'chrome.wellbeing.risk.dayDropAction',
  },
  declining_streak: {
    labelKey: 'chrome.wellbeing.risk.decliningStreak',
    plainTextKey: 'chrome.wellbeing.risk.decliningStreakDesc',
    suggestedActionKey: 'chrome.wellbeing.risk.decliningStreakAction',
  },
};

/** i18n keys for the talk-to audience; resolved via t(key) in components. */
export const TALK_TO_KEYS: Record<PulseTalkTo, string> = {
  none: 'chrome.wellbeing.talkTo.none',
  manager: 'chrome.wellbeing.talkTo.manager',
  hr: 'chrome.wellbeing.talkTo.hr',
  regional_manager: 'chrome.wellbeing.talkTo.regionalManager',
  confidential: 'chrome.wellbeing.talkTo.confidential',
};

/** i18n keys for mood contributor tags; resolved via t(key) in components. */
export const CONTRIBUTOR_KEYS: Record<string, string> = {
  feeling_tired: 'chrome.wellbeing.contributor.feelingTired',
  personal_or_family: 'chrome.wellbeing.contributor.personalOrFamily',
  financial_concerns: 'chrome.wellbeing.contributor.financialConcerns',
  health: 'chrome.wellbeing.contributor.health',
  work_related_issue: 'chrome.wellbeing.contributor.workRelatedIssue',
  conflict_with_colleague: 'chrome.wellbeing.contributor.conflictWithColleague',
  conflict_with_manager: 'chrome.wellbeing.contributor.conflictWithManager',
  poor_sleep: 'chrome.wellbeing.contributor.poorSleep',
  customers: 'chrome.wellbeing.contributor.customers',
  teamwork: 'chrome.wellbeing.contributor.teamwork',
  my_manager: 'chrome.wellbeing.contributor.myManager',
  personal_matters: 'chrome.wellbeing.contributor.personalMatters',
  achieved_my_goals: 'chrome.wellbeing.contributor.achievedMyGoals',
  felt_appreciated: 'chrome.wellbeing.contributor.feltAppreciated',
  equipment_system_issues: 'chrome.wellbeing.contributor.equipmentSystemIssues',
  training_needed: 'chrome.wellbeing.contributor.trainingNeeded',
  nothing_in_particular: 'chrome.wellbeing.contributor.nothingInParticular',
  other: 'chrome.wellbeing.contributor.other',
};

/** Raw mood to display text; a dash means the check-in has not been submitted. */
export function moodLabel(mood: PulseMood | string | null | undefined): string {
  if (!mood) return '—';
  return mood.replaceAll('_', ' ');
}

/** Returns the i18n key for a contributor tag; falls back to the raw tag. */
export function contributorKey(tag: string): string {
  return CONTRIBUTOR_KEYS[tag] ?? tag;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || 'This person';
}

/**
 * Returns an array of i18n keys (with optional interpolation params) that describe
 * a person's day. Components resolve each entry via t(key, params).
 */
export interface SummaryPart {
  key: string;
  params?: Record<string, string>;
}

export function buildPersonSummaryKeys(person: PulseNamedPerson): SummaryPart[] {
  const name = firstName(person.name);
  const parts: SummaryPart[] = [];

  if (person.morningMood) {
    parts.push({
      key: 'chrome.wellbeing.summary.morningCheckIn',
      params: { name, mood: MOOD_EXPLANATIONS[person.morningMood].labelKey },
    });
  } else {
    parts.push({ key: 'chrome.wellbeing.summary.noMorningCheckIn', params: { name } });
  }

  if (person.eveningMood) {
    parts.push({
      key: 'chrome.wellbeing.summary.eveningFelt',
      params: { mood: MOOD_EXPLANATIONS[person.eveningMood].labelKey },
    });
  } else {
    parts.push({ key: 'chrome.wellbeing.summary.noEveningCheckIn' });
  }

  if (person.talkTo !== 'none') {
    parts.push({
      key: 'chrome.wellbeing.summary.askedToSpeak',
      params: { audience: TALK_TO_KEYS[person.talkTo] },
    });
  } else if (person.followUpRequested) {
    parts.push({ key: 'chrome.wellbeing.summary.askedFollowUp' });
  }

  if (person.riskReason && person.riskReason !== 'support') {
    parts.push({ key: RISK_REASON_EXPLANATIONS[person.riskReason].plainTextKey });
  }

  return parts;
}

export interface StatusDescription {
  /** i18n key resolved via t(labelKey) in components. */
  labelKey: string;
  /** Formatted detail string (may contain numbers/arrows). */
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
    return { labelKey: 'chrome.wellbeing.trend.noCheckIns', detail: '', tone: 'neutral' };
  }
  if (morning == null) {
    return { labelKey: 'chrome.wellbeing.trend.noMorning', detail: `${formatScore(evening as number)}`, tone: 'neutral' };
  }
  if (evening == null) {
    return {
      labelKey: 'chrome.wellbeing.trend.awaitingEvening',
      detail: `${formatScore(morning)}`,
      tone: 'neutral',
    };
  }

  // Round first so float noise (e.g. 6.3 - 6 = 0.2999...) cannot flip a boundary.
  const delta = Math.round((evening - morning) * 10) / 10;
  const detail = `${formatScore(morning)} \u2192 ${formatScore(evening)} (${formatDelta(delta)})`;
  if (delta >= strongChange) return { labelKey: 'chrome.wellbeing.trend.muchBetter', detail, tone: 'good' };
  if (delta >= STEADY_BAND) return { labelKey: 'chrome.wellbeing.trend.improving', detail, tone: 'good' };
  if (delta > -STEADY_BAND) return { labelKey: 'chrome.wellbeing.trend.steady', detail, tone: 'warn' };
  if (delta > -strongChange) return { labelKey: 'chrome.wellbeing.trend.dipping', detail, tone: 'bad' };
  return { labelKey: 'chrome.wellbeing.trend.sharpDrop', detail, tone: 'bad' };
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
      ? `${person.morningMood} \u2192 ${person.eveningMood}`
      : '';

  if (person.riskReason === 'day_drop') {
    return { labelKey: 'chrome.wellbeing.personStatus.moodDropped', detail: moods, tone: 'bad' };
  }
  if (person.riskReason === 'declining_streak') {
    return {
      labelKey: 'chrome.wellbeing.personStatus.declining4Days',
      detail: '',
      tone: 'bad',
    };
  }

  // Mood steps are 2 points apart, so a single step is a dip, not a sharp drop.
  const trend = describeTrend(morning, evening, STRONG_CHANGE + 1);
  if (person.riskReason === 'support' && trend.tone !== 'bad') {
    return { labelKey: 'chrome.wellbeing.personStatus.askedForSupport', detail: trend.detail, tone: 'warn' };
  }
  return { ...trend, detail: moods || trend.detail };
}

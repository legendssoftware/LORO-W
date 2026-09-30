import type { PulseMood, PulsePeriod, PulseTalkTo } from '@/api/types/pulse';

/** Exclusive answer for "no specific factor"; lets the contributors section stay mandatory. */
export const NO_CONTRIBUTOR = 'nothing_in_particular';

/** Answers as held by the pulse form; `null` / `''` means the question has not been answered yet. */
export interface PulseFormAnswers {
  period: PulsePeriod;
  mood: PulseMood | '';
  contributors: string[];
  /** Morning question: "Would you like to talk to someone?" */
  talkTo: PulseTalkTo | null;
  /** Evening question: "Would you like someone to follow up?" */
  followUpRequested: boolean | null;
}

/**
 * Sections the user still has to answer. Every section is mandatory except the free-text note,
 * so the wellbeing metrics never mistake "not answered" for a real answer.
 * @returns Human readable section names; empty when the form is complete
 */
export function getMissingPulseFields(answers: PulseFormAnswers): string[] {
  const missing: string[] = [];
  if (!answers.mood) missing.push('how you feel');
  if (answers.contributors.length === 0) {
    missing.push(answers.period === 'morning' ? "what's contributing" : 'what influenced your day');
  }
  if (answers.period === 'morning' && !answers.talkTo) missing.push('whether you want to talk to someone');
  if (answers.period === 'evening' && answers.followUpRequested === null) {
    missing.push('whether you want a follow-up');
  }
  return missing;
}

/** Add or remove a contributor; "Nothing in particular" is exclusive with every other tag. */
export function toggleContributor(current: string[], value: string, checked: boolean): string[] {
  if (!checked) return current.filter((item) => item !== value);
  if (value === NO_CONTRIBUTOR) return [NO_CONTRIBUTOR];
  return [...current.filter((item) => item !== NO_CONTRIBUTOR), value];
}

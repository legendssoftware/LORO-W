export type VisitQualityHintInput = {
  notes?: string | null;
  resolution?: string | null;
  contactFullName?: string | null;
  followUp?: string | null;
  methodOfContact?: string | null;
  quotationNumber?: string | null;
  salesValue?: number | string | null;
  contactMade?: boolean | string | null;
};

const VOICEMAIL_RE = /\b(voice[\s-]?mail|voicemail|\bvm\b)\b/i;
const NO_ANSWER_RE = /\b(no[\s-]?answer|unanswered|not answered|did(?:\s*not|n't) answer)\b/i;

function isBlank(value: string | null | undefined): boolean {
  return !value || !String(value).trim() || String(value).trim() === '-';
}

function isTelephoneMethod(method: string | null | undefined): boolean {
  return String(method ?? '').trim().toLowerCase() === 'telephone';
}

function notesText(input: VisitQualityHintInput): string {
  return `${input.notes ?? ''} ${input.resolution ?? ''}`;
}

/**
 * Voicemail / no-answer / explicit no-contact. These are legitimate outcomes,
 * not incomplete quotes.
 */
export function visitLooksLikeDeadAir(input: VisitQualityHintInput): boolean {
  if (!isTelephoneMethod(input.methodOfContact)) return false;
  const text = notesText(input);
  if (VOICEMAIL_RE.test(text) || NO_ANSWER_RE.test(text)) return true;
  const made = input.contactMade;
  if (made === false) return true;
  if (typeof made === 'string' && made.trim().toLowerCase() === 'no') return true;
  return false;
}

/**
 * Soft completeness checklist for end-visit. Does not block submit.
 * Dead-air telephone only needs a note. Connected calls need who + a next step,
 * not a quotation number (that trains fake quotes).
 */
export function visitQualityMissingFields(input: VisitQualityHintInput): string[] {
  const missing: string[] = [];
  if (visitLooksLikeDeadAir(input)) {
    if (isBlank(input.notes)) missing.push('Notes (voicemail / no answer)');
    return missing;
  }

  if (isBlank(input.notes)) missing.push('Notes');
  if (isBlank(input.contactFullName)) missing.push('Contact person');
  if (isBlank(input.followUp)) missing.push('Follow-up date or close reason');
  return missing;
}

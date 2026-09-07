export type VisitQualityHintInput = {
  notes?: string | null;
  resolution?: string | null;
  contactFullName?: string | null;
  followUp?: string | null;
  methodOfContact?: string | null;
  quotationNumber?: string | null;
  salesValue?: number | string | null;
  contactMade?: boolean | string | null;
  /** Keep working, discard/delete lead, or close with no further action. */
  nextStep?: string | null;
  /** When true, next step must be keep / discard / delete. */
  hasLead?: boolean;
};

export const ACTIVITY_NEXT_STEP = {
  keep: 'keep',
  discard: 'discard',
  delete: 'delete',
  close: 'close',
} as const;

export type ActivityNextStep =
  (typeof ACTIVITY_NEXT_STEP)[keyof typeof ACTIVITY_NEXT_STEP];

/** Telephone / WhatsApp / Email check-ins shorter than this are treated as no-call unless details are filled. */
export const MIN_CALL_SECONDS = 30;

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

/** True for non-physical call methods that can be gated on duration. */
export function isCallMethod(method: string | null | undefined): boolean {
  const m = String(method ?? '').trim().toLowerCase();
  return m === 'telephone' || m === 'email' || m === 'whatsapp';
}

/**
 * Seconds since check-in. Returns null when the timestamp is missing or invalid.
 */
export function elapsedSecondsSince(
  isoTime: string | null | undefined,
  now = Date.now()
): number | null {
  if (!isoTime) return null;
  const start = Date.parse(isoTime);
  if (Number.isNaN(start)) return null;
  return Math.max(0, Math.floor((now - start) / 1000));
}

/**
 * True when a telephone / email / WhatsApp check-in is under {@link MIN_CALL_SECONDS}.
 */
export function isShortCall(params: {
  methodOfContact?: string | null;
  checkInTime?: string | null;
  now?: number;
}): boolean {
  if (!isCallMethod(params.methodOfContact)) return false;
  const elapsed = elapsedSecondsSince(params.checkInTime, params.now);
  if (elapsed == null) return false;
  return elapsed < MIN_CALL_SECONDS;
}

const LEAD_NEXT_STEPS: readonly ActivityNextStep[] = [
  ACTIVITY_NEXT_STEP.keep,
  ACTIVITY_NEXT_STEP.discard,
  ACTIVITY_NEXT_STEP.delete,
];

const VISIT_NEXT_STEPS: readonly ActivityNextStep[] = [
  ACTIVITY_NEXT_STEP.keep,
  ACTIVITY_NEXT_STEP.close,
];

/**
 * Whether the chosen next step is valid for a lead-linked vs standalone visit.
 */
export function isValidActivityNextStep(
  nextStep: string | null | undefined,
  hasLead: boolean
): nextStep is ActivityNextStep {
  if (!nextStep) return false;
  const allowed = hasLead ? LEAD_NEXT_STEPS : VISIT_NEXT_STEPS;
  return (allowed as readonly string[]).includes(nextStep);
}

function nextStepLabel(hasLead: boolean): string {
  return hasLead ? 'Lead next step' : 'Next step';
}

function formatNextStepLine(nextStep: ActivityNextStep, hasLead: boolean): string {
  if (hasLead) {
    switch (nextStep) {
      case ACTIVITY_NEXT_STEP.keep:
        return 'Lead next step: Keep working';
      case ACTIVITY_NEXT_STEP.discard:
        return 'Lead next step: Discard';
      case ACTIVITY_NEXT_STEP.delete:
        return 'Lead next step: Delete';
      case ACTIVITY_NEXT_STEP.close:
        return 'Lead next step: No further action';
      default: {
        const _exhaustive: never = nextStep;
        return _exhaustive;
      }
    }
  }
  switch (nextStep) {
    case ACTIVITY_NEXT_STEP.keep:
      return 'Next step: Keep working';
    case ACTIVITY_NEXT_STEP.close:
      return 'Next step: No further action';
    case ACTIVITY_NEXT_STEP.discard:
      return 'Next step: Discard';
    case ACTIVITY_NEXT_STEP.delete:
      return 'Next step: Delete';
    default: {
      const _exhaustive: never = nextStep;
      return _exhaustive;
    }
  }
}

/**
 * Line to persist on resolution for close choices (discard / delete / no further action).
 * Keep working is represented by the follow-up date instead.
 */
export function nextStepCloseLine(
  nextStep: string | null | undefined,
  hasLead: boolean
): string | null {
  if (!isValidActivityNextStep(nextStep, hasLead)) return null;
  if (nextStep === ACTIVITY_NEXT_STEP.keep) return null;
  return formatNextStepLine(nextStep, hasLead);
}

/**
 * Appends the close-choice line to resolution so visit history shows it without a new column.
 */
export function appendNextStepToResolution(
  resolution: string | null | undefined,
  nextStep: string | null | undefined,
  hasLead: boolean
): string {
  const trimmed = (resolution ?? '').trim();
  const line = nextStepCloseLine(nextStep, hasLead);
  if (!line) return trimmed;
  if (trimmed.includes(line)) return trimmed;
  return trimmed ? `${trimmed}\n\n${line}` : line;
}

/**
 * Completeness checklist for end-visit / end-call. Missing items must block submit on web.
 * Voicemail, no-answer, and short calls use the same required fields as a connected call.
 */
export function visitQualityMissingFields(input: VisitQualityHintInput): string[] {
  const missing: string[] = [];
  if (isBlank(input.notes)) missing.push('Notes');
  if (isBlank(input.resolution)) missing.push('Resolution');
  if (isBlank(input.contactFullName)) missing.push('Contact person');

  const hasLead = input.hasLead === true;
  if (!isValidActivityNextStep(input.nextStep, hasLead)) {
    missing.push(nextStepLabel(hasLead));
  } else if (input.nextStep === ACTIVITY_NEXT_STEP.keep && isBlank(input.followUp)) {
    missing.push('Follow-up date');
  }
  return missing;
}

/**
 * Zod schemas for visit form validation.
 * Replaces manual validation with type-safe, declarative schemas.
 */

import { z } from 'zod';
import { startOfDay } from 'date-fns';
import {
  MAX_CONTACT_FULL_NAME,
  MAX_COMPANY_NAME,
  MAX_PERSON_SEEN_POSITION,
  MAX_PHONE,
  MAX_EMAIL,
  PHONE_REGEX,
} from '@/lib/visit-form-utils';
import {
  ACTIVITY_NEXT_STEP,
  isValidActivityNextStep,
} from '@/lib/visit-quality-hints';

/** Optional string with max length; empty string passes. Accepts null from API payloads. */
const optionalString = (max: number) =>
  z
    .string()
    .nullish()
    .refine((v) => !v || v.length <= max, `Must be ${max} characters or less`);

/** Optional phone; empty/undefined/null passes, otherwise must match format. */
const optionalPhone = () =>
  z
    .string()
    .nullish()
    .refine(
      (v) => !v || (v.length <= MAX_PHONE && PHONE_REGEX.test(v)),
      'May only contain digits, spaces, +, -, ., or parentheses'
    );

/** Optional email; empty/undefined/null passes, otherwise must be valid. */
const optionalEmail = () =>
  z
    .string()
    .nullish()
    .refine(
      (v) =>
        !v ||
        (v.length <= MAX_EMAIL && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)),
      'Please enter a valid email address'
    );

/** Optional follow-up date; must not be in the past when provided. */
const optionalFollowUpNotPast = () =>
  z
    .string()
    .nullish()
    .refine(
      (v) => {
        if (!v || !v.trim()) return true;
        const match = v.trim().match(/^\d{4}-\d{2}-\d{2}/);
        if (!match) return true;
        const d = new Date(match[0]);
        if (Number.isNaN(d.getTime())) return true;
        return startOfDay(d) >= startOfDay(new Date());
      },
      'Follow-up date cannot be in the past'
    );

/** Base schema for visit forms (shared by end-visit and edit). */
const visitFormBaseSchema = z.object({
  contactFullName: optionalString(MAX_CONTACT_FULL_NAME).optional(),
  companyName: optionalString(MAX_COMPANY_NAME).optional(),
  personSeenPosition: optionalString(MAX_PERSON_SEEN_POSITION).optional(),
  contactCellPhone: optionalPhone().optional(),
  contactLandline: optionalPhone().optional(),
  contactEmail: optionalEmail().optional(),
  notes: z.string().nullish(),
  resolution: z.string().nullish(),
  followUp: optionalFollowUpNotPast().optional(),
  quotationNumber: z.string().nullish(),
  quotationStatus: z.string().nullish(),
  salesValue: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.number().optional()
  ),
  salesCurrency: z.string().nullish(),
  contactMade: z.boolean().optional(),
  methodOfContact: z.string().nullish(),
  buildingType: z.string().nullish(),
  businessType: z.string().nullish(),
  client: z.object({ uid: z.number() }).optional(),
  contactAddress: z.record(z.string(), z.string()).optional(),
  media: z.array(z.string()).optional(),
  meetingLink: z.string().max(2048).optional(),
});

function isBlankField(value: unknown): boolean {
  if (value == null) return true;
  const text = String(value).trim();
  return !text || text === '-';
}

/** Schema for end-visit form fields (client-side validation). Blocks incomplete check-out. */
export const endVisitFormSchema = visitFormBaseSchema
  .extend({
    nextStep: z.string().nullish(),
    hasLead: z.boolean().optional(),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    if (isBlankField(data.notes)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Notes are required',
        path: ['notes'],
      });
    }
    if (isBlankField(data.resolution)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Resolution is required',
        path: ['resolution'],
      });
    }
    if (isBlankField(data.contactFullName)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Contact name is required',
        path: ['contactFullName'],
      });
    }
    const hasLead = data.hasLead === true;
    const nextStep = typeof data.nextStep === 'string' ? data.nextStep : '';
    if (!isValidActivityNextStep(nextStep, hasLead)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: hasLead
          ? 'Choose whether to keep working, discard, or delete the lead'
          : 'Choose a next step',
        path: ['nextStep'],
      });
    } else if (nextStep === ACTIVITY_NEXT_STEP.keep && isBlankField(data.followUp)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Follow-up date is required when keeping this activity open',
        path: ['followUp'],
      });
    }
  });

export type EndVisitFormInput = z.infer<typeof endVisitFormSchema>;

/** Schema for edit-visit form (same validation as end-visit). */
export const editVisitFormSchema = visitFormBaseSchema.passthrough();

export type EditVisitFormInput = z.infer<typeof editVisitFormSchema>;

/**
 * Validates end-visit form data. Returns the first error message or null if valid.
 */
export function validateEndVisitFormWithZod(
  form: Record<string, unknown>
): string | null {
  const result = endVisitFormSchema.safeParse(form);
  if (result.success) return null;
  const first = result.error.issues[0];
  return (first?.message as string) ?? 'Validation failed';
}

/**
 * Validates end-visit form and returns field-level errors for inline display.
 */
export function validateEndVisitFormWithZodFieldErrors(
  form: Record<string, unknown>
): { fieldErrors: Record<string, string>; firstMessage: string | null } {
  const result = endVisitFormSchema.safeParse(form);
  if (result.success) return { fieldErrors: {}, firstMessage: null };
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path[0] as string | undefined;
    if (path && !fieldErrors[path]) {
      fieldErrors[path] = issue.message as string;
    }
  }
  const first = result.error.issues[0];
  return {
    fieldErrors,
    firstMessage: (first?.message as string) ?? 'Validation failed',
  };
}

/**
 * Validates edit-visit form data. Returns field errors map and first message for toast.
 */
export function validateEditVisitFormWithZod(form: Record<string, unknown>): {
  fieldErrors: Record<string, string>;
  firstMessage: string | null;
} {
  const result = editVisitFormSchema.safeParse(form);
  if (result.success) return { fieldErrors: {}, firstMessage: null };
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path[0] as string | undefined;
    if (path && !fieldErrors[path]) {
      fieldErrors[path] = issue.message as string;
    }
  }
  const first = result.error.issues[0];
  return {
    fieldErrors,
    firstMessage: (first?.message as string) ?? 'Validation failed',
  };
}

/**
 * Validates only the changed fields for edit-visit. Use when sending a partial payload.
 * Skips validation for fields not present in the payload.
 */
export function validateEditVisitFormChangedFields(changedFields: Record<string, unknown>): {
  fieldErrors: Record<string, string>;
  firstMessage: string | null;
} {
  const result = editVisitFormSchema.partial().passthrough().safeParse(changedFields);
  if (result.success) return { fieldErrors: {}, firstMessage: null };
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path[0] as string | undefined;
    if (path && !fieldErrors[path]) {
      fieldErrors[path] = issue.message as string;
    }
  }
  const first = result.error.issues[0];
  return {
    fieldErrors,
    firstMessage: (first?.message as string) ?? 'Validation failed',
  };
}

/** Date range schema: end must be >= start. */
export const dateRangeSchema = z
  .object({
    startDate: z.date(),
    endDate: z.date(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

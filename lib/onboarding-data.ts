/**
 * Onboarding slide ids. Copy lives in messages/<locale>/marketing.json under
 * `onboarding.slides.<id>.{title,description}`.
 */
export const ONBOARDING_SLIDE_IDS = ['platform', 'owners', 'clients', 'employees', 'start'] as const;

export type OnboardingSlideId = (typeof ONBOARDING_SLIDE_IDS)[number];

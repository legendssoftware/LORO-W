/**
 * Static copy for sales cold-call / quotation benchmarks (aligned with apk).
 */

export const SALES_BENCHMARKS_TITLE = 'Sales benchmarks';

export const SALES_BENCHMARKS_SECTIONS = [
  {
    title: 'Cold calls per day (9-hour shift)',
    intro: 'Realistic benchmarks:',
    bullets: [
      '60–90 calls per day → solid performance',
      '90–120 calls per day → top performer',
      'Below 50 → underperforming',
    ],
  },
  {
    title: 'Why this is realistic',
    intro: 'A proper cold call cycle includes:',
    bullets: [
      'Dialing + waiting → 20–40 sec',
      'Conversation → 1–3 min (average)',
      'CRM logging → 30–60 sec',
      'Average per call: 2–4 minutes',
      'Roughly: 1 hour ≈ 15–25 calls; 6–7 productive hours ≈ 60–120 calls/day',
      'You rarely get a full 9 hours of calling (breaks, internal issues, follow-ups, etc.).',
    ],
  },
  {
    title: 'Quotations per day',
    intro: 'Depends on conversion from calls → interest → quote. Example funnel:',
    bullets: [
      '100 calls',
      '→ 20–30 conversations',
      '→ 8–15 interested',
      '→ 5–10 quotations',
    ],
  },
] as const;

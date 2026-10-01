import { ATT_CHART_HSL } from '@/lib/chart-colors';

/** Colour-coding bucket shared by every Wellbeing view (good = green, warn = amber, bad = red). */
export type PulseTone = 'good' | 'warn' | 'bad' | 'neutral';

export interface PulseToneStyle {
  /** Fixed chart colour; CSS chart vars change meaning per theme, so these stay constant. */
  chart: string;
  text: string;
  dot: string;
  badge: string;
  caption: string;
}

export const PULSE_TONE_STYLES: Record<PulseTone, PulseToneStyle> = {
  good: {
    chart: ATT_CHART_HSL.c1,
    text: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
    caption: 'Healthy',
  },
  warn: {
    chart: ATT_CHART_HSL.c3,
    text: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
    badge: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
    caption: 'Watch',
  },
  bad: {
    chart: ATT_CHART_HSL.c5,
    text: 'text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
    badge: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300',
    caption: 'At risk',
  },
  neutral: {
    chart: 'hsl(215 14% 60%)',
    text: 'text-muted-foreground',
    dot: 'bg-muted-foreground/50',
    badge: 'border-border bg-muted/40 text-muted-foreground',
    caption: 'No data',
  },
};

/** Index labels where a higher percentage is worse, so the colour scale is inverted. */
const HIGHER_IS_WORSE_LABELS: ReadonlySet<string> = new Set(['Burnout Risk']);

export function isHigherWorseIndex(label: string): boolean {
  return HIGHER_IS_WORSE_LABELS.has(label);
}

/**
 * Tone for a 0-100 executive index.
 * Higher-is-better: 70+ good, 40-69 warn, below 40 bad.
 * Higher-is-worse (e.g. Burnout Risk): 20 or less good, 21-40 warn, above 40 bad.
 */
export function getIndexTone(label: string, value: number): PulseTone {
  if (!Number.isFinite(value)) return 'neutral';
  if (isHigherWorseIndex(label)) {
    if (value <= 20) return 'good';
    if (value <= 40) return 'warn';
    return 'bad';
  }
  if (value >= 70) return 'good';
  if (value >= 40) return 'warn';
  return 'bad';
}

/** Tone for a 2-10 mood score; thresholds match the server `scoreToBand`. */
export function getScoreTone(score: number | null | undefined): PulseTone {
  if (score == null || !Number.isFinite(score)) return 'neutral';
  if (score >= 7.5) return 'good';
  if (score >= 5.5) return 'warn';
  return 'bad';
}

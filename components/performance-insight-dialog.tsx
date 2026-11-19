'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, FileText, Phone, Target, UserPlus } from 'lucide-react';
import type { PaceNoticeRecord, PerformanceInsightNextStep } from '@/api/endpoints/pace-notice';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const NEXT_STEP_COPY: Record<PerformanceInsightNextStep, { label: string; Icon: typeof Phone }> = {
  calls: { label: 'Prioritise calls', Icon: Phone },
  leads: { label: 'Generate leads', Icon: UserPlus },
  quotations: { label: 'Follow up quotations', Icon: FileText },
};

const BAND_STYLES = {
  red: {
    banner: 'bg-red-600 text-white',
    accent: 'text-emerald-700',
    gapBox: 'bg-rose-50 text-rose-900 border-rose-200',
    footer: 'bg-emerald-700 hover:bg-emerald-800',
    Icon: AlertTriangle,
  },
  yellow: {
    banner: 'bg-amber-400 text-black',
    accent: 'text-emerald-700',
    gapBox: 'bg-amber-50 text-amber-950 border-amber-200',
    footer: 'bg-emerald-700 hover:bg-emerald-800',
    Icon: AlertTriangle,
  },
  green: {
    banner: 'bg-emerald-600 text-white',
    accent: 'text-emerald-700',
    gapBox: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    footer: 'bg-emerald-700 hover:bg-emerald-800',
    Icon: CheckCircle2,
  },
} as const;

type PerformanceInsightDialogProps = {
  notice: PaceNoticeRecord;
  onAcknowledge: () => void;
  acknowledging?: boolean;
  deferOpen?: boolean;
};

/** BitDrywall CRM Performance Insight flyer shown for pending pace notices. */
export function PerformanceInsightDialog({
  notice,
  onAcknowledge,
  acknowledging = false,
  deferOpen = false,
}: PerformanceInsightDialogProps) {
  const router = useRouter();
  const insight = notice.insight;
  if (!insight || deferOpen) return null;

  const styles = BAND_STYLES[insight.paceBand];
  const BannerIcon = styles.Icon;
  const progressValue = Math.min(100, Math.max(0, insight.activityPctDisplay));
  const gapLabel =
    insight.paceBand === 'green'
      ? `You are above Min Expected. Keep going toward your additional ${insight.rewardCapPctPoints}% performance reward.`
      : insight.gapPointsToMinExpected > 0
        ? `${insight.gapPointsToMinExpected} percentage points away from qualifying for your additional ${insight.rewardCapPctPoints}% performance reward.`
        : `You are at Min Expected. Push for your additional ${insight.rewardCapPctPoints}% performance reward.`;

  function handleCta() {
    onAcknowledge();
    router.push('/reports?tab=policy');
  }

  return (
    <Dialog open>
      <DialogContent
        className="!flex max-h-[min(92vh,820px)] flex-col gap-0 overflow-hidden border-0 p-0 sm:max-w-xl"
        showCloseButton={false}
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{insight.banner}</DialogTitle>
          <DialogDescription>{insight.headline}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 border-b border-border bg-white px-5 py-3">
          <div className="flex items-center gap-2">
            <Image src="/logo-p.png" alt="BitDrywall" width={36} height={36} className="size-9 object-contain" />
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-tight text-foreground">BitDrywall</p>
              <p className="text-[10px] text-muted-foreground">Build better. Finish stronger.</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            <Target className="size-3.5" aria-hidden />
            CRM | Performance Insight
          </div>
        </div>

        <div className={cn('flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold uppercase tracking-wide', styles.banner)}>
          <BannerIcon className="size-4 shrink-0" aria-hidden />
          {insight.banner}
        </div>

        <div className="relative flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_140px] sm:items-start">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{insight.headline}</p>
              <p className="text-4xl font-bold tracking-tight sm:text-5xl">
                <span className={styles.accent}>{insight.activityPctDisplay}%</span>
                <span className="ml-2 text-base font-semibold text-foreground sm:text-lg">of Min Expected</span>
              </p>
              <div className="space-y-1.5">
                <Progress value={progressValue} className="h-3" />
                <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
                  <span>{insight.activityPctDisplay}%</span>
                  <span>100%</span>
                </div>
              </div>
              <div className={cn('rounded-lg border px-3 py-2 text-sm font-medium', styles.gapBox)}>
                {gapLabel}
              </div>
            </div>
            <div className="mx-auto flex w-full max-w-[140px] flex-col items-center">
              <Image
                src="/brand/mr-bit.png"
                alt="Mr. Bit"
                width={140}
                height={160}
                className="h-40 w-auto object-contain"
                priority
              />
              <p className="mt-1 text-xs font-semibold text-emerald-800">Mr. Bit</p>
            </div>
          </div>

          {insight.nextSteps.length > 0 ? (
            <div className="mt-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-foreground">
                {insight.paceBand === 'yellow' ? 'Keep the momentum' : 'Next steps to improve'}
              </p>
              <ul className="grid gap-2 sm:grid-cols-3">
                {insight.nextSteps.map((step) => {
                  const { label, Icon } = NEXT_STEP_COPY[step];
                  return (
                    <li
                      key={step}
                      className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground"
                    >
                      <span className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      {label}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {insight.recovery ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Still to reach Min Expected: {insight.recovery.calls} calls, {insight.recovery.newLeads} new leads,{' '}
              {insight.recovery.quotations} quotations
              {insight.recovery.remainingWorkingDays > 0
                ? ` over ${insight.recovery.remainingWorkingDays} working days`
                : ''}
              .
            </p>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 border-t-0 p-0 sm:justify-stretch">
          <Button
            type="button"
            className={cn('h-auto min-h-12 w-full rounded-none px-4 py-3 text-sm font-semibold text-white', styles.footer)}
            onClick={handleCta}
            disabled={acknowledging}
          >
            <Target className="mr-2 size-4 shrink-0" aria-hidden />
            {insight.ctaLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

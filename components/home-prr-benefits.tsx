'use client';

import { useEffect, useMemo, useState } from 'react';
import { Zap } from 'lucide-react';
import { useMyPolicyDashboard } from '@/api/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

const FLOOR_PCT = 0.75;
const CAP_PCT = 1.25;
const REWARD_CAP_POINTS = Math.round((CAP_PCT - 1) * 100);

function money(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `R${Math.round(value).toLocaleString('en-ZA')}`;
  }
}

function clampAchievementPct(pctPoints: number): number {
  return Math.min(CAP_PCT * 100, Math.max(FLOOR_PCT * 100, pctPoints));
}

type MonthlyRewardCalculatorProps = {
  prr: number;
  activityPct: number;
  currency: string;
};

function MonthlyRewardCalculator({ prr, activityPct, currency }: MonthlyRewardCalculatorProps) {
  const livePctPoints = clampAchievementPct(Math.round(activityPct * 100));
  const [prrText, setPrrText] = useState(String(Math.round(prr)));
  const [achievementPctPoints, setAchievementPctPoints] = useState(livePctPoints);

  useEffect(() => {
    setPrrText(String(Math.round(prr)));
  }, [prr]);

  useEffect(() => {
    setAchievementPctPoints(livePctPoints);
  }, [livePctPoints]);

  const basePrr = useMemo(() => {
    const parsed = Number(String(prrText).replace(/[^\d.]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : prr;
  }, [prrText, prr]);

  const payPct = achievementPctPoints / 100;
  const potentialGross = Math.round(basePrr * payPct);
  const additionalReward = Math.max(0, potentialGross - Math.round(basePrr));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">My Monthly Reward</CardTitle>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Illustrative</span>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="home-prr-amount">Monthly PRR / Min Expected (R)</Label>
          <Input
            id="home-prr-amount"
            inputMode="numeric"
            value={prrText}
            onChange={(event) => setPrrText(event.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border bg-background px-3 py-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Additional {REWARD_CAP_POINTS}% reward
            </p>
            <p
              className={`mt-1 text-xl font-bold ${additionalReward > 0 ? 'text-emerald-700' : 'text-foreground'}`}
            >
              {money(additionalReward, currency)}
            </p>
          </div>
          <div className="rounded-xl border bg-background px-3 py-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Potential gross earnings</p>
            <p className="mt-1 text-xl font-bold text-foreground">{money(potentialGross, currency)}</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Projected Min Expected achievement</span>
          <span className="font-semibold">{Math.round(achievementPctPoints)}%</span>
        </div>
        <Slider
          min={FLOOR_PCT * 100}
          max={CAP_PCT * 100}
          step={1}
          value={[achievementPctPoints]}
          onValueChange={(values) => {
            const next = values[0];
            if (typeof next === 'number') setAchievementPctPoints(next);
          }}
          aria-label="Projected achievement percentage"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>75%</span>
          <span>100%</span>
          <span>125%</span>
        </div>
      </CardContent>
    </Card>
  );
}

type ChallengeMetrics = {
  calls: number;
  newLeads: number;
  quotations: number;
  windowWorkingDays: number;
};

function TwoDayChallengeCard({
  challenge,
  rewardCapPctPoints = 25,
}: {
  challenge: ChallengeMetrics;
  rewardCapPctPoints?: number;
}) {
  const windowLabel = challenge.windowWorkingDays === 1 ? '1-Day' : '2-Day';
  const tiles: Array<[string, number]> = [
    ['Calls', challenge.calls],
    ['New leads', challenge.newLeads],
    ['Quotations', challenge.quotations],
  ];
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
        <Zap className="size-4 text-emerald-700" />
        <CardTitle className="text-base">Your Next {windowLabel} Challenge</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          You&apos;re currently below your monthly Min Expected, but you can still recover.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {tiles.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-muted/40 px-3 py-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-1 text-xl font-bold">{value}</p>
            </div>
          ))}
        </div>
        <p className="text-sm font-medium text-emerald-800">
          Complete your challenge and move one step closer to earning your {rewardCapPctPoints}% reward!
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Home dashboard PRR benefits: reward calculator + optional 2-day recovery challenge.
 * Hidden when the policy forecast is unavailable (off, shadow, unsigned, etc.).
 */
export function HomePrrBenefits() {
  const query = useMyPolicyDashboard(true);
  const forecast = query.data?.forecast ?? null;
  if (query.isError || !forecast) return null;

  const currency = query.data?.costPackage?.currency || 'ZAR';
  const challenge = forecast.recovery?.challenge ?? null;

  return (
    <div className="space-y-3" data-tour="home-prr-benefits">
      <MonthlyRewardCalculator
        prr={forecast.prr}
        activityPct={forecast.activityPct}
        currency={currency}
      />
      {challenge ? <TwoDayChallengeCard challenge={challenge} /> : null}
    </div>
  );
}

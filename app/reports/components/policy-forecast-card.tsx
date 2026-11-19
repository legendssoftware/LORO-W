'use client';

import { useMyPolicyDashboard } from '@/api/hooks';
import type { PolicyCostPackage, PolicyForecast, PolicyPaceBand } from '@/api/types/performance-policy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

const BAND_CLASS: Record<PolicyPaceBand, string> = {
  red: 'text-red-700',
  yellow: 'text-amber-700',
  green: 'text-emerald-700',
};

const REASON: Record<string, string> = {
  not_participating: 'You are not on the performance agreement.',
  not_signed: 'Sign the agreement to see your performance forecast.',
  no_prr: 'A PRR amount has not been set.',
  no_activity_target: 'A call or visit target is needed before a forecast.',
  shadow_mode: 'The forecast stays hidden while the policy is in shadow mode.',
};

function money(value: number, currency: string): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function CostLines({ pack }: { pack: PolicyCostPackage }) {
  const { t } = useTranslation('screens');
  const rows: Array<[string, number]> = [
    ['Base salary', pack.baseSalary],
    ['Car instalment', pack.carInstalment],
    ['Car insurance', pack.carInsurance],
    ['Fuel', pack.fuel],
    ['Phone', pack.cellPhoneAllowance],
    ['Car maintenance', pack.carMaintenance],
    ['CGIC', pack.cgicCosts],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{label}</dt>
          <dd>{money(value, pack.currency)}</dd>
        </div>
      ))}
      <div className="col-span-2 mt-1 flex justify-between border-t pt-1 font-medium">
        <dt>{t('chrome.reports.forecast.costPackage')}</dt>
        <dd>{money(pack.totalCost, pack.currency)}</dd>
      </div>
    </dl>
  );
}

function ForecastFigures({ forecast, currency }: { forecast: PolicyForecast; currency: string }) {
  const { t } = useTranslation('screens');
  return (
    <div className="space-y-2">
      <p className={`text-sm font-medium uppercase ${BAND_CLASS[forecast.paceBand]}`}>{forecast.paceBand}</p>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-muted-foreground">{t('chrome.reports.forecast.minExpected')}</dt>
          <dd className="text-base font-medium">{money(forecast.minExpected, currency)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('chrome.reports.forecast.projected')}</dt>
          <dd className="text-base font-medium">{money(forecast.amount, currency)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('chrome.reports.forecast.additionalEarnings')}</dt>
          <dd className="text-base font-medium">{money(forecast.additionalEarnings, currency)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('chrome.reports.forecast.activity')}</dt>
          <dd className="text-base font-medium">{Math.round(forecast.activityPct * 100)}%</dd>
        </div>
      </dl>
      {forecast.recovery ? (
        <p className="text-sm text-muted-foreground">
          Still to reach Min Expected: {forecast.recovery.calls} calls, {forecast.recovery.newLeads} new leads,{' '}
          {forecast.recovery.quotations} quotations
          {forecast.recovery.remainingWorkingDays > 0
            ? ` over ${forecast.recovery.remainingWorkingDays} working days`
            : ''}
          .
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">{forecast.caption}</p>
    </div>
  );
}

/** Cost package beside the PRR forecast. Hidden entirely when the policy is off. */
export function PolicyForecastCard() {
  const { t } = useTranslation('screens');
  const query = useMyPolicyDashboard();
  if (query.isError || !query.data) return null;
  const { costPackage, forecast, forecastUnavailableReason } = query.data;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{t('chrome.reports.forecast.title')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <CostLines pack={costPackage} />
        {forecast ? (
          <ForecastFigures forecast={forecast} currency={costPackage.currency} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {REASON[forecastUnavailableReason ?? ''] ?? 'A performance forecast is not available.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

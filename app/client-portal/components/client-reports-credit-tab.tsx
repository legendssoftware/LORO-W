'use client';

import { useState } from 'react';
import { AlertCircle, CreditCard, DollarSign, TrendingUp } from 'lucide-react';
import type { ClientProfileData } from '@/api/types/client-portal';
import { formatZar } from '@/lib/client-portal-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditLimitExtensionDialog } from './credit-limit-extension-dialog';

export function ClientReportsCreditTab({ client }: { client: ClientProfileData }) {
  const [extensionOpen, setExtensionOpen] = useState(false);
  const creditLimit = client.creditLimit ?? 0;
  const outstanding = client.outstandingBalance ?? 0;
  const available = Math.max(0, creditLimit - outstanding);
  const utilization = creditLimit > 0 ? (outstanding / creditLimit) * 100 : 0;
  const highUtilization = utilization >= 80;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base uppercase tracking-wide">
            <CreditCard className="size-5 text-violet-600" />
            Credit information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatBox label="Credit limit" value={formatZar(creditLimit)} icon={CreditCard} />
            <StatBox label="Outstanding" value={formatZar(outstanding)} icon={DollarSign} />
            <StatBox label="Available" value={formatZar(available)} icon={TrendingUp} />
          </div>
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-1">
              <span>Utilization</span>
              <span>{utilization.toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${highUtilization ? 'bg-amber-500' : 'bg-violet-600'}`}
                style={{ width: `${Math.min(100, utilization)}%` }}
              />
            </div>
            {highUtilization && (
              <p className="mt-3 flex items-center gap-2 text-sm text-amber-700">
                <AlertCircle className="size-4 shrink-0" />
                High credit utilization — consider requesting an extension.
              </p>
            )}
          </div>
          <Button className="mt-6" onClick={() => setExtensionOpen(true)}>
            Apply for credit limit extension
          </Button>
        </CardContent>
      </Card>
      <CreditLimitExtensionDialog open={extensionOpen} onOpenChange={setExtensionOpen} />
    </div>
  );
}

function StatBox({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg bg-muted/50 p-4 text-center">
      <Icon className="mx-auto size-5 text-violet-600 mb-2" />
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold mt-1">{value}</p>
    </div>
  );
}

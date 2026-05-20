'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { CreditCard, TrendingUp } from 'lucide-react';
import type { ClientProfileData } from '@/api/types/client-portal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientReportsCreditTab } from './client-reports-credit-tab';
import { ClientReportsSalesTab } from './client-reports-sales-tab';

const CLIENT_REPORT_TABS = [
  { value: 'credit', label: 'Credit', Icon: CreditCard },
  { value: 'sales', label: 'Sales', Icon: TrendingUp },
] as const;

type ClientTab = (typeof CLIENT_REPORT_TABS)[number]['value'];

function getValidTab(value: string | null): ClientTab {
  return CLIENT_REPORT_TABS.some((t) => t.value === value) ? (value as ClientTab) : 'credit';
}

export function ClientReportsTabs({ client }: { client: ClientProfileData }) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<ClientTab>(() =>
    getValidTab(searchParams.get('tab'))
  );

  useEffect(() => {
    setActiveTab(getValidTab(searchParams.get('tab')));
  }, [searchParams]);

  const onTabChange = useCallback((value: string) => {
    setActiveTab(value as ClientTab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', value);
    window.history.replaceState({}, '', url.pathname + url.search);
  }, []);

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="mb-6">
        {CLIENT_REPORT_TABS.map(({ value, label, Icon }) => (
          <TabsTrigger key={value} value={value} className="gap-2">
            <Icon className="size-4" />
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="credit">
        <ClientReportsCreditTab client={client} />
      </TabsContent>
      <TabsContent value="sales">
        <ClientReportsSalesTab client={client} />
      </TabsContent>
    </Tabs>
  );
}

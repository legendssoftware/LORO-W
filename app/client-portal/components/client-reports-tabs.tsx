'use client';

import { useState } from 'react';
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

export function ClientReportsTabs({ client }: { client: ClientProfileData }) {
  const [activeTab, setActiveTab] = useState<ClientTab>('credit');

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as ClientTab)}
      className="w-full"
    >
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

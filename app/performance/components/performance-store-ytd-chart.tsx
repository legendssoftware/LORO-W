'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PerformanceFilters, PerformanceMasterData } from '@/api/types/reports-performance';
import { usePerformanceStoreYtd } from '@/api/hooks/use-performance-store-ytd';
import { ReportsChartCard } from '@/app/reports/components/reports-chart-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PerformanceAreaChartCard } from './performance-charts';

interface PerformanceStoreYtdChartProps {
  filters: PerformanceFilters;
  masterData?: PerformanceMasterData;
}

export function PerformanceStoreYtdChart({
  filters,
  masterData,
}: PerformanceStoreYtdChartProps) {
  const { t } = useTranslation('screens');
  const stores = masterData?.branches ?? [];
  const [selectedStoreId, setSelectedStoreId] = useState<string | undefined>(undefined);
  const [isChartVisible, setIsChartVisible] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const userChoseAllRef = useRef(false);

  useEffect(() => {
    const node = chartRef.current;
    if (!node || isChartVisible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setIsChartVisible(true);
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isChartVisible]);

  useEffect(() => {
    if (stores.length === 0) return;
    const firstId = stores[0]?.id;
    if (!firstId) return;
    if (userChoseAllRef.current && selectedStoreId === undefined) return;
    const stillValid = selectedStoreId && stores.some((s) => s.id === selectedStoreId);
    if (!stillValid) {
      setSelectedStoreId(firstId);
      userChoseAllRef.current = false;
    }
  }, [stores, selectedStoreId]);

  const chartStoreId = useMemo(() => {
    if (!selectedStoreId) return undefined;
    const branch = stores.find((s) => s.id === selectedStoreId);
    const code = branch?.code?.trim();
    return code || selectedStoreId;
  }, [selectedStoreId, stores]);

  const isScopeReady =
    stores.length === 0 || selectedStoreId !== undefined || userChoseAllRef.current;

  const { monthlyData, isLoading, isError, refetch } = usePerformanceStoreYtd({
    filters,
    storeId: chartStoreId,
    enabled: isChartVisible && isScopeReady && stores.length > 0,
  });

  const chartPoints = monthlyData.map((row) => ({
    label: `${row.month} ${row.year}`,
    value: row.total,
  }));

  const selectedName = selectedStoreId
    ? stores.find((s) => s.id === selectedStoreId)?.name ?? t('tables.store')
    : t('chrome.performance.ytd.allStores');

  return (
    <div ref={chartRef} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{t('chrome.performance.ytd.history')}</p>
        <Select
          value={selectedStoreId ?? 'all'}
          onValueChange={(value) => {
            if (value === 'all') {
              userChoseAllRef.current = true;
              setSelectedStoreId(undefined);
              return;
            }
            userChoseAllRef.current = false;
            setSelectedStoreId(value);
          }}
        >
          <SelectTrigger className="w-[220px]" size="sm">
            <SelectValue placeholder={t('chrome.performance.ytd.selectStore')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('chrome.performance.ytd.allStores')}</SelectItem>
            {stores.map((store) => (
              <SelectItem key={store.id} value={store.id}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {stores.length === 0 ? (
        <ReportsChartCard title={t('chrome.performance.ytd.title')} description={t('chrome.performance.ytd.description')}>
          <p className="py-8 text-center text-sm text-muted-foreground">{t('chrome.performance.ytd.noStores')}</p>
        </ReportsChartCard>
      ) : (
        <PerformanceAreaChartCard
          title={t('chrome.performance.ytd.titleNamed', { name: selectedName })}
          description={t('chrome.performance.ytd.descriptionLong')}
          data={chartPoints}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
        />
      )}
    </div>
  );
}

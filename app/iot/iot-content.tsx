'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useTokenReady,
  useSessionSync,
  useBranches,
  useIotDevices,
} from '@/api/hooks';
import type { IotDevice } from '@/api/types/iot';
import type { DeviceStatus, DeviceType } from '@/api/types/iot';
import { LoadingSpinner } from '@/components/loading-spinner';
import { isStaffDashboardVisible } from '@/lib/access';
import { IotDeviceCard, IotDeviceCardSkeleton } from '@/app/iot/components/iot-device-card';
import {
  IOT_FILTER_ALL,
  IotFiltersBar,
} from '@/app/iot/components/iot-filters-bar';
import { IotDeviceDialog } from '@/app/iot/components/iot-device-dialog';

export function IotContent() {
  const { isTokenReady } = useTokenReady();
  const { backendUserData: profile } = useSessionSync();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    typeof IOT_FILTER_ALL | DeviceStatus
  >(IOT_FILTER_ALL);
  const [typeFilter, setTypeFilter] = useState<
    typeof IOT_FILTER_ALL | DeviceType
  >(IOT_FILTER_ALL);
  const [branchUidFilter, setBranchUidFilter] = useState<
    typeof IOT_FILTER_ALL | string
  >(IOT_FILTER_ALL);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDevice, setDialogDevice] = useState<IotDevice | null>(null);

  const branchesQuery = useBranches({
    enabled: mounted && isTokenReady,
  });
  const branches = branchesQuery.data ?? [];

  const listParams = useMemo(
    () => ({
      page: 1,
      limit: 100,
      ...(statusFilter !== IOT_FILTER_ALL && { status: statusFilter }),
      ...(typeFilter !== IOT_FILTER_ALL && { deviceType: typeFilter }),
    }),
    [statusFilter, typeFilter]
  );

  const devicesQuery = useIotDevices(listParams, {
    enabled: mounted && isTokenReady,
  });

  const filteredDevices = useMemo(() => {
    const rows = devicesQuery.data?.data ?? [];
    let out = rows;
    if (branchUidFilter !== IOT_FILTER_ALL) {
      const uid = branchUidFilter;
      out = out.filter((d) => String(d.branchUid ?? d.branchID) === uid);
    }
    const q = search.trim().toLowerCase();
    if (!q) return out;
    return out.filter(
      (d) =>
        d.deviceID.toLowerCase().includes(q) ||
        d.deviceTag.toLowerCase().includes(q) ||
        d.devicLocation.toLowerCase().includes(q)
    );
  }, [devicesQuery.data, search, branchUidFilter]);

  const isStaff = isStaffDashboardVisible(profile?.accessLevel);
  const isLoading = devicesQuery.isLoading;

  if (!mounted || !isTokenReady) {
    return <LoadingSpinner wrapperClassName="py-12" />;
  }

  if (profile && !isStaff) {
    return (
      <div className="container mx-auto max-w-6xl lg:max-w-[88rem] px-3 py-8 sm:px-6">
        <p className="text-center text-muted-foreground py-12">
          IoT management is available to staff only.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <main className="container mx-auto max-w-6xl lg:max-w-[88rem] px-3 py-8 sm:px-6 flex flex-col flex-1 min-h-0">
        <div className="shrink-0 mb-6" data-tour="iot-page-header">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
            IoT devices
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Manage connected hardware and access devices per branch.
          </p>
        </div>

        <IotFiltersBar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          branchUidFilter={branchUidFilter}
          onBranchUidFilterChange={setBranchUidFilter}
          branches={branches}
          onAddDevice={() => {
            setDialogDevice(null);
            setDialogOpen(true);
          }}
        />

        <div className="flex-1 min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <IotDeviceCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              {filteredDevices.map((device) => (
                <IotDeviceCard
                  key={device.id}
                  device={device}
                  onClick={() => {
                    setDialogDevice(device);
                    setDialogOpen(true);
                  }}
                />
              ))}
            </div>
          )}
          {!isLoading && filteredDevices.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No devices to show. Add one or adjust filters.
            </p>
          ) : null}
        </div>
      </main>

      <IotDeviceDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setDialogDevice(null);
        }}
        device={dialogDevice}
        branches={branches}
      />
    </div>
  );
}

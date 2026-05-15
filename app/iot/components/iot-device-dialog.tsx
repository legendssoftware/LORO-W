'use client';

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BranchListItem } from '@/api/types/branch';
import { getBranchDisplayLabel } from '@/api/types/branch';
import type { DeviceStatus, DeviceType, IotDevice } from '@/api/types/iot';
import {
  useCreateIotDeviceMutation,
  useDeleteIotDeviceMutation,
  useUpdateIotDeviceMutation,
} from '@/api/hooks/use-iot-devices';
import { SearchableBranchPicker } from '@/app/reports/components/reports-searchable-filter-comboboxes';

const DEVICE_STATUSES: DeviceStatus[] = [
  'online',
  'offline',
  'maintenance',
  'disconnected',
];

const DEVICE_TYPES: DeviceType[] = [
  'door_sensor',
  'camera',
  'sensor',
  'actuator',
  'controller',
  'gateway',
  'rfid',
  'nfc',
  'barcode',
  'beacon',
  'other',
];

function sortBranches(rows: BranchListItem[]) {
  return [...rows].sort((a, b) =>
    getBranchDisplayLabel(a).localeCompare(getBranchDisplayLabel(b))
  );
}

export function IotDeviceDialog({
  open,
  onOpenChange,
  device,
  branches,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  device: IotDevice | null;
  branches: BranchListItem[];
}) {
  const isCreate = device == null;
  const createMutation = useCreateIotDeviceMutation();
  const updateMutation = useUpdateIotDeviceMutation();
  const deleteMutation = useDeleteIotDeviceMutation();

  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const [deviceID, setDeviceID] = React.useState('');
  const [branchUid, setBranchUid] = React.useState('');
  const [deviceType, setDeviceType] = React.useState<DeviceType>('door_sensor');
  const [deviceIP, setDeviceIP] = React.useState('');
  const [devicePort, setDevicePort] = React.useState('');
  const [devicLocation, setDevicLocation] = React.useState('');
  const [deviceTag, setDeviceTag] = React.useState('');
  const [currentStatus, setCurrentStatus] = React.useState<DeviceStatus>('online');

  React.useEffect(() => {
    if (!open) return;
    const sorted = sortBranches(branches);
    const defaultBranch =
      sorted.length > 0 ? String(sorted[0].uid) : '';

    if (device) {
      setDeviceID(device.deviceID);
      setBranchUid(String(device.branchUid ?? device.branchID ?? ''));
      setDeviceType(device.deviceType);
      setDeviceIP(device.deviceIP);
      setDevicePort(String(device.devicePort));
      setDevicLocation(device.devicLocation);
      setDeviceTag(device.deviceTag);
      setCurrentStatus(device.currentStatus);
    } else {
      setDeviceID('');
      setBranchUid(defaultBranch);
      setDeviceType('door_sensor');
      setDeviceIP('');
      setDevicePort('');
      setDevicLocation('');
      setDeviceTag('');
      setCurrentStatus('online');
    }
    setDeleteOpen(false);
  }, [open, device, branches]);

  function handleClose(next: boolean) {
    if (!next && (createMutation.isPending || updateMutation.isPending)) return;
    onOpenChange(next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const portNum = Number(devicePort);
    if (!Number.isFinite(portNum) || portNum < 1 || portNum > 65535) {
      return;
    }

    const branchIdNum = Number(branchUid);
    if (!branchUid || !Number.isFinite(branchIdNum) || branchIdNum < 1) {
      return;
    }

    if (isCreate) {
      const idTrim = deviceID.trim().toUpperCase();
      if (!/^[A-Z0-9_-]+$/.test(idTrim) || idTrim.length < 3) {
        return;
      }
      await createMutation.mutateAsync({
        branchID: branchIdNum,
        deviceID: idTrim,
        deviceType,
        deviceIP: deviceIP.trim(),
        devicePort: portNum,
        devicLocation: devicLocation.trim(),
        deviceTag: deviceTag.trim(),
        currentStatus,
      });
      handleClose(false);
      return;
    }

    if (!device) return;

    await updateMutation.mutateAsync({
      id: device.id,
      body: {
        deviceIP: deviceIP.trim(),
        devicePort: portNum,
        devicLocation: devicLocation.trim(),
        deviceTag: deviceTag.trim(),
        deviceType,
        currentStatus,
        branchID: branchIdNum,
      },
    });
    handleClose(false);
  }

  async function onConfirmDelete() {
    if (!device) return;
    await deleteMutation.mutateAsync(device.id);
    setDeleteOpen(false);
    handleClose(false);
  }

  const sortedBranches = React.useMemo(() => sortBranches(branches), [branches]);
  const busy = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isCreate ? 'Register device' : device?.deviceID}</DialogTitle>
            <DialogDescription>
              {isCreate
                ? 'Add an IoT device for your organisation. Org scope is taken from your signed-in profile.'
                : 'Update network settings, location, type, or status.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4">
            {!isCreate && device ? (
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-1">
                <p>
                  Opens / closes / total:{' '}
                  <span className="font-medium text-foreground">
                    {device.analytics?.openCount ?? 0} /{' '}
                    {device.analytics?.closeCount ?? 0} /{' '}
                    {device.analytics?.totalCount ?? 0}
                  </span>
                </p>
                <p>Database ID: {device.id}</p>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="iot-device-id">Device ID</Label>
              <Input
                id="iot-device-id"
                value={deviceID}
                onChange={(e) => setDeviceID(e.target.value)}
                onBlur={() => setDeviceID((s) => s.trim().toUpperCase())}
                disabled={!isCreate || busy}
                placeholder="DOOR_SENSOR_MAIN_001"
                autoComplete="off"
              />
              {isCreate ? (
                <p className="text-[11px] text-muted-foreground">
                  Uppercase letters, numbers, underscores, and hyphens only (3–50 chars).
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Branch</Label>
              <SearchableBranchPicker
                branches={sortedBranches}
                selectedBranchId={branchUid}
                onBranchChange={setBranchUid}
                withAllOption={false}
                emptySelectionLabel="Select branch"
                triggerClassName="w-full max-w-none justify-between font-normal bg-white"
                searchPlaceholder="Search branches…"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={deviceType}
                  onValueChange={(v) => setDeviceType(v as DeviceType)}
                  disabled={busy}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEVICE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={currentStatus}
                  onValueChange={(v) => setCurrentStatus(v as DeviceStatus)}
                  disabled={busy}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEVICE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="iot-ip">IP address</Label>
                <Input
                  id="iot-ip"
                  value={deviceIP}
                  onChange={(e) => setDeviceIP(e.target.value)}
                  disabled={busy}
                  placeholder="192.168.1.100"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="iot-port">Port</Label>
                <Input
                  id="iot-port"
                  inputMode="numeric"
                  value={devicePort}
                  onChange={(e) => setDevicePort(e.target.value)}
                  disabled={busy}
                  placeholder="8080"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="iot-location">Location</Label>
              <Input
                id="iot-location"
                value={devicLocation}
                onChange={(e) => setDevicLocation(e.target.value)}
                disabled={busy}
                placeholder="Main entrance – Building A"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="iot-tag">Tag</Label>
              <Input
                id="iot-tag"
                value={deviceTag}
                onChange={(e) => setDeviceTag(e.target.value)}
                disabled={busy}
                placeholder="front-door-access"
                autoComplete="off"
              />
            </div>

            <DialogFooter className="gap-2 sm:justify-between flex-col-reverse sm:flex-row">
              {!isCreate ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full sm:w-auto"
                  disabled={busy || deleteMutation.isPending}
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete
                </Button>
              ) : (
                <span />
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => handleClose(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="default" disabled={busy}>
                  {isCreate ? 'Create' : 'Save changes'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this device?</AlertDialogTitle>
            <AlertDialogDescription>
              This soft-deletes the device record. Hardware may keep sending events until
              unregistered on the device side.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => void onConfirmDelete()}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

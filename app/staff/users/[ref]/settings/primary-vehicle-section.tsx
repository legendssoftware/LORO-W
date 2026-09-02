'use client';

import { useMemo, useState } from 'react';
import type { Control } from 'react-hook-form';
import { useFormContext } from 'react-hook-form';
import type { AssetRecord } from '@/api/types/asset';
import {
  useCreateAssetMutation,
  useDeleteAssetMutation,
  useSelectableVehicleAssets,
  useUpdateAssetMutation,
} from '@/api/hooks/use-assets';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckIcon, Loader2Icon } from '@/lib/icons';
import { Pencil } from 'lucide-react';
import type { TargetFormValues } from '@/lib/user-form';
import {
  VehicleFormDialog,
  buildCreateAssetPayload,
  buildUpdateAssetPayload,
  type VehicleFormValues,
} from './vehicle-form-dialog';

const NONE_VALUE = '__none__';

type VehicleRole = 'primary' | 'secondary';

type PrimaryVehicleSectionProps = {
  control: Control<TargetFormValues>;
  userUid: number;
  clerkUserId?: string | null;
  branchUid?: number | null;
};

function formatVehicleLabel(asset: AssetRecord): string {
  const name =
    asset.displayName?.trim() ||
    `${asset.brand} ${asset.modelNumber}`.trim();
  const reg = asset.registrationPlate?.trim();
  return reg ? `${name} (${reg})` : name;
}

function formatFuelType(fuelType: AssetRecord['fuelType']): string {
  if (fuelType === 'petrol') return 'Petrol';
  if (fuelType === 'diesel') return 'Diesel';
  return '—';
}

function parseAssetUid(value: string): number | null {
  if (value === NONE_VALUE) return null;
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : null;
}

function isAssignedUid(uid: number | null | undefined): uid is number {
  return uid != null && uid > 0;
}

function vehicleRoleField(
  role: VehicleRole
): 'primaryVehicleAssetUid' | 'secondaryVehicleAssetUid' {
  switch (role) {
    case 'primary':
      return 'primaryVehicleAssetUid';
    case 'secondary':
      return 'secondaryVehicleAssetUid';
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

function nextRoleForNewVehicle(
  primary: number | null | undefined,
  secondary: number | null | undefined
): VehicleRole | null {
  if (!isAssignedUid(primary)) return 'primary';
  if (!isAssignedUid(secondary)) return 'secondary';
  return null;
}

type VehicleDetailsProps = {
  asset: AssetRecord;
  onEdit: () => void;
};

function VehicleDetails({ asset, onEdit }: VehicleDetailsProps) {
  return (
    <div className="rounded-md border border-border/40 bg-background/60 p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">Vehicle details</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Edit vehicle"
          onClick={onEdit}
        >
          <Pencil className="size-3.5" />
        </Button>
      </div>
      <dl className="text-muted-foreground grid gap-1 text-xs sm:grid-cols-2">
        <div>
          <dt className="font-medium text-foreground">Display name</dt>
          <dd>{asset.displayName?.trim() || '—'}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Make / model</dt>
          <dd>
            {asset.brand} {asset.modelNumber}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Fuel type</dt>
          <dd>{formatFuelType(asset.fuelType)}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Size</dt>
          <dd>{asset.vehicleSizeClass ?? '—'}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Rated consumption</dt>
          <dd>
            {asset.ratedKmPerLitre != null
              ? `${asset.ratedKmPerLitre} km/L`
              : '—'}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Registration</dt>
          <dd>{asset.registrationPlate?.trim() || '—'}</dd>
        </div>
      </dl>
    </div>
  );
}

export function PrimaryVehicleSection({
  control,
  userUid,
  clerkUserId,
  branchUid,
}: PrimaryVehicleSectionProps) {
  const { setValue, watch, getValues } = useFormContext<TargetFormValues>();
  const primaryUid = watch('primaryVehicleAssetUid');
  const secondaryUid = watch('secondaryVehicleAssetUid');
  const { data: vehicles = [], fleetVehicles = [], isLoading, refetch } =
    useSelectableVehicleAssets(userUid, { primaryUid, secondaryUid });
  const createAsset = useCreateAssetMutation();
  const updateAsset = useUpdateAssetMutation();
  const deleteAsset = useDeleteAssetMutation();

  const [addOpen, setAddOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<AssetRecord | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const hasPrimary = isAssignedUid(primaryUid);
  const hasSecondary = isAssignedUid(secondaryUid);

  const selectedPrimary = useMemo(
    () => fleetVehicles.find((v) => v.uid === primaryUid) ?? null,
    [fleetVehicles, primaryUid]
  );
  const selectedSecondary = useMemo(
    () => fleetVehicles.find((v) => v.uid === secondaryUid) ?? null,
    [fleetVehicles, secondaryUid]
  );

  function assignVehicleRole(role: VehicleRole, uid: number | null) {
    const field = vehicleRoleField(role);
    setValue(field, uid, { shouldDirty: true, shouldTouch: true });
    if (role === 'primary' && uid != null && uid === getValues('secondaryVehicleAssetUid')) {
      setValue('secondaryVehicleAssetUid', null, {
        shouldDirty: true,
        shouldTouch: true,
      });
    }
    if (role === 'secondary' && uid != null && uid === getValues('primaryVehicleAssetUid')) {
      setValue('secondaryVehicleAssetUid', null, {
        shouldDirty: true,
        shouldTouch: true,
      });
    }
  }

  function unassignVehicleIfDeleted(uid: number) {
    if (getValues('primaryVehicleAssetUid') === uid) {
      setValue('primaryVehicleAssetUid', null, {
        shouldDirty: true,
        shouldTouch: true,
      });
    }
    if (getValues('secondaryVehicleAssetUid') === uid) {
      setValue('secondaryVehicleAssetUid', null, {
        shouldDirty: true,
        shouldTouch: true,
      });
    }
  }

  async function handleAddVehicle(values: VehicleFormValues) {
    if (!clerkUserId?.trim()) return;
    if (!branchUid || branchUid <= 0) return;

    const serial =
      values.registrationPlate.trim() ||
      `VEH-${userUid}-${Date.now().toString(36).toUpperCase()}`;

    const created = await createAsset.mutateAsync(
      buildCreateAssetPayload(values, {
        userUid,
        clerkUserId,
        branchUid,
        serialNumber: serial,
      })
    );

    let createdUid: number | undefined = created.asset?.uid;
    if (!createdUid) {
      const refreshed = await refetch();
      const fallback =
        refreshed.data?.find((a) => a.serialNumber === serial) ??
        refreshed.data?.slice().sort((a, b) => b.uid - a.uid)[0];
      createdUid = fallback?.uid;
    }

    if (createdUid) {
      const role = nextRoleForNewVehicle(
        getValues('primaryVehicleAssetUid'),
        getValues('secondaryVehicleAssetUid')
      );
      if (role) assignVehicleRole(role, createdUid);
    }

    setAddOpen(false);
  }

  async function handleEditVehicle(values: VehicleFormValues) {
    if (!editAsset) return;

    await updateAsset.mutateAsync({
      uid: editAsset.uid,
      payload: buildUpdateAssetPayload(values, editAsset),
    });

    await refetch();
    setEditAsset(null);
  }

  async function handleConfirmDelete() {
    if (!editAsset) return;

    const uid = editAsset.uid;
    await deleteAsset.mutateAsync(uid);
    unassignVehicleIfDeleted(uid);
    await refetch();
    setDeleteConfirmOpen(false);
    setEditAsset(null);
  }

  const editLabel = editAsset
    ? formatVehicleLabel(editAsset)
    : 'this vehicle';

  return (
    <div className="sm:col-span-2 lg:col-span-3 space-y-3 rounded-md border border-border/50 bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Vehicles</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!clerkUserId || !branchUid}
          onClick={() => setAddOpen(true)}
        >
          Add vehicle
        </Button>
      </div>

      <FormField
        control={control}
        name="primaryVehicleAssetUid"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1.5">
              Primary vehicle
              {hasPrimary ? (
                <CheckIcon className="size-4 text-green-600 dark:text-green-500" />
              ) : null}
            </FormLabel>
            <Select
              disabled={isLoading}
              value={
                field.value != null && field.value > 0
                  ? String(field.value)
                  : NONE_VALUE
              }
              onValueChange={(v) => {
                assignVehicleRole('primary', parseAssetUid(v));
              }}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select primary vehicle" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>No vehicle selected</SelectItem>
                {vehicles.map((asset) => (
                  <SelectItem key={asset.uid} value={String(asset.uid)}>
                    {formatVehicleLabel(asset)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {isLoading ? (
        <p className="text-muted-foreground flex items-center gap-1 text-xs">
          <Loader2Icon className="size-3 animate-spin" />
          Loading vehicles…
        </p>
      ) : selectedPrimary ? (
        <VehicleDetails
          asset={selectedPrimary}
          onEdit={() => setEditAsset(selectedPrimary)}
        />
      ) : vehicles.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          No active fleet vehicles are available. Add a vehicle or assign one from Assets.
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          No primary vehicle — trip fuel estimates use the fleet default (12 km/L)
          unless a secondary is set.
        </p>
      )}

      <FormField
        control={control}
        name="secondaryVehicleAssetUid"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1.5">
              Secondary vehicle
              {hasSecondary ? (
                <CheckIcon className="size-4 text-green-600 dark:text-green-500" />
              ) : null}
            </FormLabel>
            <Select
              disabled={isLoading}
              value={
                field.value != null && field.value > 0
                  ? String(field.value)
                  : NONE_VALUE
              }
              onValueChange={(v) => {
                assignVehicleRole('secondary', parseAssetUid(v));
              }}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select secondary vehicle" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>No vehicle selected</SelectItem>
                {vehicles
                  .filter(
                    (asset) =>
                      asset.uid !== primaryUid || asset.uid === field.value
                  )
                  .map((asset) => (
                    <SelectItem key={asset.uid} value={String(asset.uid)}>
                      {formatVehicleLabel(asset)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {selectedSecondary ? (
        <VehicleDetails
          asset={selectedSecondary}
          onEdit={() => setEditAsset(selectedSecondary)}
        />
      ) : null}

      <VehicleFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="add"
        isPending={createAsset.isPending}
        canSubmit={Boolean(clerkUserId && branchUid)}
        onSubmit={handleAddVehicle}
      />

      <VehicleFormDialog
        open={editAsset != null}
        onOpenChange={(open) => {
          if (!open) setEditAsset(null);
        }}
        mode="edit"
        asset={editAsset}
        isPending={updateAsset.isPending}
        isDeletePending={deleteAsset.isPending}
        onSubmit={handleEditVehicle}
        onDelete={() => setDeleteConfirmOpen(true)}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <span className="font-medium text-foreground">{editLabel}</span>{' '}
              from the fleet. This cannot be undone from this screen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAsset.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteAsset.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
            >
              {deleteAsset.isPending ? 'Deleting…' : 'Delete vehicle'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

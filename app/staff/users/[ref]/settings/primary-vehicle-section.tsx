'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Control } from 'react-hook-form';
import { useFormContext } from 'react-hook-form';
import type { AssetRecord } from '@/api/types/asset';
import toast from 'react-hot-toast';
import {
  useCreateAssetMutation,
  useDeleteAssetMutation,
  useSelectableVehicleAssets,
  useUpdateAssetMutation,
} from '@/api/hooks/use-assets';
import type { PatchUserTargetBody } from '@/api/endpoints/user';
import { usePatchUserTarget } from '@/api/hooks/use-user';
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
import {
  fillPrimaryVehicleUidFromOwned,
  type TargetFormValues,
} from '@/lib/user-form';
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
  userRef: string;
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

function mergeAssignedIntoOptions(
  vehicles: AssetRecord[],
  assigned: AssetRecord | null
): AssetRecord[] {
  if (!assigned) return vehicles;
  if (vehicles.some((asset) => asset.uid === assigned.uid)) return vehicles;
  return [assigned, ...vehicles];
}

function AssignedVehicleUnavailable({ uid }: { uid: number | null | undefined }) {
  const label = uid != null && uid > 0 ? `#${uid}` : '';
  return (
    <div className="rounded-md border border-dashed border-border/60 bg-background/60 p-2">
      <p className="text-xs font-medium text-foreground">Assigned vehicle</p>
      <p className="text-muted-foreground text-xs">
        Vehicle {label} is assigned but details are unavailable. It may have been
        removed from the fleet.
      </p>
    </div>
  );
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
  userRef,
  clerkUserId,
  branchUid,
}: PrimaryVehicleSectionProps) {
  const { setValue, watch, getValues, formState } = useFormContext<TargetFormValues>();
  const primaryUid = watch('primaryVehicleAssetUid');
  const secondaryUid = watch('secondaryVehicleAssetUid');
  const {
    data: vehicles = [],
    fleetVehicles = [],
    ownedVehicles = [],
    listedAssignment,
    isLoading,
    refetch,
  } = useSelectableVehicleAssets(userUid, { primaryUid, secondaryUid });
  const createAsset = useCreateAssetMutation();
  const updateAsset = useUpdateAssetMutation();
  const deleteAsset = useDeleteAssetMutation();
  const assignTarget = usePatchUserTarget(userRef);

  const [addOpen, setAddOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<AssetRecord | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const skipOwnedPrimaryRef = useRef(false);
  const skipListedSecondaryRef = useRef(false);

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

  const primaryOptions = useMemo(
    () => mergeAssignedIntoOptions(vehicles, selectedPrimary),
    [vehicles, selectedPrimary]
  );
  const secondaryOptions = useMemo(
    () =>
      mergeAssignedIntoOptions(vehicles, selectedSecondary).filter(
        (asset) => asset.uid !== primaryUid || asset.uid === secondaryUid
      ),
    [vehicles, selectedSecondary, primaryUid, secondaryUid]
  );

  useEffect(() => {
    if (isLoading) return;
    const ownedUids = ownedVehicles.map((asset) => asset.uid);
    const nextPrimary = fillPrimaryVehicleUidFromOwned(
      primaryUid ?? listedAssignment?.primaryUid,
      secondaryUid ?? listedAssignment?.secondaryUid,
      ownedUids,
      Boolean(formState.dirtyFields.primaryVehicleAssetUid) ||
        skipOwnedPrimaryRef.current
    );
    if (nextPrimary != null && nextPrimary !== primaryUid) {
      setValue('primaryVehicleAssetUid', nextPrimary, {
        shouldDirty: false,
        shouldTouch: false,
      });
    }
    const listedSecondary = listedAssignment?.secondaryUid;
    if (
      !formState.dirtyFields.secondaryVehicleAssetUid &&
      !skipListedSecondaryRef.current &&
      !isAssignedUid(secondaryUid) &&
      isAssignedUid(listedSecondary) &&
      listedSecondary !== nextPrimary
    ) {
      setValue('secondaryVehicleAssetUid', listedSecondary, {
        shouldDirty: false,
        shouldTouch: false,
      });
    }
  }, [
    isLoading,
    ownedVehicles,
    listedAssignment,
    primaryUid,
    secondaryUid,
    formState.dirtyFields.primaryVehicleAssetUid,
    formState.dirtyFields.secondaryVehicleAssetUid,
    setValue,
  ]);

  function assignVehicleRole(role: VehicleRole, uid: number | null) {
    if (
      role === 'secondary' &&
      uid != null &&
      uid === getValues('primaryVehicleAssetUid')
    ) {
      return;
    }
    const field = vehicleRoleField(role);
    if (role === 'primary' && uid != null && uid === getValues('secondaryVehicleAssetUid')) {
      setValue('secondaryVehicleAssetUid', null, {
        shouldDirty: true,
        shouldTouch: true,
      });
    }
    setValue(field, uid, { shouldDirty: true, shouldTouch: true });
  }

  async function persistVehicleRole(role: VehicleRole, uid: number | null) {
    if (
      role === 'secondary' &&
      uid != null &&
      uid === getValues('primaryVehicleAssetUid')
    ) {
      return;
    }
    const field = vehicleRoleField(role);
    const previous = getValues(field);
    const previousSecondary = getValues('secondaryVehicleAssetUid');
    assignVehicleRole(role, uid);
    if (role === 'primary') skipOwnedPrimaryRef.current = uid == null;
    if (role === 'secondary') skipListedSecondaryRef.current = uid == null;
    const body: PatchUserTargetBody = { [field]: uid };
    if (role === 'primary' && uid != null && previousSecondary === uid) {
      body.secondaryVehicleAssetUid = null;
    }
    try {
      await assignTarget.mutateAsync(body);
      setValue(field, uid, { shouldDirty: false, shouldTouch: true });
      if (body.secondaryVehicleAssetUid === null) {
        setValue('secondaryVehicleAssetUid', null, {
          shouldDirty: false,
          shouldTouch: true,
        });
      }
    } catch {
      setValue(field, previous, { shouldDirty: false });
      if (role === 'primary') {
        setValue('secondaryVehicleAssetUid', previousSecondary, {
          shouldDirty: false,
        });
      }
      toast.error('Could not save vehicle assignment');
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

    const createdUid = created.asset?.uid;
    if (!createdUid) {
      toast.error(
        'Vehicle was created but its id was not returned. Refresh and assign it from the list.'
      );
      setAddOpen(false);
      return;
    }

    const role = nextRoleForNewVehicle(
      getValues('primaryVehicleAssetUid'),
      getValues('secondaryVehicleAssetUid')
    );
    if (role) {
      assignVehicleRole(role, createdUid);
      if (role === 'primary') skipOwnedPrimaryRef.current = false;
      if (role === 'secondary') skipListedSecondaryRef.current = false;
      const field = vehicleRoleField(role);
      try {
        await assignTarget.mutateAsync({ [field]: createdUid });
        setValue(field, createdUid, { shouldDirty: false, shouldTouch: true });
      } catch {
        toast.error(
          'Vehicle was added but could not be assigned. Save the user form to finish assignment.'
        );
      }
    }

    await refetch();
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
              disabled={isLoading || assignTarget.isPending}
              value={
                field.value != null && field.value > 0
                  ? String(field.value)
                  : NONE_VALUE
              }
              onValueChange={(v) => {
                void persistVehicleRole('primary', parseAssetUid(v));
              }}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select primary vehicle" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>No vehicle selected</SelectItem>
                {hasPrimary &&
                !primaryOptions.some((asset) => asset.uid === field.value) ? (
                  <SelectItem value={String(field.value)}>
                    Assigned vehicle #{field.value}
                  </SelectItem>
                ) : null}
                {primaryOptions.map((asset) => (
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

      {selectedPrimary ? (
        <VehicleDetails
          asset={selectedPrimary}
          onEdit={() => setEditAsset(selectedPrimary)}
        />
      ) : hasPrimary ? (
        isLoading ? (
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <Loader2Icon className="size-3 animate-spin" />
            Loading assigned vehicle…
          </p>
        ) : (
          <AssignedVehicleUnavailable uid={primaryUid} />
        )
      ) : isLoading ? (
        <p className="text-muted-foreground flex items-center gap-1 text-xs">
          <Loader2Icon className="size-3 animate-spin" />
          Loading vehicles…
        </p>
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
              disabled={isLoading || assignTarget.isPending}
              value={
                field.value != null && field.value > 0
                  ? String(field.value)
                  : NONE_VALUE
              }
              onValueChange={(v) => {
                void persistVehicleRole('secondary', parseAssetUid(v));
              }}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select secondary vehicle" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>No vehicle selected</SelectItem>
                {hasSecondary &&
                !secondaryOptions.some((asset) => asset.uid === field.value) ? (
                  <SelectItem value={String(field.value)}>
                    Assigned vehicle #{field.value}
                  </SelectItem>
                ) : null}
                {secondaryOptions.map((asset) => (
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
      ) : hasSecondary ? (
        isLoading ? (
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <Loader2Icon className="size-3 animate-spin" />
            Loading assigned vehicle…
          </p>
        ) : (
          <AssignedVehicleUnavailable uid={secondaryUid} />
        )
      ) : null}

      <VehicleFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="add"
        isPending={createAsset.isPending || assignTarget.isPending}
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

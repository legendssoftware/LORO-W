'use client';

import { useMemo, useState } from 'react';
import type { Control } from 'react-hook-form';
import { useFormContext } from 'react-hook-form';
import type { AssetRecord, CreateAssetPayload } from '@/api/types/asset';
import {
  useCreateAssetMutation,
  useSelectableVehicleAssets,
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
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckIcon, Loader2Icon } from '@/lib/icons';
import type { TargetFormValues } from '@/lib/user-form';

const VEHICLE_SIZE_OPTIONS = [
  { value: 'compact', label: 'Compact' },
  { value: 'sedan', label: 'Sedan' },
  { value: 'suv', label: 'SUV' },
  { value: 'bakkie', label: 'Bakkie' },
  { value: 'van', label: 'Van' },
  { value: 'other', label: 'Other' },
] as const;

const FUEL_TYPE_OPTIONS = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
] as const;

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

function parseAssetUid(value: string): number | null {
  if (value === NONE_VALUE) return null;
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : null;
}

function isAssignedUid(uid: number | null | undefined): uid is number {
  return uid != null && uid > 0;
}

/** Form field for a vehicle role on the staff user target. */
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

/** Assign a newly created vehicle to the first empty role, or neither. */
function nextRoleForNewVehicle(
  primary: number | null | undefined,
  secondary: number | null | undefined
): VehicleRole | null {
  if (!isAssignedUid(primary)) return 'primary';
  if (!isAssignedUid(secondary)) return 'secondary';
  return null;
}

function VehicleDetails({ asset }: { asset: AssetRecord }) {
  return (
    <dl className="text-muted-foreground grid gap-1 text-xs sm:grid-cols-2">
      <div>
        <dt className="font-medium text-foreground">Make / model</dt>
        <dd>
          {asset.brand} {asset.modelNumber}
        </dd>
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
  const [addOpen, setAddOpen] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [registrationPlate, setRegistrationPlate] = useState('');
  const [ratedKmPerLitre, setRatedKmPerLitre] = useState('');
  const [vehicleSizeClass, setVehicleSizeClass] = useState<string>('bakkie');
  const [fuelType, setFuelType] = useState<string>('diesel');

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

  async function handleAddVehicle() {
    if (!clerkUserId?.trim()) return;
    if (!branchUid || branchUid <= 0) return;

    const rated = Number(ratedKmPerLitre);
    if (!make.trim() || !model.trim() || !Number.isFinite(rated) || rated <= 0) {
      return;
    }

    const serial =
      registrationPlate.trim() ||
      `VEH-${userUid}-${Date.now().toString(36).toUpperCase()}`;

    const created = await createAsset.mutateAsync({
      category: 'VEHICLE',
      displayName: displayName.trim() || undefined,
      brand: make.trim(),
      modelNumber: model.trim(),
      serialNumber: serial,
      registrationPlate: registrationPlate.trim() || undefined,
      vehicleSizeClass: vehicleSizeClass as CreateAssetPayload['vehicleSizeClass'],
      fuelType: fuelType as CreateAssetPayload['fuelType'],
      ratedKmPerLitre: rated,
      purchaseDate: new Date().toISOString(),
      hasInsurance: false,
      owner: { uid: clerkUserId },
      branch: { uid: branchUid },
    });

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
    setMake('');
    setModel('');
    setDisplayName('');
    setRegistrationPlate('');
    setRatedKmPerLitre('');
  }

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
        <VehicleDetails asset={selectedPrimary} />
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

      {selectedSecondary ? <VehicleDetails asset={selectedSecondary} /> : null}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add vehicle</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1">
              <label className="text-sm font-medium">Display name</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Sales Hilux"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <label className="text-sm font-medium">Make</label>
                <Input
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  placeholder="Toyota"
                />
              </div>
              <div className="grid gap-1">
                <label className="text-sm font-medium">Model</label>
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Hilux 2.4 GD-6"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <label className="text-sm font-medium">Size class</label>
                <Select value={vehicleSizeClass} onValueChange={setVehicleSizeClass}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_SIZE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <label className="text-sm font-medium">Fuel type</label>
                <Select value={fuelType} onValueChange={setFuelType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <label className="text-sm font-medium">Rated km/L</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={ratedKmPerLitre}
                  onChange={(e) => setRatedKmPerLitre(e.target.value)}
                  placeholder="9.5"
                />
              </div>
              <div className="grid gap-1">
                <label className="text-sm font-medium">Registration</label>
                <Input
                  value={registrationPlate}
                  onChange={(e) => setRegistrationPlate(e.target.value)}
                  placeholder="CA 123-456"
                />
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              The new vehicle is assigned as primary if none is set, otherwise as
              secondary if that slot is free.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={createAsset.isPending || !clerkUserId || !branchUid}
              onClick={() => {
                void handleAddVehicle();
              }}
            >
              {createAsset.isPending ? (
                <>
                  <Loader2Icon className="mr-1 size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save vehicle'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

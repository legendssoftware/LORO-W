'use client';

import { useEffect, useState } from 'react';
import type { AssetRecord, CreateAssetPayload, UpdateAssetPayload } from '@/api/types/asset';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2Icon } from '@/lib/icons';

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

export type VehicleFormValues = {
  displayName: string;
  make: string;
  model: string;
  registrationPlate: string;
  ratedKmPerLitre: string;
  vehicleSizeClass: string;
  fuelType: string;
};

const EMPTY_FORM: VehicleFormValues = {
  displayName: '',
  make: '',
  model: '',
  registrationPlate: '',
  ratedKmPerLitre: '',
  vehicleSizeClass: 'bakkie',
  fuelType: 'diesel',
};

function assetToFormValues(asset: AssetRecord): VehicleFormValues {
  return {
    displayName: asset.displayName?.trim() ?? '',
    make: asset.brand?.trim() ?? '',
    model: asset.modelNumber?.trim() ?? '',
    registrationPlate: asset.registrationPlate?.trim() ?? '',
    ratedKmPerLitre:
      asset.ratedKmPerLitre != null ? String(asset.ratedKmPerLitre) : '',
    vehicleSizeClass: asset.vehicleSizeClass ?? 'bakkie',
    fuelType: asset.fuelType ?? 'diesel',
  };
}

function isFormValid(values: VehicleFormValues): boolean {
  const rated = Number(values.ratedKmPerLitre);
  return (
    values.make.trim().length > 0 &&
    values.model.trim().length > 0 &&
    Number.isFinite(rated) &&
    rated > 0
  );
}

type VehicleFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'add' | 'edit';
  asset?: AssetRecord | null;
  isPending?: boolean;
  canSubmit?: boolean;
  onSubmit: (values: VehicleFormValues) => void | Promise<void>;
  onDelete?: () => void;
  isDeletePending?: boolean;
};

export function VehicleFormDialog({
  open,
  onOpenChange,
  mode,
  asset,
  isPending = false,
  canSubmit = true,
  onSubmit,
  onDelete,
  isDeletePending = false,
}: VehicleFormDialogProps) {
  const [form, setForm] = useState<VehicleFormValues>(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && asset) {
      setForm(assetToFormValues(asset));
      return;
    }
    setForm(EMPTY_FORM);
  }, [open, mode, asset]);

  function updateField<K extends keyof VehicleFormValues>(
    key: K,
    value: VehicleFormValues[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const valid = isFormValid(form);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add vehicle' : 'Edit vehicle'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1">
            <label className="text-sm font-medium">Display name</label>
            <Input
              value={form.displayName}
              onChange={(e) => updateField('displayName', e.target.value)}
              placeholder="Sales Hilux"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1">
              <label className="text-sm font-medium">Make</label>
              <Input
                value={form.make}
                onChange={(e) => updateField('make', e.target.value)}
                placeholder="Toyota"
              />
            </div>
            <div className="grid gap-1">
              <label className="text-sm font-medium">Model</label>
              <Input
                value={form.model}
                onChange={(e) => updateField('model', e.target.value)}
                placeholder="Hilux 2.4 GD-6"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1">
              <label className="text-sm font-medium">Size class</label>
              <Select
                value={form.vehicleSizeClass}
                onValueChange={(v) => updateField('vehicleSizeClass', v)}
              >
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
              <Select
                value={form.fuelType}
                onValueChange={(v) => updateField('fuelType', v)}
              >
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
                value={form.ratedKmPerLitre}
                onChange={(e) => updateField('ratedKmPerLitre', e.target.value)}
                placeholder="9.5"
              />
            </div>
            <div className="grid gap-1">
              <label className="text-sm font-medium">Registration</label>
              <Input
                value={form.registrationPlate}
                onChange={(e) => updateField('registrationPlate', e.target.value)}
                placeholder="CA 123-456"
              />
            </div>
          </div>
          {mode === 'add' ? (
            <p className="text-muted-foreground text-xs">
              The new vehicle is assigned as primary if none is set, otherwise as
              secondary if that slot is free.
            </p>
          ) : null}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          {mode === 'edit' && onDelete ? (
            <Button
              type="button"
              variant="destructive"
              disabled={isPending || isDeletePending}
              onClick={onDelete}
            >
              {isDeletePending ? (
                <>
                  <Loader2Icon className="mr-1 size-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete vehicle'
              )}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2 sm:ml-auto">
            <Button
              type="button"
              variant="outline"
              disabled={isPending || isDeletePending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isPending || isDeletePending || !canSubmit || !valid}
              onClick={() => {
                void onSubmit(form);
              }}
            >
              {isPending ? (
                <>
                  <Loader2Icon className="mr-1 size-4 animate-spin" />
                  Saving…
                </>
              ) : mode === 'add' ? (
                'Save vehicle'
              ) : (
                'Save changes'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function buildCreateAssetPayload(
  values: VehicleFormValues,
  options: {
    userUid: number;
    clerkUserId: string;
    branchUid: number;
    serialNumber?: string;
  }
): CreateAssetPayload {
  const rated = Number(values.ratedKmPerLitre);
  const serial =
    options.serialNumber?.trim() ||
    values.registrationPlate.trim() ||
    `VEH-${options.userUid}-${Date.now().toString(36).toUpperCase()}`;

  return {
    category: 'VEHICLE',
    displayName: values.displayName.trim() || undefined,
    brand: values.make.trim(),
    modelNumber: values.model.trim(),
    serialNumber: serial,
    registrationPlate: values.registrationPlate.trim() || undefined,
    vehicleSizeClass: values.vehicleSizeClass as CreateAssetPayload['vehicleSizeClass'],
    fuelType: values.fuelType as CreateAssetPayload['fuelType'],
    ratedKmPerLitre: rated,
    purchaseDate: new Date().toISOString(),
    hasInsurance: false,
    owner: { uid: options.clerkUserId },
    branch: { uid: options.branchUid },
  };
}

export function buildUpdateAssetPayload(
  values: VehicleFormValues,
  existing: AssetRecord
): UpdateAssetPayload {
  const rated = Number(values.ratedKmPerLitre);
  const registration = values.registrationPlate.trim();

  return {
    displayName: values.displayName.trim() || undefined,
    brand: values.make.trim(),
    modelNumber: values.model.trim(),
    registrationPlate: registration || undefined,
    vehicleSizeClass: values.vehicleSizeClass as UpdateAssetPayload['vehicleSizeClass'],
    fuelType: values.fuelType as UpdateAssetPayload['fuelType'],
    ratedKmPerLitre: rated,
    ...(registration && registration !== existing.serialNumber
      ? { serialNumber: registration }
      : {}),
  };
}

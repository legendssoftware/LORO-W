'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchableUsersList } from '@/api/hooks/use-searchable-users-list';
import { useBranches } from '@/api/hooks/use-branches';
import type { UserListItem } from '@/api/endpoints/user';
import type {
  AssetRecord,
  CreateAssetPayload,
  FuelType,
  UpdateAssetPayload,
  VehicleSizeClass,
} from '@/api/types/asset';
import { getBranchDisplayLabel } from '@/api/types/branch';
import { SearchableUserPicker } from '@/components/filters/searchable-filter-comboboxes';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2Icon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { ASSET_CATEGORY_OPTIONS } from '../lib/asset-display';
import { ASSET_MODAL_CONTENT_CLASS } from './asset-dialog-shared';


const SIZE_OPTIONS: { value: VehicleSizeClass; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'sedan', label: 'Sedan' },
  { value: 'suv', label: 'SUV' },
  { value: 'bakkie', label: 'Bakkie' },
  { value: 'van', label: 'Van' },
  { value: 'other', label: 'Other' },
];

const assetFormSchema = z
  .object({
    category: z.enum(['IT_EQUIPMENT', 'VEHICLE', 'OFFICE', 'OTHER']),
    displayName: z.string(),
    brand: z.string().min(1, 'Brand is required'),
    serialNumber: z.string().min(1, 'Serial number is required'),
    modelNumber: z.string().min(1, 'Model is required'),
    modelYear: z.string(),
    vehicleSizeClass: z.string(),
    fuelType: z.string(),
    ratedKmPerLitre: z.string(),
    tankCapacityLitres: z.string(),
    registrationPlate: z.string(),
    purchaseDate: z.string().min(1, 'Purchase date is required'),
    hasInsurance: z.boolean(),
    insuranceProvider: z.string(),
    insuranceExpiryDate: z.string(),
    ownerUid: z.string(),
    branchUid: z.string(),
  })
  .superRefine((values, ctx) => {
    const insuranceRequired = values.category !== 'VEHICLE' || values.hasInsurance;
    if (values.category === 'VEHICLE') {
      const rated = Number(values.ratedKmPerLitre);
      if (!Number.isFinite(rated) || rated <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ratedKmPerLitre'],
          message: 'Rated km per litre is required for vehicles',
        });
      }
    }
    if (insuranceRequired && !values.insuranceProvider.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['insuranceProvider'],
        message: 'Insurance provider is required',
      });
    }
    if (insuranceRequired && !values.insuranceExpiryDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['insuranceExpiryDate'],
        message: 'Insurance expiry is required',
      });
    }
  });

type AssetFormValues = z.infer<typeof assetFormSchema>;

function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

function toDateInput(value?: string | null): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

function emptyValues(ownerUid: string, branchUid: string): AssetFormValues {
  return {
    category: 'OTHER',
    displayName: '',
    brand: '',
    serialNumber: '',
    modelNumber: '',
    modelYear: '',
    vehicleSizeClass: 'other',
    fuelType: 'petrol',
    ratedKmPerLitre: '',
    tankCapacityLitres: '',
    registrationPlate: '',
    purchaseDate: todayInput(),
    hasInsurance: true,
    insuranceProvider: '',
    insuranceExpiryDate: '',
    ownerUid,
    branchUid,
  };
}

function assetToValues(asset: AssetRecord): AssetFormValues {
  return {
    category: asset.category ?? 'OTHER',
    displayName: asset.displayName?.trim() ?? '',
    brand: asset.brand ?? '',
    serialNumber: asset.serialNumber ?? '',
    modelNumber: asset.modelNumber ?? '',
    modelYear: asset.modelYear != null ? String(asset.modelYear) : '',
    vehicleSizeClass: asset.vehicleSizeClass ?? 'other',
    fuelType: asset.fuelType ?? 'petrol',
    ratedKmPerLitre: asset.ratedKmPerLitre != null ? String(asset.ratedKmPerLitre) : '',
    tankCapacityLitres: asset.tankCapacityLitres != null ? String(asset.tankCapacityLitres) : '',
    registrationPlate: asset.registrationPlate?.trim() ?? '',
    purchaseDate: toDateInput(asset.purchaseDate) || todayInput(),
    hasInsurance: asset.hasInsurance ?? asset.category !== 'VEHICLE',
    insuranceProvider: asset.insuranceProvider?.trim() ?? '',
    insuranceExpiryDate: toDateInput(asset.insuranceExpiryDate),
    ownerUid: asset.owner?.uid != null ? String(asset.owner.uid) : '',
    branchUid: asset.branch?.uid != null ? String(asset.branch.uid) : '',
  };
}

function clerkIdForOwner(
  ownerUid: string,
  users: UserListItem[],
  fallback?: { uid?: number; clerkUserId?: string | null }
): string {
  const match = users.find((user) => String(user.uid) === ownerUid && user.clerkUserId);
  if (match?.clerkUserId) return match.clerkUserId;
  if (fallback?.uid != null && String(fallback.uid) === ownerUid && fallback.clerkUserId) {
    return fallback.clerkUserId;
  }
  return '';
}

function toPayload(
  values: AssetFormValues,
  assignment?: { ownerClerkUserId: string; branchUid: number }
): CreateAssetPayload {
  const modelYear = Number(values.modelYear);
  const tank = Number(values.tankCapacityLitres);
  const isVehicle = values.category === 'VEHICLE';
  const insuranceRequired = !isVehicle || values.hasInsurance;
  return {
    category: values.category,
    displayName: values.displayName.trim() || undefined,
    brand: values.brand.trim(),
    serialNumber: values.serialNumber.trim(),
    modelNumber: values.modelNumber.trim(),
    modelYear: Number.isFinite(modelYear) && modelYear >= 1900 ? modelYear : undefined,
    purchaseDate: new Date(values.purchaseDate).toISOString(),
    hasInsurance: values.hasInsurance,
    insuranceProvider: insuranceRequired ? values.insuranceProvider.trim() : undefined,
    insuranceExpiryDate: insuranceRequired
      ? new Date(values.insuranceExpiryDate).toISOString()
      : undefined,
    ...(isVehicle
      ? {
          vehicleSizeClass: values.vehicleSizeClass as VehicleSizeClass,
          fuelType: values.fuelType as FuelType,
          ratedKmPerLitre: Number(values.ratedKmPerLitre),
          tankCapacityLitres: Number.isFinite(tank) && tank >= 0 ? tank : undefined,
          registrationPlate: values.registrationPlate.trim() || undefined,
        }
      : {}),
    owner: { uid: assignment?.ownerClerkUserId ?? '' },
    branch: { uid: assignment?.branchUid ?? 0 },
  };
}

export function AssetFormDialog({
  open,
  mode,
  asset,
  canReassign,
  defaultOwnerUid,
  defaultOwnerClerkUserId,
  defaultBranchUid,
  isPending,
  onOpenChange,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  asset?: AssetRecord | null;
  canReassign: boolean;
  defaultOwnerUid: string;
  defaultOwnerClerkUserId: string;
  defaultBranchUid: string;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: CreateAssetPayload) => Promise<void>;
  onUpdate: (uid: number, payload: UpdateAssetPayload) => Promise<void>;
}) {
  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: emptyValues(defaultOwnerUid, defaultBranchUid),
  });
  const category = form.watch('category');
  const hasInsurance = form.watch('hasInsurance');
  const isVehicle = category === 'VEHICLE';
  const insuranceRequired = !isVehicle || hasInsurance;

  const {
    users,
    searchQuery,
    setSearchQuery,
    bindUidChange,
    isSearchLoading,
  } = useSearchableUsersList({ enabled: open && canReassign });
  const branchesQuery = useBranches({ enabled: open && canReassign });

  useEffect(() => {
    if (!open) return;
    form.reset(
      mode === 'edit' && asset
        ? assetToValues(asset)
        : emptyValues(defaultOwnerUid, defaultBranchUid)
    );
  }, [open, mode, asset, defaultOwnerUid, defaultBranchUid, form]);

  async function handleSubmit(values: AssetFormValues) {
    if (mode === 'create' || canReassign) {
      const ownerClerkUserId = clerkIdForOwner(values.ownerUid, users, {
        uid: asset?.owner?.uid ?? Number(defaultOwnerUid),
        clerkUserId: asset?.owner?.clerkUserId ?? asset?.ownerClerkUserId ?? defaultOwnerClerkUserId,
      });
      const branchUid = Number(values.branchUid);
      if (!ownerClerkUserId) {
        form.setError('ownerUid', { message: 'Choose an owner with a linked account' });
        return;
      }
      if (!Number.isFinite(branchUid) || branchUid <= 0) {
        form.setError('branchUid', { message: 'Choose a branch' });
        return;
      }
      const payload = toPayload(values, { ownerClerkUserId, branchUid });
      if (mode === 'create') {
        await onCreate(payload);
        return;
      }
      if (!asset) return;
      await onUpdate(asset.uid, payload);
      return;
    }
    if (!asset) return;
    const { owner: _owner, branch: _branch, ...editable } = toPayload(values);
    await onUpdate(asset.uid, editable);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(ASSET_MODAL_CONTENT_CLASS)}>
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle>{mode === 'create' ? 'Add asset' : 'Edit asset'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 py-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ASSET_CATEGORY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="modelNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isVehicle ? (
                <>
                  <FormField
                    control={form.control}
                    name="vehicleSizeClass"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Size</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SIZE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fuelType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fuel</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="petrol">Petrol</SelectItem>
                            <SelectItem value="diesel">Diesel</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ratedKmPerLitre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rated km/L</FormLabel>
                        <FormControl>
                          <Input inputMode="decimal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="registrationPlate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : null}
              <FormField
                control={form.control}
                name="hasInsurance"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 sm:col-span-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(event) => field.onChange(event.target.checked)}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Insured</FormLabel>
                  </FormItem>
                )}
              />
              {insuranceRequired ? (
                <>
                  <FormField
                    control={form.control}
                    name="insuranceProvider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Insurance provider</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="insuranceExpiryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Insurance expiry</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : null}
              {canReassign ? (
                <>
                  <FormField
                    control={form.control}
                    name="ownerUid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Owner</FormLabel>
                        <SearchableUserPicker
                          users={users}
                          branches={branchesQuery.data ?? []}
                          selectedUid={field.value || 'all'}
                          onUidChange={bindUidChange((uid) => field.onChange(uid === 'all' ? '' : uid))}
                          allOptionLabel="Select owner"
                          searchPlaceholder="Search people…"
                          emptyMessage="No person found."
                          triggerClassName="w-full bg-background border-border"
                          searchQuery={searchQuery}
                          onSearchQueryChange={setSearchQuery}
                          isSearchLoading={isSearchLoading}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="branchUid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch</FormLabel>
                        <Select value={field.value || undefined} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select branch" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(branchesQuery.data ?? []).map((branch) => (
                              <SelectItem key={branch.uid} value={String(branch.uid)}>
                                {getBranchDisplayLabel(branch) || `Branch ${branch.uid}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : null}
            </div>
            <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-violet-600 text-white hover:bg-violet-700"
              >
                {isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
                {mode === 'create' ? 'Add asset' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import type { LucideIcon } from 'lucide-react';
import { CircleDot, Fingerprint, Layers, Package, Ruler, Shield } from 'lucide-react';
import { IconField, IconInput, IconTextarea } from '@/components/icon-field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  PACKAGE_UNITS,
  PRODUCT_IDENTITY_FIELDS,
  PRODUCT_ORDER_FIELDS,
  PRODUCT_PACK_FIELDS,
  PRODUCT_PALLET_FIELDS,
  PRODUCT_PRICE_FIELDS,
  PRODUCT_SPEC_FIELDS,
  PRODUCT_STATUSES,
  PRODUCT_STOCK_FIELDS,
  WARRANTY_UNITS,
  type ProductField,
  type ProductFormValues,
} from '@/lib/product-admin-form';

function FieldControl({
  field,
  values,
  onChange,
}: {
  field: ProductField;
  values: ProductFormValues;
  onChange: (key: keyof ProductFormValues, value: string) => void;
}) {
  const value = String(values[field.key] ?? '');
  if (field.kind === 'textarea') {
    return (
      <IconField icon={field.icon} label={field.label} className="sm:col-span-2">
        <IconTextarea icon={field.icon} value={value} placeholder={field.placeholder} onChange={(event) => onChange(field.key, event.target.value)} />
      </IconField>
    );
  }
  return (
    <IconField icon={field.icon} label={field.label}>
      <IconInput
        icon={field.icon}
        type={field.kind === 'number' ? 'number' : field.kind === 'datetime' ? 'datetime-local' : 'text'}
        value={value}
        placeholder={field.placeholder}
        onChange={(event) => onChange(field.key, event.target.value)}
      />
    </IconField>
  );
}

function FieldGrid({
  title,
  icon: Icon,
  fields,
  values,
  onChange,
}: {
  title: string;
  icon: LucideIcon;
  fields: ProductField[];
  values: ProductFormValues;
  onChange: (key: keyof ProductFormValues, value: string) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="size-4 text-muted-foreground" aria-hidden />
        {title}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <FieldControl key={field.key} field={field} values={values} onChange={onChange} />
        ))}
      </div>
    </section>
  );
}

function IconSelect({
  icon: Icon,
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  placeholder: string;
  options: Array<{ value: string; label: string; icon: LucideIcon }>;
  onChange: (value: string) => void;
}) {
  return (
    <IconField icon={Icon} label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <option.icon className="size-4" aria-hidden />
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </IconField>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  checked,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
      <span className="flex items-center gap-2 text-sm">
        <Icon className="size-4 text-muted-foreground" aria-hidden />
        {label}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

export function ProductFormDialog({
  open,
  title,
  values,
  saving,
  canArchive,
  onChange,
  onToggle,
  onClose,
  onSave,
  onArchive,
  onRestore,
}: {
  open: boolean;
  title: string;
  values: ProductFormValues;
  saving: boolean;
  canArchive: boolean;
  onChange: (key: keyof ProductFormValues, value: string) => void;
  onToggle: (key: keyof ProductFormValues, value: boolean) => void;
  onClose: () => void;
  onSave: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="size-4" aria-hidden />
            {title}
          </DialogTitle>
        </DialogHeader>
        <FieldGrid title="Identity" icon={Package} fields={PRODUCT_IDENTITY_FIELDS} values={values} onChange={onChange} />
        <div className="grid gap-3 sm:grid-cols-2">
          <IconSelect icon={CircleDot} label="Status" value={values.status} placeholder="Choose a status" options={PRODUCT_STATUSES} onChange={(value) => onChange('status', value)} />
          {values.productRef ? (
            <IconField icon={Fingerprint} label="Product reference">
              <IconInput icon={Fingerprint} value={values.productRef} placeholder="Assigned when the product is saved" readOnly />
            </IconField>
          ) : null}
        </div>
        <FieldGrid title="Pricing" icon={Package} fields={PRODUCT_PRICE_FIELDS} values={values} onChange={onChange} />
        <ToggleRow icon={CircleDot} label="On promotion" checked={values.isOnPromotion} onChange={(checked) => onToggle('isOnPromotion', checked)} />
        <FieldGrid title="Stock" icon={Package} fields={PRODUCT_STOCK_FIELDS} values={values} onChange={onChange} />
        <ToggleRow icon={Package} label="Track stock" checked={values.trackStock} onChange={(checked) => onToggle('trackStock', checked)} />
        <FieldGrid title="Pack" icon={Layers} fields={PRODUCT_PACK_FIELDS} values={values} onChange={onChange} />
        <IconSelect icon={Package} label="Package unit" value={values.packageUnit} placeholder="Choose a unit" options={PACKAGE_UNITS} onChange={(value) => onChange('packageUnit', value)} />
        <FieldGrid title="Pallet" icon={Layers} fields={PRODUCT_PALLET_FIELDS} values={values} onChange={onChange} />
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow icon={Layers} label="Pallet available" checked={values.palletAvailable} onChange={(checked) => onToggle('palletAvailable', checked)} />
          <ToggleRow icon={CircleDot} label="Pallet on promotion" checked={values.palletOnPromotion} onChange={(checked) => onToggle('palletOnPromotion', checked)} />
        </div>
        <FieldGrid title="Specifications" icon={Ruler} fields={PRODUCT_SPEC_FIELDS} values={values} onChange={onChange} />
        <div className="grid gap-3 sm:grid-cols-2">
          <IconSelect icon={Shield} label="Warranty unit" value={values.warrantyUnit} placeholder="Choose a unit" options={WARRANTY_UNITS} onChange={(value) => onChange('warrantyUnit', value)} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow icon={Package} label="Fragile" checked={values.isFragile} onChange={(checked) => onToggle('isFragile', checked)} />
          <ToggleRow icon={Shield} label="Special handling" checked={values.requiresSpecialHandling} onChange={(checked) => onToggle('requiresSpecialHandling', checked)} />
        </div>
        <FieldGrid title="Order rules" icon={Package} fields={PRODUCT_ORDER_FIELDS} values={values} onChange={onChange} />
        <DialogFooter>
          {canArchive ? (
            <>
              <Button type="button" variant="outline" onClick={onArchive}>Archive</Button>
              <Button type="button" variant="outline" onClick={onRestore}>Restore</Button>
            </>
          ) : null}
          <Button type="button" disabled={saving || values.name.trim() === ''} onClick={onSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

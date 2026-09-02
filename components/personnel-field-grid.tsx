'use client';

import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DatePickerField } from '@/components/ui/date-picker-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PersonnelFieldSpec } from '@/lib/user-form/personnel-fields';

const EMPTY_SELECT_VALUE = '__empty__';

export function PersonnelFieldGrid<T extends FieldValues>({
  control,
  prefix,
  fields,
}: {
  control: Control<T>;
  prefix: 'profile' | 'employmentProfile';
  fields: PersonnelFieldSpec[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((spec) => {
        const name = `${prefix}.${spec.name}` as FieldPath<T>;
        return (
          <FormField
            key={name}
            control={control}
            name={name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{spec.label}</FormLabel>
                <PersonnelFieldControl spec={spec} field={field} />
                <FormMessage />
              </FormItem>
            )}
          />
        );
      })}
    </div>
  );
}

function PersonnelFieldControl({
  spec,
  field,
}: {
  spec: PersonnelFieldSpec;
  field: {
    value: unknown;
    onChange: (value: unknown) => void;
  };
}) {
  switch (spec.kind) {
    case 'date':
      return (
        <FormControl>
          <DatePickerField
            value={(field.value as string | null | undefined) ?? undefined}
            onChange={(value) => field.onChange(value || null)}
            aria-label={spec.label}
            preset={spec.datePreset ?? 'default'}
          />
        </FormControl>
      );
    case 'number':
      return (
        <FormControl>
          <Input
            type="number"
            min={0}
            step="1"
            placeholder={spec.placeholder}
            value={typeof field.value === 'number' ? field.value : ''}
            onChange={(event) => {
              const raw = event.target.value;
              field.onChange(raw === '' ? null : Number(raw));
            }}
          />
        </FormControl>
      );
    case 'select': {
      const current = typeof field.value === 'string' && field.value ? field.value : EMPTY_SELECT_VALUE;
      return (
        <Select
          onValueChange={(value) => field.onChange(value === EMPTY_SELECT_VALUE ? null : value)}
          value={current}
        >
          <FormControl>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={spec.placeholder ?? `Select ${spec.label.toLowerCase()}`} />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem value={EMPTY_SELECT_VALUE}>Not specified</SelectItem>
            {(spec.options ?? []).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    case 'tel':
    case 'text':
      return (
        <FormControl>
          <Input
            type={spec.kind === 'tel' ? 'tel' : 'text'}
            placeholder={spec.placeholder}
            value={(field.value as string | number | null | undefined) ?? ''}
            onChange={(event) => field.onChange(event.target.value || null)}
          />
        </FormControl>
      );
    default: {
      const _exhaustive: never = spec.kind;
      return _exhaustive;
    }
  }
}

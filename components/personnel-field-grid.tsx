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
import type { PersonnelFieldSpec } from '@/lib/user-form/personnel-fields';

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
                <FormControl>
                  {spec.kind === 'date' ? (
                    <DatePickerField
                      value={(field.value as string | null | undefined) ?? undefined}
                      onChange={(value) => field.onChange(value || null)}
                      aria-label={spec.label}
                    />
                  ) : spec.kind === 'number' ? (
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      placeholder={spec.placeholder}
                      value={field.value ?? ''}
                      onChange={(event) => {
                        const raw = event.target.value;
                        field.onChange(raw === '' ? null : Number(raw));
                      }}
                    />
                  ) : (
                    <Input
                      type={spec.kind === 'tel' ? 'tel' : 'text'}
                      placeholder={spec.placeholder}
                      value={(field.value as string | number | null | undefined) ?? ''}
                      onChange={(event) => field.onChange(event.target.value || null)}
                    />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      })}
    </div>
  );
}

'use client';

import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
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
import { FORM_PLACEHOLDERS, formPlaceholder, type FormPlaceholderKey } from '@/lib/form-placeholders';
import { savedFieldPlaceholder } from '@/lib/user-form/field-placeholder';

const EMPTY_SELECT_VALUE = '__empty__';

const FORM_PLACEHOLDER_BY_VALUE = new Map<string, FormPlaceholderKey>(
  (Object.entries(FORM_PLACEHOLDERS) as [FormPlaceholderKey, string][]).map(
    ([key, value]) => [value, key],
  ),
);

function resolvePersonnelPlaceholder(
  t: TFunction,
  raw: string | undefined,
): string {
  if (!raw) return '';
  const key = FORM_PLACEHOLDER_BY_VALUE.get(raw);
  if (key) return formPlaceholder(t, key);
  return raw;
}

export function PersonnelFieldGrid<T extends FieldValues>({
  control,
  prefix,
  fields,
}: {
  control: Control<T>;
  prefix: 'profile' | 'employmentProfile';
  fields: PersonnelFieldSpec[];
}) {
  const { t } = useTranslation('common');

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((spec) => {
        const name = `${prefix}.${spec.name}` as FieldPath<T>;
        const label = t(`personnel.labels.${spec.name}`, { defaultValue: spec.label });
        return (
          <FormField
            key={name}
            control={control}
            name={name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{label}</FormLabel>
                <PersonnelFieldControl spec={spec} field={field} label={label} />
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
  label,
}: {
  spec: PersonnelFieldSpec;
  field: {
    value: unknown;
    onChange: (value: unknown) => void;
  };
  label: string;
}) {
  const { t } = useTranslation('common');
  const translatedPlaceholder = resolvePersonnelPlaceholder(t, spec.placeholder);
  const placeholder = savedFieldPlaceholder(field.value, translatedPlaceholder);
  switch (spec.kind) {
    case 'date':
      return (
        <FormControl>
          <DatePickerField
            value={(field.value as string | null | undefined) ?? undefined}
            onChange={(value) => field.onChange(value || null)}
            aria-label={label}
            placeholder={placeholder || t('personnel.datePlaceholder')}
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
            placeholder={placeholder || translatedPlaceholder}
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
              <SelectValue
                placeholder={
                  placeholder ||
                  translatedPlaceholder ||
                  t('personnel.selectLabel', { label: label.toLowerCase() })
                }
              />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem value={EMPTY_SELECT_VALUE}>{t('personnel.notSpecified')}</SelectItem>
            {(spec.options ?? []).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(`personnel.options.${option.value}`, { defaultValue: option.label })}
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
            placeholder={placeholder || translatedPlaceholder}
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

'use client';

import type { Control } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePickerField } from '@/components/ui/date-picker-field';
import {
  CURRENCY_OPTIONS,
  TARGET_PERIOD_OPTIONS,
  type AddUserWizardValues,
} from '@/lib/user-form';

const MODAL_SELECT_TRIGGER =
  'h-9 w-full border-border bg-background text-foreground';

function numField(
  field: { value: number | null | undefined; onChange: (v: number | null) => void }
) {
  return (
    <Input
      type="number"
      step="any"
      placeholder="0"
      value={field.value ?? ''}
      onChange={(e) => {
        const v = e.target.value;
        field.onChange(v === '' ? null : Number(v));
      }}
    />
  );
}

export function StepTargets({
  control,
}: {
  control: Control<AddUserWizardValues>;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Optional performance targets and cost breakdown. Leave blank to skip.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <FormField
          control={control}
          name="targetSalesAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target sales</FormLabel>
              <FormControl>{numField(field)}</FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="targetQuotationsAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target quotations</FormLabel>
              <FormControl>{numField(field)}</FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="targetCurrency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <Select
                onValueChange={(v) =>
                  field.onChange(v === '__none__' ? null : v)
                }
                value={
                  field.value != null && field.value !== ''
                    ? field.value
                    : '__none__'
                }
              >
                <FormControl>
                  <SelectTrigger className={MODAL_SELECT_TRIGGER}>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__none__">Select currency</SelectItem>
                  {CURRENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="targetHoursWorked"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target hours</FormLabel>
              <FormControl>{numField(field)}</FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="targetNewClients"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target new clients</FormLabel>
              <FormControl>{numField(field)}</FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="targetNewLeads"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target new leads</FormLabel>
              <FormControl>{numField(field)}</FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="targetCheckIns"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target check-ins</FormLabel>
              <FormControl>{numField(field)}</FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="targetCalls"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target calls</FormLabel>
              <FormControl>{numField(field)}</FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <FormField
          control={control}
          name="targetPeriod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target period</FormLabel>
              <Select
                onValueChange={(v) =>
                  field.onChange(v === '__none__' ? null : v)
                }
                value={
                  field.value != null && field.value !== ''
                    ? field.value
                    : '__none__'
                }
              >
                <FormControl>
                  <SelectTrigger className={MODAL_SELECT_TRIGGER}>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__none__">Select period</SelectItem>
                  {TARGET_PERIOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="periodStartDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Period start</FormLabel>
              <FormControl>
                <DatePickerField
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="periodEndDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Period end</FormLabel>
              <FormControl>
                <DatePickerField
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="recurringInterval"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recurring interval</FormLabel>
              <Select
                onValueChange={(v) => field.onChange(v === '' ? null : v)}
                value={field.value ?? ''}
              >
                <FormControl>
                  <SelectTrigger className={MODAL_SELECT_TRIGGER}>
                    <SelectValue placeholder="Interval" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="isRecurring"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-2 space-y-0 pt-6">
              <FormControl>
                <Checkbox
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="font-normal">Recurring</FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="carryForwardUnfulfilled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-2 space-y-0 pt-6">
              <FormControl>
                <Checkbox
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="font-normal">
                Carry forward unfulfilled
              </FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="border-t pt-4">
        <p className="text-sm font-medium text-muted-foreground mb-3">
          Cost breakdown (optional)
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ['baseSalary', 'Base salary'],
              ['carInstalment', 'Car instalment'],
              ['carInsurance', 'Car insurance'],
              ['fuel', 'Fuel'],
              ['cellPhoneAllowance', 'Cell phone allowance'],
              ['carMaintenance', 'Car maintenance'],
              ['cgicCosts', 'CGIC costs'],
              ['totalCost', 'Total cost'],
            ] as const
          ).map(([name, label]) => (
            <FormField
              key={name}
              control={control}
              name={name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>{numField(field)}</FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <FormField
            control={control}
            name="erpSalesRepCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ERP sales rep code</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    placeholder="e.g. REP001"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}

'use client';

import type { Control } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { Checkbox } from '@/components/ui/checkbox';
import { JOB_INFORMATION_FIELDS } from '@/lib/user-form/personnel-fields';
import type { UserFormValues } from '@/lib/user-form';
import { PersonnelFieldGrid } from '@/components/personnel-field-grid';

export function JobInformationCard({ control }: { control: Control<UserFormValues> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm sm:text-base">Job information</CardTitle>
        <p className="text-xs sm:text-sm text-muted-foreground">
          HR-assigned role, reporting line, leave entitlement, and wage schedule. Salary amount stays on Targets.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <FormField
            control={control}
            name="employmentProfile.branchref"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Branch ref</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} placeholder="e.g. BR001" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="employmentProfile.position"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Position</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} placeholder="e.g. Sales Representative" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="employmentProfile.department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} placeholder="e.g. Sales" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="employmentProfile.startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start date</FormLabel>
                <FormControl>
                  <DatePickerField value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="employmentProfile.endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End date</FormLabel>
                <FormControl>
                  <DatePickerField value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="employmentProfile.isCurrentlyEmployed"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal">Currently employed</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="employmentProfile.email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Work email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} placeholder="work@company.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="employmentProfile.contactNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact number</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} placeholder="+27 64 123 4567" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <PersonnelFieldGrid control={control} prefix="employmentProfile" fields={JOB_INFORMATION_FIELDS} />
      </CardContent>
    </Card>
  );
}

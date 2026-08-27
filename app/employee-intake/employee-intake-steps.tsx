'use client';

import type { UseFormReturn } from 'react-hook-form';
import type { EmployeeIntakeFormValues, IntakeDocumentValues } from '@/lib/user-form/employee-intake-schema';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDownIcon, XIcon } from '@/lib/icons';
import {
  PERSONNEL_ADDRESS_OPTIONAL_FIELDS,
  PERSONNEL_BANKING_FIELDS,
  PERSONNEL_DEPENDANT_FIELDS,
  PERSONNEL_EDUCATION_FIELDS,
  PERSONNEL_EMERGENCY_FIELDS,
  PERSONNEL_HEALTH_FIELDS,
  PERSONNEL_IDENTITY_FIELDS,
  PERSONNEL_INSURANCE_FIELDS,
  PERSONNEL_SIZE_FIELDS,
  PERSONNEL_TAX_FIELDS,
} from '@/lib/user-form/personnel-fields';
import { PersonnelFieldGrid } from '@/components/personnel-field-grid';

function filledValue(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

export function EmployeeIntakeSteps({
  step,
  form,
  values,
  documents,
  uploadingCount,
  onDocumentSelect,
  onRemoveDocument,
}: {
  step: number;
  form: UseFormReturn<EmployeeIntakeFormValues>;
  values: EmployeeIntakeFormValues;
  documents: IntakeDocumentValues[];
  uploadingCount: number;
  onDocumentSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveDocument: (index: number) => void;
}) {
  const reviewRows: { label: string; value: string | null }[] = [
    { label: 'Name', value: `${values.name} ${values.surname}`.trim() },
    { label: 'Email', value: values.email },
    { label: 'Phone', value: values.phone },
    { label: 'Gender', value: values.profile.gender },
    { label: 'Date of birth', value: values.profile.dateOfBirth },
    { label: 'ID No', value: filledValue(values.profile.nationalId) },
    { label: 'Address', value: [values.profile.complex, values.profile.address, values.profile.suburb, values.profile.city, values.profile.province, values.profile.zipCode, values.profile.country].filter(Boolean).join(', ') },
    { label: 'Next of kin', value: filledValue(values.profile.nextOfKinName) },
    { label: 'Bank', value: filledValue(values.profile.bankName) },
    { label: 'Work contact', value: values.employmentProfile.contactNumber },
    { label: 'Position', value: filledValue(values.employmentProfile.position) },
  ];

  if (step === 1) {
    return (
      <div className="space-y-4 rounded-lg border bg-card p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">Personal details for your HR profile.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="profile.gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gender *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="profile.dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of birth *</FormLabel>
                <FormControl>
                  <DatePickerField
                    value={field.value}
                    onChange={field.onChange}
                    aria-label="Date of birth"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <PersonnelFieldGrid control={form.control} prefix="profile" fields={PERSONNEL_IDENTITY_FIELDS} />
        <PersonnelFieldGrid control={form.control} prefix="profile" fields={PERSONNEL_SIZE_FIELDS} />
        <PersonnelFieldGrid control={form.control} prefix="profile" fields={PERSONNEL_EDUCATION_FIELDS} />
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="space-y-4 rounded-lg border bg-card p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">Home address and transport.</p>
        <FormField
          control={form.control}
          name="profile.address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Street address *</FormLabel>
              <FormControl>
                <Input {...field} autoComplete="street-address" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="profile.city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City *</FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="address-level2" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="profile.country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country *</FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="country-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <PersonnelFieldGrid control={form.control} prefix="profile" fields={PERSONNEL_ADDRESS_OPTIONAL_FIELDS} />
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="space-y-4 rounded-lg border bg-card p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">Medical status, medical aid, and vaccination (optional).</p>
        <PersonnelFieldGrid control={form.control} prefix="profile" fields={PERSONNEL_HEALTH_FIELDS} />
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="space-y-6 rounded-lg border bg-card p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">
          Emergency contacts, dependants, banking, tax, and insurance (optional).
        </p>
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Emergency contacts</h2>
          <PersonnelFieldGrid control={form.control} prefix="profile" fields={PERSONNEL_EMERGENCY_FIELDS} />
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Dependants</h2>
          <PersonnelFieldGrid control={form.control} prefix="profile" fields={PERSONNEL_DEPENDANT_FIELDS} />
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Banking</h2>
          <PersonnelFieldGrid control={form.control} prefix="profile" fields={PERSONNEL_BANKING_FIELDS} />
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Tax</h2>
          <PersonnelFieldGrid control={form.control} prefix="profile" fields={PERSONNEL_TAX_FIELDS} />
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Insurance</h2>
          <PersonnelFieldGrid control={form.control} prefix="profile" fields={PERSONNEL_INSURANCE_FIELDS} />
        </section>
      </div>
    );
  }

  if (step === 5) {
    return (
      <div className="space-y-4 rounded-lg border bg-card p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">Employment and contact details.</p>
        <FormField
          control={form.control}
          name="employmentProfile.contactNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Work contact number *</FormLabel>
              <FormControl>
                <Input {...field} type="tel" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-3 rounded-md border p-4">
          <div>
            <p className="text-sm font-medium" id="intake-docs-label">
              HR documents (optional)
            </p>
            <p className="mt-1 text-xs text-muted-foreground" id="intake-docs-hint">
              Upload ID, contract, bank proof, or other HR files (PDF, images, or
              documents — max 5MB each).
            </p>
          </div>
          <Input
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            onChange={onDocumentSelect}
            disabled={uploadingCount > 0}
            aria-labelledby="intake-docs-label"
            aria-describedby="intake-docs-hint"
          />
          {uploadingCount > 0 && (
            <p className="text-xs text-muted-foreground" aria-live="polite">
              Uploading…
            </p>
          )}
          {documents.length > 0 && (
            <ul className="space-y-2">
              {documents.map((doc, index) => (
                <li
                  key={`${doc.url}-${index}`}
                  className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
                >
                  <span className="truncate">{doc.title}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={() => onRemoveDocument(index)}
                    aria-label={`Remove ${doc.title}`}
                  >
                    <XIcon className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm font-medium">
            Additional employment details (optional)
            <ChevronDownIcon className="size-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 grid gap-3 sm:grid-cols-2">
            {(
              [
                ['employmentProfile.position', 'Position'],
                ['employmentProfile.department', 'Department'],
                ['employmentProfile.branchref', 'Branch ref'],
                ['employmentProfile.email', 'Work email'],
              ] as const
            ).map(([name, label]) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={(field.value as string | null) ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <FormField
              control={form.control}
              name="employmentProfile.startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start date</FormLabel>
                  <FormControl>
                    <DatePickerField
                      value={field.value ?? undefined}
                      onChange={(v) => field.onChange(v || null)}
                      aria-label="Employment start date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="employmentProfile.endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End date</FormLabel>
                  <FormControl>
                    <DatePickerField
                      value={field.value ?? undefined}
                      onChange={(v) => field.onChange(v || null)}
                      aria-label="Employment end date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }

  if (step === 6) {
    return (
      <div className="space-y-3 rounded-lg border bg-card p-4 sm:p-6 text-sm">
        <p className="font-medium">Review your information</p>
        <dl className="grid gap-2 sm:grid-cols-2">
          {reviewRows
            .filter((row) => row.value)
            .map((row) => (
              <div key={row.label} className={row.label === 'Address' ? 'sm:col-span-2' : undefined}>
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className={row.label === 'Gender' ? 'capitalize' : undefined}>{row.value}</dd>
              </div>
            ))}
          <FormField
            control={form.control}
            name="consentToProcess"
            render={({ field }) => (
              <FormItem className="sm:col-span-2 flex flex-row items-start gap-3 space-y-0 rounded-md border p-3">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    I confirm this information is accurate and agree it may be processed
                    for HR and employment records.
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
          {documents.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">HR documents</dt>
              <dd>
                <ul className="mt-1 list-inside list-disc">
                  {documents.map((doc) => (
                    <li key={doc.url}>{doc.title}</li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
        </dl>
      </div>
    );
  }

  return null;
}

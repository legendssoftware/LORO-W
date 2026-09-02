'use client';

import type { UseFormReturn } from 'react-hook-form';
import type { EmployeeIntakeFormValues, IntakeDocumentValues } from '@/lib/user-form/employee-intake-schema';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { FORM_PLACEHOLDERS } from '@/lib/form-placeholders';
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
  COUNTRY_OPTIONS,
  GENDER_OPTIONS,
  PERSONNEL_ADDRESS_OPTIONAL_FIELDS,
  PERSONNEL_BANKING_FIELDS,
  PERSONNEL_DEPENDANT_FIELDS,
  PERSONNEL_DETAILS_GROUPS,
  PERSONNEL_EDUCATION_FIELDS,
  PERSONNEL_EMERGENCY_FIELDS,
  PERSONNEL_HEALTH_FIELDS,
  PERSONNEL_IDENTITY_FIELDS,
  PERSONNEL_INSURANCE_FIELDS,
  PERSONNEL_SIZE_FIELDS,
  PERSONNEL_TAX_FIELDS,
  type PersonnelFieldSpec,
} from '@/lib/user-form/personnel-fields';
import { PersonnelFieldGrid } from '@/components/personnel-field-grid';
import { ageFromIsoDate, formatIsoToDisplay } from '@/lib/user-form/date-input';

type ReviewRow = { label: string; value: string };

function formatReviewValue(spec: Pick<PersonnelFieldSpec, 'name' | 'kind' | 'options'>, value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  const text = String(value).trim();
  if (!text) return null;
  if (spec.kind === 'date') return formatIsoToDisplay(text) || text;
  const optionLabel = spec.options?.find((option) => option.value === text)?.label;
  return optionLabel ?? text;
}

function collectReviewSections(values: EmployeeIntakeFormValues): { title: string; rows: ReviewRow[] }[] {
  const accountRows: ReviewRow[] = [
    { label: 'Name', value: `${values.name} ${values.surname}`.trim() },
    { label: 'Email', value: values.email },
    { label: 'Phone', value: values.phone },
  ].filter((row) => row.value);

  const sections: { title: string; rows: ReviewRow[] }[] = [];
  if (accountRows.length) sections.push({ title: 'Account', rows: accountRows });

  for (const group of PERSONNEL_DETAILS_GROUPS) {
    const rows: ReviewRow[] = [];
    for (const field of group.fields) {
      const formatted = formatReviewValue(field, values.profile[field.name as keyof typeof values.profile]);
      if (!formatted) continue;
      rows.push({ label: field.label, value: formatted });
    }
    if (group.title === 'Identity') {
      const age = values.profile.currentAge ?? ageFromIsoDate(values.profile.dateOfBirth);
      if (age != null) {
        const dobIndex = rows.findIndex((row) => row.label === 'Date of birth');
        rows.splice(dobIndex === -1 ? rows.length : dobIndex + 1, 0, {
          label: 'Age',
          value: String(age),
        });
      }
    }
    if (rows.length) sections.push({ title: group.title, rows });
  }

  const employmentSpecs: PersonnelFieldSpec[] = [
    { name: 'contactNumber', label: 'Work contact', kind: 'tel' },
    { name: 'position', label: 'Position', kind: 'text' },
    { name: 'department', label: 'Department', kind: 'text' },
    { name: 'email', label: 'Work email', kind: 'text' },
    { name: 'startDate', label: 'Start date', kind: 'date' },
    { name: 'endDate', label: 'End date', kind: 'date' },
  ];
  const employmentRows: ReviewRow[] = [];
  for (const spec of employmentSpecs) {
    const formatted = formatReviewValue(
      spec,
      values.employmentProfile[spec.name as keyof typeof values.employmentProfile],
    );
    if (!formatted) continue;
    employmentRows.push({ label: spec.label, value: formatted });
  }
  if (employmentRows.length) sections.push({ title: 'Employment', rows: employmentRows });

  return sections;
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
  const reviewSections = collectReviewSections(values);

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
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {GENDER_OPTIONS.map((option) => (
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
            name="profile.dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of birth *</FormLabel>
                <FormControl>
                  <DatePickerField
                    value={field.value}
                    onChange={(iso) => {
                      field.onChange(iso);
                      form.setValue(
                        'profile.currentAge',
                        iso ? ageFromIsoDate(iso) : null,
                        { shouldDirty: true },
                      );
                    }}
                    aria-label="Date of birth"
                    preset="birthdate"
                  />
                </FormControl>
                <FormDescription>Type DD/MM/YYYY or open the calendar to pick a year.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="profile.country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || undefined}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {COUNTRY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Used to validate your ID and phone number format.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
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
                <Input {...field} autoComplete="street-address" placeholder={FORM_PLACEHOLDERS.street} />
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
                  <Input {...field} autoComplete="address-level2" placeholder={FORM_PLACEHOLDERS.city} />
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
                <Input {...field} type="tel" placeholder={FORM_PLACEHOLDERS.phone} />
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
                ['employmentProfile.position', 'Position', FORM_PLACEHOLDERS.position],
                ['employmentProfile.department', 'Department', FORM_PLACEHOLDERS.department],
                ['employmentProfile.email', 'Work email', FORM_PLACEHOLDERS.workEmail],
              ] as const
            ).map(([name, label, placeholder]) => (
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
                        placeholder={placeholder}
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
      <div className="space-y-4 rounded-lg border bg-card p-4 sm:p-6 text-sm">
        <p className="font-medium">Review your information</p>
        {reviewSections.map((section) => (
          <section key={section.title} className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {section.title}
            </h2>
            <dl className="grid gap-2 sm:grid-cols-2">
              {section.rows.map((row) => (
                <div key={`${section.title}-${row.label}`}>
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        <FormField
          control={form.control}
          name="consentToProcess"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3 space-y-0 rounded-md border p-3">
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
          <div>
            <p className="text-muted-foreground">HR documents</p>
            <ul className="mt-1 list-inside list-disc">
              {documents.map((doc) => (
                <li key={doc.url}>{doc.title}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return null;
}

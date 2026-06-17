'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  completeIntake,
  getIntakeByToken,
  uploadIntakeDocument,
  type EmployeeIntakeMetadata,
} from '@/api/endpoints/employee-intake';
import {
  buildCompleteIntakeBody,
  EMPLOYEE_INTAKE_STEP_FIELDS,
  EMPLOYEE_INTAKE_STEP_LABELS,
  employeeIntakeSchema,
  getDefaultEmployeeIntakeValues,
  type EmployeeIntakeFormValues,
} from '@/lib/user-form/employee-intake-schema';
import { Button } from '@/components/ui/button';
import {
  Form,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDownIcon, XIcon } from '@/lib/icons';
import { LoadingSpinner } from '@/components/loading-spinner';
import toast from 'react-hot-toast';

const TOTAL_STEPS = EMPLOYEE_INTAKE_STEP_LABELS.length;

export function EmployeeIntakeForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';

  const [metadata, setMetadata] = useState<EmployeeIntakeMetadata | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [completed, setCompleted] = useState<{ signInUrl: string; email: string } | null>(null);

  const form = useForm<EmployeeIntakeFormValues>({
    resolver: zodResolver(employeeIntakeSchema),
    defaultValues: getDefaultEmployeeIntakeValues(),
    mode: 'onChange',
  });

  const emailLocked = Boolean(metadata?.prefillEmail);

  useEffect(() => {
    if (!token) {
      setLoadError('Missing intake link token. Please use the link from your invitation email.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await getIntakeByToken(token);
        if (cancelled) return;
        setMetadata(data);
        form.reset(getDefaultEmployeeIntakeValues(data.prefillEmail));
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Invalid intake link');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, form]);

  const validateStep = useCallback(async () => {
    const fields = EMPLOYEE_INTAKE_STEP_FIELDS[step];
    if (!fields?.length) return true;
    return form.trigger(fields);
  }, [form, step]);

  async function handleNext() {
    const valid = await validateStep();
    if (!valid) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleDocumentSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files?.length || !token) return;
    event.target.value = '';

    for (const file of Array.from(files)) {
      setUploadingCount((count) => count + 1);
      try {
        const result = await uploadIntakeDocument(token, file);
        const current = form.getValues('documents') ?? [];
        form.setValue('documents', [
          ...current,
          {
            url: result.publicUrl,
            title: file.name,
            mimeType: result.mimeType,
            fileSize: result.fileSize,
          },
        ]);
        toast.success(`Uploaded ${file.name}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `Failed to upload ${file.name}`);
      } finally {
        setUploadingCount((count) => count - 1);
      }
    }
  }

  function removeDocument(index: number) {
    const current = form.getValues('documents') ?? [];
    form.setValue(
      'documents',
      current.filter((_, i) => i !== index),
    );
  }

  async function handleSubmit(values: EmployeeIntakeFormValues) {
    if (!token) return;
    setSubmitting(true);
    try {
      const body = buildCompleteIntakeBody(values);
      const result = await completeIntake(token, body);
      setCompleted({ signInUrl: result.signInUrl, email: result.user.email });
      toast.success('Profile submitted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit profile');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-foreground">Unable to open form</h1>
        <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
        <Button asChild className="mt-6" variant="outline">
          <Link href="/sign-in">Go to sign in</Link>
        </Button>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-foreground">You&apos;re all set</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your profile for <strong>{completed.email}</strong> has been saved. Sign in with the
          password you created.
        </p>
        <Button asChild className="mt-6">
          <Link href={completed.signInUrl}>Sign in</Link>
        </Button>
      </div>
    );
  }

  const values = form.watch();
  const documents = values.documents ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Employee profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {metadata?.organisationName} · {metadata?.branchName}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Link expires {metadata ? new Date(metadata.expiresAt).toLocaleDateString() : ''}
        </p>
      </div>

      <div className="mb-6 flex justify-center gap-2">
        {EMPLOYEE_INTAKE_STEP_LABELS.map((label, i) => (
          <div
            key={label}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              i === step
                ? 'bg-primary text-primary-foreground'
                : i < step
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {step === 0 && (
            <div className="space-y-4 rounded-lg border bg-card p-4 sm:p-6">
              <p className="text-sm text-muted-foreground">
                Create your account credentials. These will be used to sign in after submission.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="given-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="surname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Surname</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="family-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        readOnly={emailLocked}
                        className={emailLocked ? 'bg-muted' : undefined}
                        autoComplete="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" autoComplete="tel" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" autoComplete="new-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm password</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" autoComplete="new-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 rounded-lg border bg-card p-4 sm:p-6">
              <p className="text-sm text-muted-foreground">Personal details for your HR profile.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="profile.gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                      <FormLabel>Date of birth</FormLabel>
                      <FormControl>
                        <DatePickerField value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="profile.address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
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
                      <FormLabel>City</FormLabel>
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
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="country-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Collapsible>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm font-medium">
                  Additional personal details (optional)
                  <ChevronDownIcon className="size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ['profile.height', 'Height'],
                      ['profile.weight', 'Weight'],
                      ['profile.hairColor', 'Hair color'],
                      ['profile.eyeColor', 'Eye color'],
                      ['profile.ethnicity', 'Ethnicity'],
                      ['profile.bodyType', 'Body type'],
                      ['profile.zipCode', 'ZIP / postal code'],
                      ['profile.maritalStatus', 'Marital status'],
                      ['profile.shoeSize', 'Shoe size'],
                      ['profile.shirtSize', 'Shirt size'],
                      ['profile.pantsSize', 'Pants size'],
                      ['profile.dressSize', 'Dress size'],
                      ['profile.coatSize', 'Coat size'],
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
                    name="profile.aboutMe"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>About me</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 rounded-lg border bg-card p-4 sm:p-6">
              <p className="text-sm text-muted-foreground">Employment and contact details.</p>
              <FormField
                control={form.control}
                name="employmentProfile.contactNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work contact number</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3 rounded-md border p-4">
                <div>
                  <p className="text-sm font-medium">HR documents (optional)</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Upload ID, contract, bank proof, or other HR files (PDF, images, or
                    documents — max 5MB each).
                  </p>
                </div>
                <Input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={handleDocumentSelect}
                  disabled={uploadingCount > 0}
                />
                {uploadingCount > 0 && (
                  <p className="text-xs text-muted-foreground">Uploading…</p>
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
                          onClick={() => removeDocument(index)}
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
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 rounded-lg border bg-card p-4 sm:p-6 text-sm">
              <p className="font-medium">Review your information</p>
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Name</dt>
                  <dd>
                    {values.name} {values.surname}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd>{values.email}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd>{values.phone}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Date of birth</dt>
                  <dd>{values.profile.dateOfBirth}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Address</dt>
                  <dd>
                    {values.profile.address}, {values.profile.city}, {values.profile.country}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Work contact</dt>
                  <dd>{values.employmentProfile.contactNumber}</dd>
                </div>
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
          )}

          <div className="flex justify-between gap-3">
            <Button type="button" variant="outline" onClick={handleBack} disabled={step === 0}>
              Back
            </Button>
            {step < TOTAL_STEPS - 1 ? (
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit profile'}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}

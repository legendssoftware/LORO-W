'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  INTAKE_MAX_FILE_BYTES,
  type EmployeeIntakeFormValues,
} from '@/lib/user-form/employee-intake-schema';
import {
  clearEmployeeIntakeDraft,
  readEmployeeIntakeDraft,
  writeEmployeeIntakeDraft,
} from '@/lib/user-form/employee-intake-draft';
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
import { EmployeeIntakeSteps } from './employee-intake-steps';
import { LoadingSpinner } from '@/components/loading-spinner';
import toast from 'react-hot-toast';

const TOTAL_STEPS = EMPLOYEE_INTAKE_STEP_LABELS.length;
const DRAFT_SAVE_DEBOUNCE_MS = 400;

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
  const draftReadyRef = useRef(false);
  const stepRef = useRef(0);

  const form = useForm<EmployeeIntakeFormValues>({
    resolver: zodResolver(employeeIntakeSchema),
    defaultValues: getDefaultEmployeeIntakeValues(),
    mode: 'onChange',
  });

  const emailLocked = Boolean(metadata?.prefillEmail);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    if (!token) {
      setLoadError('Missing intake link token. Please use the link from your invitation email.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    draftReadyRef.current = false;
    (async () => {
      try {
        const data = await getIntakeByToken(token);
        if (cancelled) return;
        setMetadata(data);
        const defaults = getDefaultEmployeeIntakeValues(data.prefillEmail);
        const draft = readEmployeeIntakeDraft(token);
        if (draft) {
          form.reset({
            ...defaults,
            ...draft.values,
            email: data.prefillEmail ?? draft.values.email,
            password: '',
            confirmPassword: '',
            profile: { ...defaults.profile, ...draft.values.profile },
            employmentProfile: {
              ...defaults.employmentProfile,
              ...draft.values.employmentProfile,
            },
          });
          setStep(Math.min(draft.step, TOTAL_STEPS - 1));
        } else {
          form.reset(defaults);
        }
        draftReadyRef.current = true;
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

  useEffect(() => {
    if (!token || loading) return;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    function persist(values: EmployeeIntakeFormValues) {
      if (!draftReadyRef.current) return;
      writeEmployeeIntakeDraft(token, values, stepRef.current);
    }

    persist(form.getValues());
    const subscription = form.watch(() => {
      window.clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        persist(form.getValues());
      }, DRAFT_SAVE_DEBOUNCE_MS);
    });

    return () => {
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [token, loading, form]);

  useEffect(() => {
    if (!token || loading || !draftReadyRef.current) return;
    writeEmployeeIntakeDraft(token, form.getValues(), step);
  }, [step, token, loading, form]);

  const validateStep = useCallback(async () => {
    const fields = EMPLOYEE_INTAKE_STEP_FIELDS[step];
    if (!fields?.length) return true;
    return form.trigger(fields as Parameters<typeof form.trigger>[0]);
  }, [form, step]);

  async function handleNext() {
    const valid = await validateStep();
    if (!valid) {
      const firstInvalid = document.querySelector<HTMLElement>('[aria-invalid="true"]');
      firstInvalid?.focus();
      return;
    }
    if (step === 0) {
      const phone = form.getValues('phone');
      const work = form.getValues('employmentProfile.contactNumber');
      if (!work?.trim() && phone?.trim()) {
        form.setValue('employmentProfile.contactNumber', phone.trim());
      }
    }
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
      if (file.size > INTAKE_MAX_FILE_BYTES) {
        toast.error(`${file.name} is larger than 5MB`);
        continue;
      }
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
      clearEmployeeIntakeDraft(token);
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
      <div className="flex min-h-[50vh] items-center justify-center" aria-busy="true" aria-live="polite">
        <LoadingSpinner />
        <span className="sr-only">Loading intake form</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center" role="status">
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
      <div className="mx-auto max-w-lg px-4 py-16 text-center" role="status">
        <h1 className="text-xl font-semibold text-foreground">Profile submitted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We saved the profile for <strong>{completed.email}</strong>. A manager will review it
          on the phone. You will get an email when you can sign in — please wait for that
          approval.
        </p>
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

      <nav className="mb-6" aria-label="Intake steps">
        <ol className="flex justify-center gap-2">
          {EMPLOYEE_INTAKE_STEP_LABELS.map((label, i) => {
            const isCurrent = i === step;
            const isComplete = i < step;
            return (
              <li key={label}>
                <button
                  type="button"
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`${label} step${isCurrent ? ', current' : ''}`}
                  disabled={!isComplete && !isCurrent}
                  onClick={() => {
                    if (isComplete) setStep(i);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground'
                      : isComplete
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <Form {...form}>
        <form
          onSubmit={(event) => {
            if (step < TOTAL_STEPS - 1) {
              event.preventDefault();
              void handleNext();
              return;
            }
            void form.handleSubmit(handleSubmit)(event);
          }}
          className="space-y-6"
        >
          {step === 0 && (
            <div className="space-y-4 rounded-lg border bg-card p-4 sm:p-6">
              <p className="text-sm text-muted-foreground">
                Create your account credentials. You will get an email when a manager approves
                access — you cannot sign in until then.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name *</FormLabel>
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
                      <FormLabel>Surname *</FormLabel>
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
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        readOnly={emailLocked}
                        aria-describedby={emailLocked ? 'intake-email-locked' : undefined}
                        className={emailLocked ? 'bg-muted' : undefined}
                        autoComplete="email"
                      />
                    </FormControl>
                    <FormMessage />
                    {emailLocked ? (
                      <p id="intake-email-locked" className="text-xs text-muted-foreground">
                        This address is locked because the invitation was sent here.
                      </p>
                    ) : null}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Personal phone *</FormLabel>
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
                      <FormLabel>Password *</FormLabel>
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
                      <FormLabel>Confirm password *</FormLabel>
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

          {step > 0 && (
            <EmployeeIntakeSteps
              step={step}
              form={form}
              values={values}
              documents={documents}
              uploadingCount={uploadingCount}
              onDocumentSelect={handleDocumentSelect}
              onRemoveDocument={removeDocument}
            />
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
                {submitting ? 'Saving…' : 'Submit profile'}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}

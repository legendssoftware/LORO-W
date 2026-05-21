'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import toast from 'react-hot-toast';
import type {
  CreateClientProjectPayload,
  ClientProjectAddress,
} from '@/api/types/client-portal';
import { createClientProject } from '@/api/endpoints/client-portal';
import { useApiClient } from '@/api/hooks/use-api-client';
import { LINKED_CLIENT_FULL_PROFILE_QUERY_KEY } from '@/api/hooks/use-linked-client-profile';
import {
  PROJECT_PRIORITY_VALUES,
  PROJECT_STATUS_VALUES,
  PROJECT_TYPE_VALUES,
} from '@/lib/project-constants';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const optionalNumber = z.string().optional().or(z.literal(''));

function parseOptionalNumber(value?: string): number | undefined {
  if (value == null || value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

const addressSchema = z.object({
  street: z.string().optional().or(z.literal('')),
  suburb: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  postalCode: z.string().optional().or(z.literal('')),
});

const projectFormSchema = z
  .object({
    name: z.string().min(1, 'Project name is required'),
    description: z.string().optional().or(z.literal('')),
    status: z.enum(PROJECT_STATUS_VALUES),
    type: z.enum(PROJECT_TYPE_VALUES),
    priority: z.enum(PROJECT_PRIORITY_VALUES),
    progressPercentage: optionalNumber,
    budget: optionalNumber,
    currentSpent: optionalNumber,
    value: optionalNumber,
    totalCost: optionalNumber,
    currency: z.string().optional().or(z.literal('')),
    startDate: z.string().optional().or(z.literal('')),
    endDate: z.string().optional().or(z.literal('')),
    expectedCompletionDate: z.string().optional().or(z.literal('')),
    contactEmail: z
      .union([z.literal(''), z.string().email('Enter a valid email')])
      .optional(),
    contactPhone: z.string().optional().or(z.literal('')),
    address: addressSchema,
    latitude: optionalNumber,
    longitude: optionalNumber,
    requirements: z.string().optional().or(z.literal('')),
    tags: z.string().optional().or(z.literal('')),
    notes: z.string().optional().or(z.literal('')),
    linkedInvoices: z.string().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    const budget = parseOptionalNumber(data.budget);
    const spent = parseOptionalNumber(data.currentSpent);
    if (budget != null && spent != null && spent > budget) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Spent cannot exceed budget',
        path: ['currentSpent'],
      });
    }
  });

type ProjectFormValues = z.infer<typeof projectFormSchema>;

function defaultFormValues(): ProjectFormValues {
  return {
    name: '',
    description: '',
    status: 'planning',
    type: 'other',
    priority: 'medium',
    progressPercentage: '',
    budget: '',
    currentSpent: '',
    value: '',
    totalCost: '',
    currency: 'ZAR',
    startDate: '',
    endDate: '',
    expectedCompletionDate: '',
    contactEmail: '',
    contactPhone: '',
    address: {
      street: '',
      suburb: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
    },
    latitude: '',
    longitude: '',
    requirements: '',
    tags: '',
    notes: '',
    linkedInvoices: '',
  };
}

function splitList(value?: string): string[] | undefined {
  if (!value?.trim()) return undefined;
  const items = value
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function buildAddress(
  address: ProjectFormValues['address']
): ClientProjectAddress | undefined {
  const trimmed = {
    street: address.street?.trim() || undefined,
    suburb: address.suburb?.trim() || undefined,
    city: address.city?.trim() || undefined,
    state: address.state?.trim() || undefined,
    country: address.country?.trim() || undefined,
    postalCode: address.postalCode?.trim() || undefined,
  };
  const hasValue = Object.values(trimmed).some(Boolean);
  return hasValue ? trimmed : undefined;
}

function toIsoDate(value?: string): string | undefined {
  if (!value?.trim()) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function valuesToPayload(values: ProjectFormValues): CreateClientProjectPayload {
  const payload: CreateClientProjectPayload = {
    name: values.name.trim(),
  };

  const description = values.description?.trim();
  if (description) payload.description = description;

  payload.status = values.status;
  payload.type = values.type;
  payload.priority = values.priority;

  const budget = parseOptionalNumber(values.budget);
  if (budget != null) payload.budget = budget;

  const currentSpent = parseOptionalNumber(values.currentSpent);
  if (currentSpent != null) payload.currentSpent = currentSpent;

  const value = parseOptionalNumber(values.value);
  if (value != null) payload.value = value;

  const totalCost = parseOptionalNumber(values.totalCost);
  if (totalCost != null) payload.totalCost = totalCost;

  const currency = values.currency?.trim();
  if (currency) payload.currency = currency;

  const progressPercentage = parseOptionalNumber(values.progressPercentage);
  if (progressPercentage != null) {
    payload.progressPercentage = progressPercentage;
  }

  const startDate = toIsoDate(values.startDate);
  if (startDate) payload.startDate = startDate;

  const endDate = toIsoDate(values.endDate);
  if (endDate) payload.endDate = endDate;

  const expectedCompletionDate = toIsoDate(values.expectedCompletionDate);
  if (expectedCompletionDate) payload.expectedCompletionDate = expectedCompletionDate;

  const contactEmail = values.contactEmail?.trim();
  if (contactEmail) payload.contactEmail = contactEmail;

  const contactPhone = values.contactPhone?.trim();
  if (contactPhone) payload.contactPhone = contactPhone;

  const address = buildAddress(values.address);
  if (address) payload.address = address;

  const latitude = parseOptionalNumber(values.latitude);
  if (latitude != null) payload.latitude = latitude;

  const longitude = parseOptionalNumber(values.longitude);
  if (longitude != null) payload.longitude = longitude;

  const requirements = splitList(values.requirements);
  if (requirements) payload.requirements = requirements;

  const tags = splitList(values.tags);
  if (tags) payload.tags = tags;

  const notes = values.notes?.trim();
  if (notes) payload.notes = notes;

  const linkedInvoices = splitList(values.linkedInvoices);
  if (linkedInvoices) payload.linkedInvoices = linkedInvoices;

  return payload;
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function CreateProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: defaultFormValues(),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(defaultFormValues());
  }, [open, form]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateClientProjectPayload) =>
      createClientProject(apiClient, payload),
    onSuccess: () => {
      toast.success('Project created');
      queryClient.invalidateQueries({ queryKey: LINKED_CLIENT_FULL_PROFILE_QUERY_KEY });
      onOpenChange(false);
      form.reset(defaultFormValues());
    },
    onError: () => toast.error('Failed to create project'),
  });

  function onSubmit(values: ProjectFormValues) {
    createMutation.mutate(valuesToPayload(values));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormSection title="Basic">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} required />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PROJECT_STATUS_VALUES.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">
                              {s.replace(/_/g, ' ')}
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
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PROJECT_TYPE_VALUES.map((t) => (
                            <SelectItem key={t} value={t} className="capitalize">
                              {t.replace(/_/g, ' ')}
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
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PROJECT_PRIORITY_VALUES.map((p) => (
                            <SelectItem key={p} value={p} className="capitalize">
                              {p}
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
                  name="progressPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Progress (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormSection>

            <FormSection title="Financials">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget (ZAR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currentSpent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Spent (ZAR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value (ZAR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="totalCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total cost (ZAR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="ZAR" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormSection>

            <FormSection title="Timeline">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expectedCompletionDate"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Expected completion</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormSection>

            <FormSection title="Contact">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormSection>

            <FormSection title="Location">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="address.street"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Street</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address.suburb"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Suburb</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address.state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State / province</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address.country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address.postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal code</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormSection>

            <FormSection title="Additional">
              <FormField
                control={form.control}
                name="requirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Requirements</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={2}
                        placeholder="One per line or comma-separated"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Comma-separated tags" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="linkedInvoices"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linked invoices</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Comma-separated invoice refs" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

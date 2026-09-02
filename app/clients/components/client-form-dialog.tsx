'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useClient,
  useCreateClientMutation,
  useUpdateClientMutation,
  useSearchableUsersList,
} from '@/api/hooks';
import type { ClientDetail, CreateClientPayload } from '@/api/types/clients';
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
import { SearchableUserPicker } from '@/components/filters/searchable-filter-comboboxes';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/loading-spinner';
import { CLIENT_MODAL_CONTENT_CLASS } from './client-dialog-shared';
import { cn } from '@/lib/utils';
import { FORM_PLACEHOLDERS } from '@/lib/form-placeholders';

const addressSchema = z.object({
  street: z.string().min(5, 'Street is required (min 5 chars)'),
  suburb: z.string().min(2, 'Suburb is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State / province is required'),
  country: z.string().min(2, 'Country is required'),
  postalCode: z
    .string()
    .regex(/^\d{4}$/, 'South African postal code must be 4 digits'),
});

const phoneZa = z
  .string()
  .min(10, 'Phone is required')
  .refine(
    (v) => /^\+27[\s]?\d{2}[\s]?\d{3}[\s]?\d{4}$/.test(v.replace(/\s+/g, ' ').trim()) || /^\+27\d{9}$/.test(v.replace(/\s/g, '')),
    'Use South African format, e.g. +27 11 123 4567'
  );

const clientFormSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  contactPerson: z.string().min(2, 'Contact person is required'),
  email: z.string().email('Valid email required'),
  phone: phoneZa,
  alternativePhone: z.string().optional().or(z.literal('')),
  website: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  category: z.string().optional().or(z.literal('')),
  industry: z.string().optional().or(z.literal('')),
  assignedSalesRepUid: z.string().optional().or(z.literal('')),
  address: addressSchema,
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;

const defaultValues: ClientFormValues = {
  name: '',
  contactPerson: '',
  email: '',
  phone: '',
  alternativePhone: '',
  website: '',
  description: '',
  category: 'contract',
  industry: '',
  assignedSalesRepUid: '',
  address: {
    street: '',
    suburb: '',
    city: '',
    state: '',
    country: 'South Africa',
    postalCode: '',
  },
};

function detailToFormValues(c: ClientDetail): ClientFormValues {
  const addr = c.address ?? {};
  const repUid = c.assignedSalesRep?.uid;
  return {
    name: c.name ?? '',
    contactPerson: c.contactPerson ?? '',
    email: c.email ?? '',
    phone: c.phone ?? '',
    alternativePhone: (c.alternativePhone as string) ?? '',
    website: c.website ?? '',
    description: (c.description as string) ?? '',
    category: (c.category as string) ?? 'contract',
    industry: (c.industry as string) ?? '',
    assignedSalesRepUid: repUid != null ? String(repUid) : '',
    address: {
      street: (addr.street as string) ?? '',
      suburb: (addr.suburb as string) ?? '',
      city: (addr.city as string) ?? '',
      state: (addr.state as string) ?? '',
      country: (addr.country as string) ?? 'South Africa',
      postalCode: (addr.postalCode as string) ?? '',
    },
  };
}

function trimPayload<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj } as Record<string, unknown>;
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (typeof v === 'string' && v.trim() === '') out[k] = undefined;
  }
  return out as T;
}

export function ClientFormDialog({
  open,
  onOpenChange,
  mode,
  clientRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  clientRef: number | null;
}) {
  const createMutation = useCreateClientMutation();
  const updateMutation = useUpdateClientMutation();
  const {
    users,
    searchQuery: userSearchQuery,
    setSearchQuery: setUserSearchQuery,
    isSearchLoading: isUserSearchLoading,
    bindUidChange,
  } = useSearchableUsersList({ limit: 200, enabled: open });
  const { data: clientDetail, isLoading: detailLoading } = useClient(
    mode === 'edit' ? clientRef : null,
    { enabled: open && mode === 'edit' && clientRef != null }
  );

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!open) return;
    if (mode === 'create') {
      form.reset(defaultValues);
      return;
    }
    if (clientDetail) {
      form.reset(detailToFormValues(clientDetail));
    }
  }, [open, mode, clientDetail, form]);

  function onSubmit(values: ClientFormValues) {
    const alt = values.alternativePhone?.trim();
    const web = values.website?.trim();
    const assignedUid = values.assignedSalesRepUid?.trim();
    const base = {
      name: values.name.trim(),
      contactPerson: values.contactPerson.trim(),
      email: values.email.trim().toLowerCase(),
      phone: values.phone.trim(),
      address: values.address,
      ...(alt ? { alternativePhone: alt } : {}),
      ...(web ? { website: web.startsWith('http') ? web : `https://${web}` } : {}),
      ...(values.description?.trim()
        ? { description: values.description.trim() }
        : {}),
      ...(values.category?.trim() ? { category: values.category.trim() } : {}),
      ...(values.industry?.trim() ? { industry: values.industry.trim() } : {}),
      ...(assignedUid && !Number.isNaN(Number(assignedUid))
        ? { assignedSalesRep: { uid: Number(assignedUid) } }
        : {}),
    };

    if (mode === 'create') {
      const payload = trimPayload({
        ...base,
        website: web ? (web.startsWith('http') ? web : `https://${web}`) : undefined,
      });
      createMutation.mutate(payload as CreateClientPayload, {
        onSuccess: () => onOpenChange(false),
      });
      return;
    }

    if (clientRef == null) return;
    const payload = trimPayload({ ...base });
    updateMutation.mutate(
      { ref: clientRef, payload },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  const busy = createMutation.isPending || updateMutation.isPending;
  const showSpinner = mode === 'edit' && open && (detailLoading || !clientDetail);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(CLIENT_MODAL_CONTENT_CLASS)}>
        <DialogHeader className="shrink-0 space-y-1 px-6 pt-6 pb-2 pr-12">
          <DialogTitle>{mode === 'create' ? 'Add client' : 'Edit client'}</DialogTitle>
        </DialogHeader>
        {showSpinner ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-12">
            <LoadingSpinner wrapperClassName="py-8" />
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div className="min-h-0 flex-1 overflow-y-auto px-6">
                <div className="space-y-4 pb-4 pr-3">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company / client name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={FORM_PLACEHOLDERS.companyName} className="bg-background border-border" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactPerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact person</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={FORM_PLACEHOLDERS.fullName} className="bg-background border-border" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder={FORM_PLACEHOLDERS.email} className="bg-background border-border" />
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
                            <Input {...field} placeholder={FORM_PLACEHOLDERS.landline} className="bg-background border-border" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="alternativePhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alternative phone (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={FORM_PLACEHOLDERS.phone} className="bg-background border-border" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={FORM_PLACEHOLDERS.website} className="bg-background border-border" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Retail" className="bg-background border-border" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Construction" className="bg-background border-border" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="assignedSalesRepUid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned sales rep (optional)</FormLabel>
                        <FormControl>
                          <SearchableUserPicker
                            users={users}
                            branches={[]}
                            selectedUid={field.value || 'all'}
                            onUidChange={bindUidChange((uid) =>
                              field.onChange(uid === 'all' ? '' : uid)
                            )}
                            showBranchSubtitle={false}
                            allOptionLabel="None"
                            searchPlaceholder="Search sales reps…"
                            emptyMessage="No sales rep found."
                            triggerClassName="w-full bg-background border-border"
                            searchQuery={userSearchQuery}
                            onSearchQueryChange={setUserSearchQuery}
                            isSearchLoading={isUserSearchLoading}
                          />
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
                        <FormLabel>Description (optional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} placeholder="Brief notes about this client" className="bg-background border-border resize-y min-h-[72px]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="text-sm font-semibold text-foreground pt-2">Address</p>
                  <FormField
                    control={form.control}
                    name="address.street"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={FORM_PLACEHOLDERS.street} className="bg-background border-border" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="address.suburb"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Suburb</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={FORM_PLACEHOLDERS.suburb} className="bg-background border-border" />
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
                            <Input {...field} placeholder={FORM_PLACEHOLDERS.city} className="bg-background border-border" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="address.state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Province / state</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={FORM_PLACEHOLDERS.province} className="bg-background border-border" />
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
                            <Input {...field} placeholder={FORM_PLACEHOLDERS.country} className="bg-background border-border" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="address.postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal code (4 digits)</FormLabel>
                        <FormControl>
                          <Input {...field} maxLength={4} placeholder={FORM_PLACEHOLDERS.postalCode} className="bg-background border-border" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <DialogFooter className="shrink-0 gap-2 border-t px-6 py-4 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {mode === 'create' ? 'Create' : 'Save changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

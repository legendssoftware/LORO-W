'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useCompetitor,
  useCreateCompetitorMutation,
  useUpdateCompetitorMutation,
} from '@/api/hooks';
import type { CompetitorDetail, CreateCompetitorPayload, UpdateCompetitorPayload } from '@/api/types/competitors';
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
import { Switch } from '@/components/ui/switch';
import { LoadingSpinner } from '@/components/loading-spinner';
import { COMPETITOR_MODAL_CONTENT_CLASS } from './competitor-dialog-shared';
import { COMPETITOR_STATUS_VALUES } from '@/lib/competitor-filter-utils';
import { cn } from '@/lib/utils';

const geofenceValues = ['none', 'notify', 'alert', 'restricted'] as const;

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

const competitorFormSchema = z
  .object({
    name: z.string().min(2, 'Name is required'),
    description: z.string().optional().or(z.literal('')),
    website: z.string().optional().or(z.literal('')),
    contactEmail: z.union([z.literal(''), z.string().email('Valid email required')]),
    contactPhone: z.string().optional().or(z.literal('')),
    industry: z.string().optional().or(z.literal('')),
    status: z.enum(COMPETITOR_STATUS_VALUES),
    threatLevelStr: z.enum(['none', '1', '2', '3', '4', '5']),
    isDirect: z.boolean(),
    latitude: z.string().optional().or(z.literal('')),
    longitude: z.string().optional().or(z.literal('')),
    logoUrl: z.string().optional().or(z.literal('')),
    geofenceType: z.enum(geofenceValues),
    geofenceRadiusStr: z.string().optional().or(z.literal('')),
    enableGeofence: z.boolean(),
    address: addressSchema,
  })
  .superRefine((data, ctx) => {
    if (!data.enableGeofence) return;
    const lat = data.latitude?.trim();
    const lng = data.longitude?.trim();
    if (!lat || !lng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Latitude and longitude are required when geofence is enabled',
        path: ['latitude'],
      });
    }
  });

export type CompetitorFormValues = z.infer<typeof competitorFormSchema>;

const defaultValues: CompetitorFormValues = {
  name: '',
  description: '',
  website: '',
  contactEmail: '',
  contactPhone: '',
  industry: '',
  status: 'active',
  threatLevelStr: 'none',
  isDirect: false,
  latitude: '',
  longitude: '',
  logoUrl: '',
  geofenceType: 'none',
  geofenceRadiusStr: '500',
  enableGeofence: false,
  address: {
    street: '',
    suburb: '',
    city: '',
    state: '',
    country: 'South Africa',
    postalCode: '',
  },
};

function numLikeToString(v: unknown): string {
  if (v == null || v === '') return '';
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return String(n);
    return v;
  }
  return '';
}

function detailToFormValues(c: CompetitorDetail): CompetitorFormValues {
  const addr = c.address ?? {};
  const st = typeof c.status === 'string' && COMPETITOR_STATUS_VALUES.includes(c.status as (typeof COMPETITOR_STATUS_VALUES)[number])
    ? (c.status as (typeof COMPETITOR_STATUS_VALUES)[number])
    : 'active';
  const tl =
    typeof c.threatLevel === 'number' &&
    c.threatLevel >= 1 &&
    c.threatLevel <= 5
      ? String(c.threatLevel)
      : 'none';
  const gf = typeof c.geofenceType === 'string' && ['none', 'notify', 'alert', 'restricted'].includes(c.geofenceType)
    ? (c.geofenceType as (typeof geofenceValues)[number])
    : 'none';
  return {
    name: c.name ?? '',
    description: (c.description as string) ?? '',
    website: (c.website as string) ?? '',
    contactEmail: (c.contactEmail as string) ?? '',
    contactPhone: (c.contactPhone as string) ?? '',
    industry: (c.industry as string) ?? '',
    status: st,
    threatLevelStr: tl as 'none' | '1' | '2' | '3' | '4' | '5',
    isDirect: Boolean(c.isDirect),
    latitude: numLikeToString(c.latitude),
    longitude: numLikeToString(c.longitude),
    logoUrl: (c.logoUrl as string) ?? '',
    geofenceType: gf,
    geofenceRadiusStr:
      c.geofenceRadius != null ? String(c.geofenceRadius) : '500',
    enableGeofence: Boolean(c.enableGeofence),
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

function parseCoord(s: string): number | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function valuesToPayload(values: CompetitorFormValues): CreateCompetitorPayload {
  const web = values.website?.trim();
  const threatLevel =
    values.threatLevelStr !== 'none' ? Number(values.threatLevelStr) : undefined;
  const lat = parseCoord(values.latitude ?? '');
  const lng = parseCoord(values.longitude ?? '');
  const radiusRaw = values.geofenceRadiusStr?.trim();
  const geofenceRadius =
    radiusRaw && !Number.isNaN(Number(radiusRaw)) ? Number(radiusRaw) : undefined;

  const base: CreateCompetitorPayload = {
    name: values.name.trim(),
    address: values.address,
    ...(values.description?.trim() ? { description: values.description.trim() } : {}),
    ...(web
      ? { website: web.startsWith('http') ? web : `https://${web}` }
      : {}),
    ...(values.contactEmail?.trim() ? { contactEmail: values.contactEmail.trim().toLowerCase() } : {}),
    ...(values.contactPhone?.trim() ? { contactPhone: values.contactPhone.trim() } : {}),
    ...(values.industry?.trim() ? { industry: values.industry.trim() } : {}),
    status: values.status,
    ...(threatLevel != null && threatLevel >= 1 && threatLevel <= 5 ? { threatLevel } : {}),
    isDirect: values.isDirect,
    ...(lat != null ? { latitude: lat } : {}),
    ...(lng != null ? { longitude: lng } : {}),
    ...(values.logoUrl?.trim() ? { logoUrl: values.logoUrl.trim() } : {}),
    geofenceType: values.geofenceType,
    ...(geofenceRadius != null ? { geofenceRadius } : {}),
    enableGeofence: values.enableGeofence,
  };
  return base;
}

export function CompetitorFormDialog({
  open,
  onOpenChange,
  mode,
  competitorId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  competitorId: number | null;
}) {
  const createMutation = useCreateCompetitorMutation();
  const updateMutation = useUpdateCompetitorMutation();
  const { data: competitorDetail, isLoading: detailLoading } = useCompetitor(
    mode === 'edit' ? competitorId : null,
    { enabled: open && mode === 'edit' && competitorId != null }
  );

  const form = useForm<CompetitorFormValues>({
    resolver: zodResolver(competitorFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!open) return;
    if (mode === 'create') {
      form.reset(defaultValues);
      return;
    }
    if (competitorDetail) {
      form.reset(detailToFormValues(competitorDetail));
    }
  }, [open, mode, competitorDetail, form]);

  function onSubmit(values: CompetitorFormValues) {
    const payload = valuesToPayload(values);

    if (mode === 'create') {
      createMutation.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      });
      return;
    }

    if (competitorId == null) return;
    updateMutation.mutate(
      { id: competitorId, payload: valuesToPayload(values) as UpdateCompetitorPayload },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  const busy = createMutation.isPending || updateMutation.isPending;
  const showSpinner = mode === 'edit' && open && (detailLoading || !competitorDetail);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(COMPETITOR_MODAL_CONTENT_CLASS)}>
        <DialogHeader className="shrink-0 space-y-1 px-6 pt-6 pb-2 pr-12">
          <DialogTitle>{mode === 'create' ? 'Add competitor' : 'Edit competitor'}</DialogTitle>
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
                        <FormLabel>Competitor name</FormLabel>
                        <FormControl>
                          <Input {...field} className="border-border bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact email (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" className="border-border bg-background" />
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
                          <FormLabel>Contact phone (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} className="border-border bg-background" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://…" className="border-border bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} className="border-border bg-background" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="border-border bg-background">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {COMPETITOR_STATUS_VALUES.map((v) => (
                                <SelectItem key={v} value={v}>
                                  <span className="capitalize">{v}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="threatLevelStr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Threat level (optional)</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="border-border bg-background">
                                <SelectValue placeholder="Not set" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Not set</SelectItem>
                              {[1, 2, 3, 4, 5].map((n) => (
                                <SelectItem key={n} value={String(n)}>
                                  {n} / 5
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
                      name="isDirect"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Direct competitor</FormLabel>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={3}
                            className="min-h-[72px] resize-y border-border bg-background"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} className="border-border bg-background" />
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
                          <FormLabel>Longitude (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} className="border-border bg-background" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="logoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo URL (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://…" className="border-border bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="pt-2 text-sm font-semibold text-foreground">Geofence</p>
                  <FormField
                    control={form.control}
                    name="enableGeofence"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-3">
                        <FormLabel className="text-base">Enable geofence</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="geofenceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Geofence type</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="border-border bg-background">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {geofenceValues.map((v) => (
                                <SelectItem key={v} value={v}>
                                  {v}
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
                      name="geofenceRadiusStr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Radius (m)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min={100} max={5000} className="border-border bg-background" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <p className="pt-2 text-sm font-semibold text-foreground">Address</p>
                  <FormField
                    control={form.control}
                    name="address.street"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street</FormLabel>
                        <FormControl>
                          <Input {...field} className="border-border bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="address.suburb"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Suburb</FormLabel>
                          <FormControl>
                            <Input {...field} className="border-border bg-background" />
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
                            <Input {...field} className="border-border bg-background" />
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
                          <FormLabel>Province</FormLabel>
                          <FormControl>
                            <Input {...field} className="border-border bg-background" />
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
                            <Input {...field} className="border-border bg-background" />
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
                            <Input {...field} className="border-border bg-background" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="shrink-0 gap-2 border-t border-border px-6 py-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy} className="bg-violet-600 text-white hover:bg-violet-700">
                  {busy ? 'Saving…' : mode === 'create' ? 'Create' : 'Save changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

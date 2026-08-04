'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { useCheckInStatus, useCheckOutMutation, useClientsInfinite } from '@/api/hooks';
import type { ClientListItem, ClientAddress } from '@/api/endpoints/clients';
import type { CreateCheckOutPayload, MethodOfContact } from '@/api/types/visits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DetailDialogCloseButton,
  DETAIL_DIALOG_CONTENT_CLASS,
} from '@/components/detail-dialog/detail-dialog-primitives';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { MapPin, Camera, Upload, Phone, Mail, Smartphone, ChevronDown } from 'lucide-react';
import { CalendarIcon, Loader2Icon, XIcon, UsersIcon } from '@/lib/icons';
import {
  TYPE_OF_BUSINESS_OPTIONS,
  CURRENCY_OPTIONS,
  METHOD_OPTIONS,
  SITE_TYPE_OPTIONS,
  QUOTATION_STATUS_OPTIONS,
  PERSON_POSITION_OPTIONS,
} from '@/lib/visit-form-utils';
import { validateEndVisitFormWithZodFieldErrors } from '@/lib/schemas/visit-schemas';
import { resolveCheckInLocation } from '@/lib/check-in-utils';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const NOTES_MAX_WORDS = 2500;
const NOTES_MAX_LENGTH = NOTES_MAX_WORDS * 15;

function hasAddress(addr?: ClientAddress): boolean {
  if (!addr) return false;
  const { street, suburb, city, state, country, postalCode } = addr;
  return [street, suburb, city, state, country, postalCode].some(
    (v) => typeof v === 'string' && v.trim() !== '',
  );
}

export interface EndVisitActiveVisit {
  methodOfContact?: string | null;
  businessType?: string | null;
  buildingType?: string | null;
}

export interface EndVisitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeVisit?: EndVisitActiveVisit | null;
  initialFormValues?: Partial<CreateCheckOutPayload>;
  title?: string;
  description?: string;
  submitLabel?: string;
  successMessage?: string;
  onSuccess?: () => void;
}

function defaultEndForm(
  activeVisit?: EndVisitActiveVisit | null,
  initial?: Partial<CreateCheckOutPayload>,
): Partial<CreateCheckOutPayload> {
  return {
    notes: '',
    resolution: '',
    contactFullName: '',
    contactCellPhone: '',
    contactLandline: '',
    contactEmail: '',
    companyName: '',
    personSeenPosition: '',
    followUp: '',
    quotationNumber: '',
    quotationStatus: undefined,
    salesValue: undefined,
    salesCurrency: 'ZAR',
    contactMade: true,
    businessType: initial?.businessType ?? activeVisit?.businessType ?? undefined,
    methodOfContact:
      initial?.methodOfContact ?? (activeVisit?.methodOfContact as MethodOfContact) ?? undefined,
    buildingType: initial?.buildingType ?? activeVisit?.buildingType ?? undefined,
    contactAddress: undefined,
    ...initial,
  };
}

export function EndVisitDialog({
  open,
  onOpenChange,
  activeVisit,
  initialFormValues,
  title = 'End visit',
  description = 'Add visit details and optionally a photo.',
  submitLabel = 'End visit',
  successMessage = 'Visit ended',
  onSuccess,
}: EndVisitDialogProps) {
  const statusQuery = useCheckInStatus({ enabled: open });
  const checkOutMutation = useCheckOutMutation();

  const [endForm, setEndForm] = useState<Partial<CreateCheckOutPayload>>(() =>
    defaultEndForm(activeVisit, initialFormValues),
  );
  const [endPhotoFile, setEndPhotoFile] = useState<File | null>(null);
  const [endPhotoPreview, setEndPhotoPreview] = useState<string | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [endFieldErrors, setEndFieldErrors] = useState<Record<string, string>>({});
  const [clientComboboxOpen, setClientComboboxOpen] = useState(false);
  const [followUpPickerOpen, setFollowUpPickerOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientListItem | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);
  const originalClientRef = useRef<ClientListItem | null>(null);
  const prevOpenRef = useRef(false);

  const clientsInfinite = useClientsInfinite({
    enabled: open,
    search: clientSearch.trim() || undefined,
  });
  const clientsFromApi: ClientListItem[] = clientsInfinite.data ?? [];
  const clientsList: ClientListItem[] = useMemo(() => {
    if (!selectedClient) return clientsFromApi;
    const inList = clientsFromApi.some((c) => c.uid === selectedClient.uid);
    return inList ? clientsFromApi : [selectedClient, ...clientsFromApi];
  }, [clientsFromApi, selectedClient]);

  const showPhotoInEndModal = activeVisit?.methodOfContact === 'Physical';
  const endVisitDialogContainer =
    typeof document !== 'undefined' ? document.getElementById('end-visit-dialog-content') : null;

  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;
    if (!justOpened) return;
    setFollowUpPickerOpen(false);
    setSelectedClient(null);
    setClientSearch('');
    originalClientRef.current = null;
    setEndForm(defaultEndForm(activeVisit, initialFormValues));
    setEndPhotoFile(null);
    setEndPhotoPreview(null);
    setMediaFiles([]);
    setMediaUrls([]);
    setMediaUrlInput('');
    setEndFieldErrors({});
  }, [open, activeVisit, initialFormValues]);

  const handleEndPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setEndPhotoFile(file);
      setEndPhotoPreview(URL.createObjectURL(file));
    }
    e.target.value = '';
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  const handleMediaFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) setMediaFiles((prev) => [...prev, ...files]);
    e.target.value = '';
  };

  const addMediaUrl = () => {
    const url = mediaUrlInput.trim();
    if (url) {
      setMediaUrls((prev) => [...prev, url]);
      setMediaUrlInput('');
    }
  };

  function applyClientToForm(client: ClientListItem) {
    originalClientRef.current = client;
    const addr = client.address;
    setEndForm((prev) => ({
      ...prev,
      client: { uid: client.uid },
      companyName: client.name ?? prev.companyName,
      contactFullName: client.contactPerson ?? prev.contactFullName,
      contactEmail: client.email ?? prev.contactEmail,
      contactCellPhone: (client.phone as string) ?? prev.contactCellPhone,
      contactLandline: (client.alternativePhone as string) ?? prev.contactLandline,
      ...(addr && {
        contactAddress: {
          streetNumber: '',
          street: (addr.street ?? '') as string,
          suburb: (addr.suburb ?? '') as string,
          city: (addr.city ?? '') as string,
          province: (addr.state ?? '') as string,
          state: (addr.state ?? '') as string,
          country: (addr.country ?? '') as string,
          postalCode: (addr.postalCode ?? '') as string,
        },
      }),
    }));
    setSelectedClient(client);
  }

  function clearClientSelection() {
    originalClientRef.current = null;
    setSelectedClient(null);
    setEndForm((prev) => ({ ...prev, client: undefined }));
  }

  const submitEndVisit = async () => {
    const { fieldErrors: errs, firstMessage } = validateEndVisitFormWithZodFieldErrors(
      endForm as Record<string, unknown>,
    );
    if (firstMessage) {
      setEndFieldErrors(errs);
      toast.error(firstMessage);
      return;
    }
    const stillCheckedIn = await statusQuery.refetch().then((r) => r.data?.checkedIn === true);
    if (!stillCheckedIn) {
      toast.error('You have already ended this visit');
      onOpenChange(false);
      return;
    }
    const location = await resolveCheckInLocation();
    let clientProfileUpdate: CreateCheckOutPayload['clientProfileUpdate'] | undefined;
    if (endForm.client && originalClientRef.current) {
      const orig = originalClientRef.current;
      const changed: NonNullable<CreateCheckOutPayload['clientProfileUpdate']> = {};
      const trimmedName = (endForm.companyName ?? '').trim();
      const trimmedPhone = (endForm.contactCellPhone ?? '').trim();
      const trimmedLandline = (endForm.contactLandline ?? '').trim();
      const trimmedEmail = (endForm.contactEmail ?? '').trim();
      if (trimmedName && trimmedName !== (orig.name ?? '')) changed.name = trimmedName;
      if (trimmedPhone !== (orig.phone ?? '')) changed.phone = trimmedPhone;
      if (trimmedLandline !== ((orig.alternativePhone as string) ?? ''))
        changed.alternativePhone = trimmedLandline;
      if (trimmedEmail !== (orig.email ?? '')) changed.email = trimmedEmail;
      const origAddr = orig.address ?? {};
      const formAddr = endForm.contactAddress;
      if (
        formAddr &&
        ((formAddr.street ?? '') !== (origAddr.street ?? '') ||
          (formAddr.suburb ?? '') !== (origAddr.suburb ?? '') ||
          (formAddr.city ?? '') !== (origAddr.city ?? '') ||
          (formAddr.state ?? '') !== (origAddr.state ?? '') ||
          (formAddr.country ?? '') !== (origAddr.country ?? '') ||
          (formAddr.postalCode ?? '') !== (origAddr.postalCode ?? ''))
      ) {
        changed.address = {
          street: formAddr.street ?? '',
          suburb: formAddr.suburb ?? '',
          city: formAddr.city ?? '',
          state: formAddr.state ?? '',
          country: formAddr.country ?? '',
          postalCode: formAddr.postalCode ?? '',
        };
      }
      if (Object.keys(changed).length > 0) clientProfileUpdate = changed;
    }
    const payload: CreateCheckOutPayload = {
      checkOutTime: new Date().toISOString(),
      checkOutLocation: location,
      checkOutPhoto: undefined,
      notes: endForm.notes || undefined,
      resolution: endForm.resolution || undefined,
      followUp: endForm.followUp || undefined,
      contactFullName: endForm.contactFullName || undefined,
      contactCellPhone: endForm.contactCellPhone || undefined,
      contactLandline: endForm.contactLandline || undefined,
      contactEmail: endForm.contactEmail || undefined,
      companyName: (endForm.companyName ?? '').trim(),
      personSeenPosition: endForm.personSeenPosition || undefined,
      quotationNumber: (endForm.quotationNumber ?? '').trim() || undefined,
      quotationStatus: endForm.quotationStatus || undefined,
      salesValue: endForm.salesValue,
      salesCurrency: endForm.salesValue != null ? endForm.salesCurrency : undefined,
      contactMade: endForm.contactMade ?? true,
      methodOfContact: endForm.methodOfContact,
      buildingType: endForm.buildingType,
      businessType: endForm.businessType,
      client: endForm.client,
      contactAddress: endForm.contactAddress,
      media:
        mediaUrls.length > 0 || mediaFiles.length > 0
          ? [...mediaUrls, ...mediaFiles.map((f) => f.name)]
          : undefined,
      ...(clientProfileUpdate && { clientProfileUpdate }),
    };
    if (endPhotoFile) {
      /* optional photo upload not wired */
    }
    try {
      await checkOutMutation.mutateAsync(payload);
      originalClientRef.current = null;
      toast.success(successMessage);
      onOpenChange(false);
      statusQuery.refetch();
      onSuccess?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to end visit');
    }
  };

  return (
<Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          id="end-visit-dialog-content"
          showCloseButton={false}
          className={cn(DETAIL_DIALOG_CONTENT_CLASS, 'z-[10000]')}
          overlayClassName="z-[10000]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute top-4 right-4 z-10">
            <DetailDialogCloseButton />
          </div>
          <DialogHeader className="pr-24">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            {/* 1. Type of business (top) */}
            <div className="grid gap-2 sm:col-span-2">
              <Label>Type of business</Label>
              <Select
                value={endForm.businessType ?? '_none'}
                onValueChange={(value) =>
                  setEndForm((f) => ({ ...f, businessType: value === '_none' ? undefined : value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type of business" />
                </SelectTrigger>
                <SelectContent className="z-[10001]">
                  <SelectItem value="_none">Select type of business</SelectItem>
                  {TYPE_OF_BUSINESS_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="size-4 shrink-0" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            {/* 2. Client (optional) – combobox with search and load more */}
            <div className="grid gap-2 sm:col-span-2">
              <Label className="flex items-center gap-2">
                <UsersIcon className="size-4 shrink-0" />
                Select the client
              </Label>
              <Popover open={clientComboboxOpen} onOpenChange={setClientComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between font-normal h-10 px-3"
                  >
                    <span className="truncate min-w-0">
                      {selectedClient
                        ? (() => {
                            const nameTrim = (selectedClient.name ?? '').trim();
                            const contactTrim = (selectedClient.contactPerson ?? '').trim();
                            return contactTrim && contactTrim !== nameTrim
                              ? `${nameTrim} · ${contactTrim}`
                              : nameTrim || '—';
                          })()
                        : 'Select client if you visited an existing client'}
                    </span>
                    <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="z-[10001] w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0"
                  align="start"
                  container={endVisitDialogContainer}
                >
                  <div className="p-2 border-b border-border">
                    <Input
                      placeholder="Search clients"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="h-9"
                      autoFocus
                      aria-label="Search clients"
                    />
                  </div>
                  <div className="max-h-[280px] overflow-y-auto">
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
                      onClick={() => {
                        clearClientSelection();
                        setClientComboboxOpen(false);
                      }}
                    >
                      No client
                    </button>
                    {clientsInfinite.isLoading ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                        Loading…
                      </div>
                    ) : (
                      clientsList.map((c) => {
                        const nameTrim = (c.name ?? '').trim();
                        const contactTrim = (c.contactPerson ?? '').trim();
                        const displayLabel =
                          contactTrim && contactTrim !== nameTrim
                            ? `${nameTrim} · ${contactTrim}`
                            : nameTrim || '—';
                        const hasEmail = !!(typeof c.email === 'string' && c.email.trim() !== '');
                        const hasLandline = !!(typeof c.alternativePhone === 'string' && c.alternativePhone.trim() !== '');
                        const hasCell = !!(typeof c.phone === 'string' && c.phone.trim() !== '');
                        const hasAddr = hasAddress(c.address);
                        return (
                          <button
                            key={c.uid.toString()}
                            type="button"
                            className={cn(
                              'w-full px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none flex items-center justify-between gap-2',
                              selectedClient?.uid === c.uid && 'bg-muted'
                            )}
                            onClick={() => {
                              applyClientToForm(c);
                              setClientComboboxOpen(false);
                            }}
                          >
                            <span className="truncate min-w-0 flex-1">{displayLabel}</span>
                            <span className="flex flex-shrink-0 gap-0.5 items-center">
                              <Mail
                                className={cn('size-4', hasEmail ? 'text-green-600' : 'text-red-500')}
                                aria-hidden
                              />
                              <Phone
                                className={cn('size-4', hasLandline ? 'text-green-600' : 'text-red-500')}
                                aria-hidden
                              />
                              <Smartphone
                                className={cn('size-4', hasCell ? 'text-green-600' : 'text-red-500')}
                                aria-hidden
                              />
                              <MapPin
                                className={cn('size-4', hasAddr ? 'text-green-600' : 'text-red-500')}
                                aria-hidden
                              />
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                  {(clientsInfinite.hasNextPage ?? false) && (
                    <div className="flex items-center justify-center border-t border-border py-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-full text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          clientsInfinite.fetchNextPage();
                        }}
                        disabled={clientsInfinite.isFetchingNextPage ?? false}
                      >
                        {clientsInfinite.isFetchingNextPage ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          'Load more'
                        )}
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            {/* 3. Notes (textarea, max 2500 words) */}
            <div className="grid gap-2 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Add notes"
                value={endForm.notes ?? ''}
                onChange={(e) => setEndForm((f) => ({ ...f, notes: e.target.value }))}
                maxLength={NOTES_MAX_LENGTH}
                rows={10}
                className="min-h-[200px] resize-y"
              />
              <p className="text-xs text-muted-foreground">
                {((endForm.notes ?? '').trim().split(/\s+/).filter(Boolean).length).toLocaleString()} / {NOTES_MAX_WORDS.toLocaleString()} words
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Resolution / outcome</Label>
              <Input
                placeholder="e.g. Issue resolved"
                value={endForm.resolution ?? ''}
                onChange={(e) => setEndForm((f) => ({ ...f, resolution: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Contact name</Label>
              <Input
                placeholder="Person contacted"
                value={endForm.contactFullName ?? ''}
                onChange={(e) => setEndForm((f) => ({ ...f, contactFullName: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Cell</Label>
              <Input
                placeholder="Cell phone number"
                value={endForm.contactCellPhone ?? ''}
                onChange={(e) => {
                  setEndForm((f) => ({ ...f, contactCellPhone: e.target.value }));
                  if (endFieldErrors.contactCellPhone) setEndFieldErrors((prev) => ({ ...prev, contactCellPhone: '' }));
                }}
                aria-invalid={!!endFieldErrors.contactCellPhone}
                className={endFieldErrors.contactCellPhone ? 'border-destructive' : ''}
              />
              {endFieldErrors.contactCellPhone && (
                <p className="text-xs text-destructive">{endFieldErrors.contactCellPhone}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Landline</Label>
              <Input
                placeholder="Landline phone number"
                value={endForm.contactLandline ?? ''}
                onChange={(e) => {
                  setEndForm((f) => ({ ...f, contactLandline: e.target.value }));
                  if (endFieldErrors.contactLandline) setEndFieldErrors((prev) => ({ ...prev, contactLandline: '' }));
                }}
                aria-invalid={!!endFieldErrors.contactLandline}
                className={endFieldErrors.contactLandline ? 'border-destructive' : ''}
              />
              {endFieldErrors.contactLandline && (
                <p className="text-xs text-destructive">{endFieldErrors.contactLandline}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Contact email</Label>
              <Input
                type="email"
                placeholder="Email"
                value={endForm.contactEmail ?? ''}
                onChange={(e) => {
                  setEndForm((f) => ({ ...f, contactEmail: e.target.value }));
                  if (endFieldErrors.contactEmail) setEndFieldErrors((prev) => ({ ...prev, contactEmail: '' }));
                }}
                aria-invalid={!!endFieldErrors.contactEmail}
                className={endFieldErrors.contactEmail ? 'border-destructive' : ''}
              />
              {endFieldErrors.contactEmail && (
                <p className="text-xs text-destructive">{endFieldErrors.contactEmail}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Company name</Label>
              <Input
                placeholder="Company"
                value={endForm.companyName ?? ''}
                onChange={(e) => setEndForm((f) => ({ ...f, companyName: e.target.value }))}
              />
            </div>
            {/* Address fields */}
            <div className="grid gap-2 sm:col-span-2">
              <Label>Address</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  placeholder="Street"
                  value={endForm.contactAddress?.street ?? ''}
                  onChange={(e) =>
                    setEndForm((f) => ({
                      ...f,
                      contactAddress: { ...f.contactAddress, street: e.target.value },
                    }))
                  }
                />
                <Input
                  placeholder="Suburb"
                  value={endForm.contactAddress?.suburb ?? ''}
                  onChange={(e) =>
                    setEndForm((f) => ({
                      ...f,
                      contactAddress: { ...f.contactAddress, suburb: e.target.value },
                    }))
                  }
                />
                <Input
                  placeholder="City"
                  value={endForm.contactAddress?.city ?? ''}
                  onChange={(e) =>
                    setEndForm((f) => ({
                      ...f,
                      contactAddress: { ...f.contactAddress, city: e.target.value },
                    }))
                  }
                />
                <Input
                  placeholder="Province / State"
                  value={endForm.contactAddress?.state ?? ''}
                  onChange={(e) =>
                    setEndForm((f) => ({
                      ...f,
                      contactAddress: { ...f.contactAddress, state: e.target.value, province: e.target.value },
                    }))
                  }
                />
                <Input
                  placeholder="Country"
                  value={endForm.contactAddress?.country ?? ''}
                  onChange={(e) =>
                    setEndForm((f) => ({
                      ...f,
                      contactAddress: { ...f.contactAddress, country: e.target.value },
                    }))
                  }
                />
                <Input
                  placeholder="Postal code"
                  value={endForm.contactAddress?.postalCode ?? ''}
                  onChange={(e) =>
                    setEndForm((f) => ({
                      ...f,
                      contactAddress: { ...f.contactAddress, postalCode: e.target.value },
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Position of the person seen</Label>
              <Select
                value={endForm.personSeenPosition ?? '_none'}
                onValueChange={(value) =>
                  setEndForm((f) => ({ ...f, personSeenPosition: value === '_none' ? undefined : value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent className="z-[10001]">
                  <SelectItem value="_none">Select position</SelectItem>
                  {PERSON_POSITION_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="size-4 shrink-0" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Follow-up</Label>
              <Popover open={followUpPickerOpen} onOpenChange={setFollowUpPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endForm.followUp && 'text-muted-foreground',
                      endFieldErrors.followUp && 'border-destructive'
                    )}
                    aria-invalid={!!endFieldErrors.followUp}
                  >
                    <CalendarIcon className="mr-2 size-4" />
                    {endForm.followUp
                      ? (() => {
                          const d = endForm.followUp.match(/^\d{4}-\d{2}-\d{2}/)
                            ? new Date(endForm.followUp)
                            : null;
                          return d && !Number.isNaN(d.getTime())
                            ? format(d, 'MMM d, yyyy')
                            : endForm.followUp;
                        })()
                      : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[10001]" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      endForm.followUp && /^\d{4}-\d{2}-\d{2}/.test(endForm.followUp)
                        ? new Date(endForm.followUp)
                        : undefined
                    }
                    onSelect={(d) => {
                      setEndForm((f) => ({ ...f, followUp: d ? format(d, 'yyyy-MM-dd') : '' }));
                      if (endFieldErrors.followUp) setEndFieldErrors((prev) => ({ ...prev, followUp: '' }));
                      setFollowUpPickerOpen(false);
                    }}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {endFieldErrors.followUp && (
                <p className="text-xs text-destructive">{endFieldErrors.followUp}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Quotation number</Label>
              <Input
                placeholder="Optional"
                value={endForm.quotationNumber ?? ''}
                onChange={(e) => setEndForm((f) => ({ ...f, quotationNumber: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Quotation status</Label>
              <Select
                value={endForm.quotationStatus ?? '_none'}
                onValueChange={(value) =>
                  setEndForm((f) => ({ ...f, quotationStatus: value === '_none' ? undefined : value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="z-[10001]">
                  {QUOTATION_STATUS_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="size-4 shrink-0" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Sales value (optional)</Label>
              <div className="flex gap-2">
                <Select
                  value={endForm.salesCurrency ?? 'ZAR'}
                  onValueChange={(v) => setEndForm((f) => ({ ...f, salesCurrency: v }))}
                >
                  <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[10001]">
                    {CURRENCY_OPTIONS.map((o) => {
                      const Icon = o.icon;
                      return (
                        <SelectItem key={o.value} value={o.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="size-4 shrink-0" />
                            {o.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  className="flex-1"
                  placeholder="0"
                  value={endForm.salesValue ?? ''}
                  onChange={(e) =>
                    setEndForm((f) => ({ ...f, salesValue: e.target.value ? Number(e.target.value) : undefined }))
                  }
                />
              </div>
            </div>

            {/* Method of contact */}
            <div className="grid gap-2 sm:col-span-2">
              <Label>Method of contact</Label>
              <Select
                value={endForm.methodOfContact ?? '_none'}
                onValueChange={(value) =>
                  setEndForm((f) => ({
                    ...f,
                    methodOfContact: value === '_none' ? undefined : (value as MethodOfContact),
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent className="z-[10001]">
                  <SelectItem value="_none">Select method</SelectItem>
                  {METHOD_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="size-4 shrink-0" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Site type */}
            <div className="grid gap-2 sm:col-span-2">
              <Label>Site type</Label>
              <Select
                value={endForm.buildingType ?? '_none'}
                onValueChange={(value) =>
                  setEndForm((f) => ({ ...f, buildingType: value === '_none' ? undefined : value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select site type" />
                </SelectTrigger>
                <SelectContent className="z-[10001]">
                  <SelectItem value="_none">Select site type</SelectItem>
                  {SITE_TYPE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="size-4 shrink-0" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Contact made */}
            <div className="grid gap-2 sm:col-span-2 flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Contact made</Label>
                <p className="text-sm text-muted-foreground">Whether contact was made during the visit</p>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="end-contact-made"
                  checked={endForm.contactMade ?? true}
                  onCheckedChange={(checked) => setEndForm((f) => ({ ...f, contactMade: !!checked }))}
                />
                <label htmlFor="end-contact-made" className="text-sm cursor-pointer">
                  {endForm.contactMade ?? true ? 'Yes' : 'No'}
                </label>
              </div>
            </div>

            {/* Media (images / files) */}
            <div className="grid gap-2 sm:col-span-2">
              <Label>Media (images / files)</Label>
              <input
                ref={mediaFileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                multiple
                className="hidden"
                onChange={handleMediaFilesSelect}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => mediaFileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="size-4" />
                  Add files
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Input
                  placeholder="Or add URL"
                  value={mediaUrlInput}
                  onChange={(e) => setMediaUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMediaUrl())}
                  className="max-w-xs"
                />
                <Button type="button" variant="outline" size="sm" onClick={addMediaUrl}>
                  Add URL
                </Button>
              </div>
              {(mediaFiles.length > 0 || mediaUrls.length > 0) && (
                <ul className="text-sm space-y-1 mt-1">
                  {mediaFiles.map((f, i) => (
                    <li key={`file-${i}`} className="flex items-center gap-2">
                      <span className="truncate">{f.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 shrink-0"
                        onClick={() => setMediaFiles((prev) => prev.filter((_, j) => j !== i))}
                      >
                        <XIcon className="size-3" />
                      </Button>
                    </li>
                  ))}
                  {mediaUrls.map((url, i) => (
                    <li key={`url-${i}`} className="flex items-center gap-2">
                      <span className="truncate max-w-[200px]" title={url}>
                        {url}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 shrink-0"
                        onClick={() => setMediaUrls((prev) => prev.filter((_, j) => j !== i))}
                      >
                        <XIcon className="size-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Optional photo: only for Physical visits */}
            {showPhotoInEndModal ? (
              <div className="grid gap-2 sm:col-span-2">
                <Label>Photo (optional)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleEndPhotoSelect}
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={triggerFileInput} className="gap-2">
                    <Upload className="size-4" />
                    Choose from device
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.setAttribute('capture', 'environment');
                        fileInputRef.current.click();
                      }
                    }}
                    className="gap-2"
                  >
                    <Camera className="size-4" />
                    Camera
                  </Button>
                </div>
                {endPhotoPreview && (
                  <div className="mt-2">
                    <img
                      src={endPhotoPreview}
                      alt="Selected"
                      className="max-h-32 rounded-md border object-cover"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-1"
                      onClick={() => {
                        setEndPhotoFile(null);
                        setEndPhotoPreview(null);
                      }}
                    >
                      Remove photo
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
          <DialogFooter className="gap-3">
            <Button variant="cancel" className="rounded-full" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="success"
              className="rounded-full"
              onClick={submitEndVisit}
              disabled={checkOutMutation.isPending}
            >
              {checkOutMutation.isPending && <Loader2Icon className="size-4 animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      
  );
}

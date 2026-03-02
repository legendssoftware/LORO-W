'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@clerk/nextjs';
import { format, startOfDay, endOfDay, subDays, isSameDay, differenceInCalendarDays } from 'date-fns';
import {
  useCheckIns,
  useCheckInStatus,
  useCheckInMutation,
  useCheckOutMutation,
  useClients,
  useUsers,
  useTokenReady,
  useSessionSync,
} from '@/api/hooks';
import type { ClientListItem, ClientAddress } from '@/api/endpoints/clients';
import type { MethodOfContact, CreateCheckInPayload, CreateCheckOutPayload } from '@/api/types/visits';
import { visitListItemToExportItem } from '@/lib/utils/visits-export';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MapPin, Camera, Upload, Phone, MessageCircle, Mail, Map as MapIcon, List, Smartphone } from 'lucide-react';
import { CalendarIcon, ChevronDownIcon, DownloadIcon, Loader2Icon, XIcon } from '@/lib/icons';
import { VisitsTable } from '@/components/visits-table/visits-table';
const VisitsMap = dynamic(
  () => import('@/components/visits-table/visits-map').then((m) => m.VisitsMap),
  { ssr: false }
);
import type { VisitExportItem } from '@/api/types/reports';
import {
  getRegionGroupKey,
  exportVisits,
  visitToExportRow,
} from '@/lib/utils/visits-export';
import { TYPE_OF_BUSINESS_OPTIONS, CURRENCY_OPTIONS } from '@/lib/visit-form-utils';
import { validateEndVisitFormWithZodFieldErrors } from '@/lib/schemas/visit-schemas';
import { useVisitsStore } from '@/store/visits-store';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const NOTES_MAX_WORDS = 2500;
const NOTES_MAX_LENGTH = NOTES_MAX_WORDS * 15; // ~15 chars per word

/** Returns true if the client has at least one non-empty address field. */
function hasAddress(addr?: ClientAddress): boolean {
  if (!addr) return false;
  const { street, suburb, city, state, country, postalCode } = addr;
  return [street, suburb, city, state, country, postalCode].some(
    (v) => typeof v === 'string' && v.trim() !== ''
  );
}

const METHOD_OPTIONS: { value: MethodOfContact; label: string }[] = [
  { value: 'Physical', label: 'Physical' },
  { value: 'Telephone', label: 'Telephone' },
  { value: 'Email', label: 'Email' },
  { value: 'Whatsapp', label: 'WhatsApp' },
];

/** Site type options (BuildingType); value matches server enum. */
const SITE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'office', label: 'Office' },
  { value: 'home', label: 'Home' },
  { value: 'shop', label: 'Shop' },
  { value: 'garage', label: 'Garage' },
  { value: 'factory', label: 'Factory' },
  { value: 'construction', label: 'Construction' },
  { value: 'residential-apartment', label: 'Residential apartment' },
  { value: 'other-business', label: 'Other business' },
  { value: 'other', label: 'Other' },
];

/** Quotation status options (match server OrderStatus). */
const QUOTATION_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '_none', label: 'None' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_internal', label: 'Pending internal' },
  { value: 'pending_client', label: 'Pending client' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'sourcing', label: 'Sourcing' },
  { value: 'packing', label: 'Packing' },
  { value: 'in_fulfillment', label: 'In fulfillment' },
  { value: 'paid', label: 'Paid' },
  { value: 'outfordelivery', label: 'Out for delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'returned', label: 'Returned' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'postponed', label: 'Postponed' },
  { value: 'inprogress', label: 'In progress' },
  { value: 'pending', label: 'Pending' },
];

/** Position of the person seen (dropdown options). */
const PERSON_POSITION_OPTIONS: { value: string; label: string }[] = [
  { value: 'Owner', label: 'Owner' },
  { value: 'Buyer', label: 'Buyer' },
  { value: 'Receptionist', label: 'Receptionist' },
];

function getVisitStatusLabel(method: string | null | undefined): string {
  if (!method) return 'On a visit – end when done.';
  const lower = method.toLowerCase();
  if (lower === 'telephone') return 'On a telephone visit – end when done.';
  if (lower === 'whatsapp') return 'On a WhatsApp visit – end when done.';
  if (lower === 'email') return 'On an email visit – end when done.';
  return 'On a physical visit – end when done.';
}

function getVisitMethodIcon(method: string | null | undefined) {
  if (!method) return MapPin;
  const m = method.toLowerCase();
  if (m === 'telephone') return Phone;
  if (m === 'whatsapp') return MessageCircle;
  if (m === 'email') return Mail;
  return MapPin;
}

function getDefaultLocation(): string {
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    return ''; // will be filled by geolocation
  }
  return '-34.6037,150.7794'; // fallback
}

function formatElapsed(ms: number): string {
  if (!ms || ms < 0 || !Number.isFinite(ms)) return '00:00:00';
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
  ].join(':');
}

const today = new Date();

/** Isolated timer so only this component re-renders every second, not the whole page. */
function VisitElapsedTimer({ visitStartTime }: { visitStartTime: string }) {
  const [elapsedTimer, setElapsedTimer] = useState('00:00:00');
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTimer(formatElapsed(Date.now() - new Date(visitStartTime).getTime()));
    }, 1000);
    return () => clearInterval(interval);
  }, [visitStartTime]);
  return (
    <span className="text-4xl font-semibold tabular-nums text-foreground">
      {elapsedTimer}
    </span>
  );
}

export function VisitsContent() {
  const { isLoaded: authLoaded } = useAuth();
  const { isTokenReady } = useTokenReady();
  useSessionSync();

  const {
    startDate,
    endDate,
    useAllTime,
    selectedRegion,
    selectedBusinessType,
    selectedUserUid,
    searchQuery,
    dateRangePopoverOpen,
    setDateRangePopoverOpen,
    setStartDate,
    selectEndDateAndClose,
    resetDateRangeToDefault,
    methodModalOpen,
    setMethodModalOpen,
    endVisitOpen,
    setEndVisitOpen,
    followUpPickerOpen,
    setFollowUpPickerOpen,
    selectedMethod,
    setSelectedMethod,
    selectedClient,
    setSelectedClient,
    clientSearch,
    setClientSearch,
    setUseAllTime,
    setSelectedRegion,
    setSelectedBusinessType,
    setSelectedUserUid,
    setSearchQuery,
    viewMode,
    setViewMode,
  } = useVisitsStore();

  const [exportLoading, setExportLoading] = useState(false);
  const [endForm, setEndForm] = useState<Partial<CreateCheckOutPayload>>({
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
    businessType: undefined,
    methodOfContact: undefined,
    buildingType: undefined,
  });
  const [endPhotoFile, setEndPhotoFile] = useState<File | null>(null);
  const [endPhotoPreview, setEndPhotoPreview] = useState<string | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [endFieldErrors, setEndFieldErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);
  const originalClientRef = useRef<ClientListItem | null>(null);
  const mounted = authLoaded && isTokenReady;

  const clientsQuery = useClients({
    enabled: endVisitOpen,
    limit: 100,
    search: clientSearch.trim() || undefined,
  });
  const clientsFromApi: ClientListItem[] = clientsQuery.data ?? [];
  /** Include selected client in list when search would otherwise hide them (so Select value stays valid). */
  const clientsList: ClientListItem[] = useMemo(() => {
    if (!selectedClient) return clientsFromApi;
    const inList = clientsFromApi.some((c) => c.uid === selectedClient.uid);
    return inList ? clientsFromApi : [selectedClient, ...clientsFromApi];
  }, [clientsFromApi, selectedClient]);

  const usersQuery = useUsers({ limit: 200, enabled: mounted });
  const usersList = usersQuery.data ?? [];

  const statusQuery = useCheckInStatus({ enabled: mounted });
  const checkInsQuery = useCheckIns(
    {
      ...(useAllTime
        ? {}
        : {
            startDate: startOfDay(startDate).toISOString(),
            endDate: endOfDay(endDate).toISOString(),
          }),
      ...(selectedUserUid ? { userUid: selectedUserUid } : {}),
    },
    { enabled: mounted }
  );
  const checkInMutation = useCheckInMutation();
  const checkOutMutation = useCheckOutMutation();

  const checkedIn = statusQuery.data?.checkedIn === true;
  /** Stable reference: only changes when query data changes, not on every render (avoids map recentering on timer tick). */
  const checkIns = useMemo(
    () => (checkInsQuery.data?.checkIns ?? []).map(visitListItemToExportItem),
    [checkInsQuery.data]
  );

  const uniqueRegions = useMemo(() => {
    const set = new Set<string>();
    for (const c of checkIns) {
      set.add(getRegionGroupKey(c));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [checkIns]);

  const businessTypeLabelMap = useMemo(
    () => new Map(TYPE_OF_BUSINESS_OPTIONS.map((o) => [o.value, o.label])),
    []
  );

  const uniqueBusinessTypes = useMemo(() => {
    const set = new Set<string>();
    for (const c of checkIns) {
      set.add(c.businessType ?? 'Not set');
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [checkIns]);

  const filteredCheckIns = useMemo(() => {
    let list = checkIns;
    if (selectedRegion) {
      list = list.filter((c) => getRegionGroupKey(c) === selectedRegion);
    }
    if (selectedBusinessType) {
      list = list.filter((c) => {
        const bt = c.businessType ?? 'Not set';
        return bt === selectedBusinessType;
      });
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => {
      const ownerName = c.owner
        ? [c.owner.name, (c.owner as { surname?: string }).surname].filter(Boolean).join(' ')
        : '';
      const searchable = [
        ownerName,
        c.owner?.email,
        c.owner?.phone,
        c.contactFullName,
        c.companyName,
        c.notes,
        c.resolution,
        c.contactCellPhone,
        c.contactLandline,
        c.contactEmail,
        c.businessType,
        c.personSeenPosition,
        c.quotationNumber,
        c.followUp,
        c.lead?.name,
        c.client?.name,
        c.branch?.name,
        c.organisation?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const rowText = visitToExportRow(c).join(' ').toLowerCase();
      return searchable.includes(q) || rowText.includes(q);
    });
  }, [checkIns, searchQuery, selectedRegion, selectedBusinessType]);

  const activeVisit = useMemo(
    () => checkIns.find((c) => !c.checkOutTime) ?? null,
    [checkIns]
  );
  const showPhotoInEndModal = activeVisit?.methodOfContact === 'Physical';

  const visitStartTime = useMemo(() => {
    if (!activeVisit?.checkInTime) return null;
    const raw = activeVisit.checkInTime;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : raw;
  }, [activeVisit]);

  const handleExport = (exportFormat: 'csv' | 'excel' | 'pdf') => {
    if (filteredCheckIns.length === 0) {
      toast.error('No visits to export');
      return;
    }
    setExportLoading(true);
    try {
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');
      const baseName = useAllTime
        ? 'visits-all-time'
        : `visits-${startStr}-${endStr}`;
      exportVisits(filteredCheckIns, exportFormat, baseName);
      toast.success('Export downloaded');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Export failed';
      toast.error(msg);
    } finally {
      setExportLoading(false);
    }
  };

  const openMethodModal = () => setMethodModalOpen(true);
  const closeMethodModal = () => {
    setMethodModalOpen(false);
    setSelectedMethod(null);
  };

  const startVisit = async () => {
    if (!selectedMethod) {
      toast.error('Please select a method of visit');
      return;
    }
    let location = getDefaultLocation();
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        location = `${pos.coords.latitude},${pos.coords.longitude}`;
      } catch {
        location = '-34.6037,150.7794';
      }
    }
    const payload: CreateCheckInPayload = {
      checkInTime: new Date().toISOString(),
      checkInLocation: location,
      checkInPhoto: undefined,
      methodOfContact: selectedMethod,
      ...(selectedMethod === 'Telephone' && { buildingType: 'other' }),
    };
    try {
      await checkInMutation.mutateAsync(payload);
      toast.success('Visit started');
      closeMethodModal();
      statusQuery.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to start visit');
    }
  };

  const openEndVisit = () => {
    setFollowUpPickerOpen(false);
    setSelectedClient(null);
    setClientSearch('');
    setEndVisitOpen(true);
    originalClientRef.current = null;
    setEndForm({
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
      businessType: activeVisit?.businessType ?? undefined,
      methodOfContact: (activeVisit?.methodOfContact as MethodOfContact) ?? undefined,
      buildingType: activeVisit?.buildingType ?? undefined,
      contactAddress: undefined,
    });
    setEndPhotoFile(null);
    setEndPhotoPreview(null);
    setMediaFiles([]);
    setMediaUrls([]);
    setMediaUrlInput('');
    setEndFieldErrors({});
  };

  const handleEndPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setEndPhotoFile(file);
      const url = URL.createObjectURL(file);
      setEndPhotoPreview(url);
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
    setEndForm((prev) => ({
      ...prev,
      client: undefined,
    }));
  }

  const submitEndVisit = async () => {
    const { fieldErrors: errs, firstMessage } = validateEndVisitFormWithZodFieldErrors(endForm as Record<string, unknown>);
    if (firstMessage) {
      setEndFieldErrors(errs);
      toast.error(firstMessage);
      return;
    }
    const stillCheckedIn = await statusQuery.refetch().then((r) => r.data?.checkedIn === true);
    if (!stillCheckedIn) {
      toast.error('You have already ended this visit');
      setEndVisitOpen(false);
      return;
    }
    let location = getDefaultLocation();
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        location = `${pos.coords.latitude},${pos.coords.longitude}`;
      } catch {
        location = '-34.6037,150.7794';
      }
    }
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
      if (trimmedLandline !== ((orig.alternativePhone as string) ?? '')) changed.alternativePhone = trimmedLandline;
      if (trimmedEmail !== (orig.email ?? '')) changed.email = trimmedEmail;

      const origAddr = orig.address ?? {};
      const formAddr = endForm.contactAddress;
      if (
        formAddr &&
        (
          (formAddr.street ?? '') !== (origAddr.street ?? '') ||
          (formAddr.suburb ?? '') !== (origAddr.suburb ?? '') ||
          (formAddr.city ?? '') !== (origAddr.city ?? '') ||
          (formAddr.state ?? '') !== (origAddr.state ?? '') ||
          (formAddr.country ?? '') !== (origAddr.country ?? '') ||
          (formAddr.postalCode ?? '') !== (origAddr.postalCode ?? '')
        )
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
      // If you have an upload endpoint, upload here and set payload.checkOutPhoto = url.
      // For now we leave it optional (no photo sent).
    }
    try {
      await checkOutMutation.mutateAsync(payload);
      originalClientRef.current = null;
      toast.success('Visit ended');
      setEndVisitOpen(false);
      statusQuery.refetch();
      checkInsQuery.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to end visit');
    }
  };

  return (
    <div className="container mx-auto  px-2 py-8 sm:px-6 flex flex-col gap-6 w-full">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Visits</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Start or end a visit and view your visit history.
        </p>
      </div>

      {/* Start or End visit: prominent status block (green when ready, red when on visit) */}
      <div className="flex w-full flex-col items-center gap-4">
        {checkedIn && visitStartTime && (
          <div className="flex w-full max-w-md flex-col items-center gap-1">
            <VisitElapsedTimer visitStartTime={visitStartTime} />
          </div>
        )}
        <div
          className={cn(
            'w-full rounded-xl border-2 p-4 sm:p-6',
            checkedIn
              ? 'border-red-600 bg-red-600/10'
              : 'border-green-600 bg-green-600/10'
          )}
        >
          {checkedIn ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-base font-medium text-foreground sm:text-lg">
                {getVisitStatusLabel(activeVisit?.methodOfContact)}
              </p>
              <Button
                onClick={openEndVisit}
                className="gap-2 min-h-14 w-full border-0 bg-red-600 px-6 text-lg text-white hover:bg-red-700 sm:w-auto"
                size="lg"
              >
                {(() => {
                  const Icon = getVisitMethodIcon(activeVisit?.methodOfContact);
                  return <Icon className="size-4" />;
                })()}
                End visit
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-base font-medium text-foreground sm:text-lg">
                Ready to start a visit.
              </p>
              <Button
                onClick={openMethodModal}
                className="gap-2 min-h-14 w-full border-0 bg-green-600 px-6 text-lg text-white hover:bg-green-700 sm:w-auto"
                size="lg"
              >
                <MapPin className="size-4" />
                Start visit
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Method-of-visit modal: open directly when user clicks Start visit */}
      <Dialog open={methodModalOpen} onOpenChange={(open) => !open && closeMethodModal()}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Start visit</DialogTitle>
            <DialogDescription>Choose how you are conducting this visit.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <p className="text-sm font-medium">Method of visit</p>
            <div className="grid grid-cols-2 gap-2">
              {METHOD_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMethod(opt.value)}
                  className={
                    selectedMethod === opt.value
                      ? 'border-purple-600 bg-purple-600 text-white hover:bg-purple-700 hover:text-white'
                      : undefined
                  }
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            <DialogFooter className="gap-3">
              <Button variant="cancel" onClick={closeMethodModal}>
                Cancel
              </Button>
              <Button
                variant="success"
                onClick={startVisit}
                disabled={checkInMutation.isPending || !selectedMethod}
              >
                {checkInMutation.isPending && <Loader2Icon className="size-4 animate-spin" />}
                Start visit
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* End visit modal: form + optional photo */}
      <Dialog open={endVisitOpen} onOpenChange={setEndVisitOpen}>
        <DialogContent
          className="sm:max-w-2xl max-h-[90vh] overflow-y-auto z-[10000]"
          overlayClassName="z-[10000]"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>End visit</DialogTitle>
            <DialogDescription>Add visit details and optionally a photo.</DialogDescription>
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
                  {TYPE_OF_BUSINESS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* 2. Client (optional) */}
            <div className="grid gap-2 sm:col-span-2">
              <Label>Client (optional)</Label>
              <Input
                placeholder="Search clients..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="mb-1"
              />
              <Select
                value={selectedClient ? String(selectedClient.uid) : '_none'}
                onValueChange={(value) => {
                  if (value === '_none') {
                    clearClientSelection();
                    return;
                  }
                  const client = clientsList.find((c) => c.uid === Number(value));
                  if (client) applyClientToForm(client);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select client if you visited an existing client" />
                </SelectTrigger>
                <SelectContent className="z-[10001]">
                  <SelectItem value="_none">No client</SelectItem>
                  {clientsQuery.isLoading ? (
                    <SelectItem value="_loading" disabled>
                      Loading…
                    </SelectItem>
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
                        <SelectItem key={c.uid} value={String(c.uid)}>
                          <div className="flex w-full items-center justify-between gap-2 min-w-0">
                            <span className="truncate min-w-0 flex-1 max-w-[75%]">{displayLabel}</span>
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
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
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
                  {PERSON_POSITION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
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
                  {QUOTATION_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
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
                    {CURRENCY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.value}</SelectItem>
                    ))}
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
                  {METHOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
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
                  {SITE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
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
          <DialogFooter>
            <Button variant="cancel" onClick={() => setEndVisitOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={submitEndVisit}
              disabled={checkOutMutation.isPending}
            >
              {checkOutMutation.isPending && <Loader2Icon className="size-4 animate-spin" />}
              End visit
            </Button>
        </DialogContent>
      </Dialog>

      {/* Visit history: date range, region, business type, user, search, export */}
      <section>
        <h2 className="text-lg font-medium text-foreground mb-4">Visit history</h2>
        <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-0">
              <Popover open={dateRangePopoverOpen} onOpenChange={setDateRangePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 min-w-[140px] bg-white border-gray-200 text-foreground justify-center gap-2"
                  >
                    <CalendarIcon className="size-4" />
                    {useAllTime
                      ? 'All time'
                      : startDate.getTime() === endDate.getTime()
                        ? format(startDate, 'MMM d, yyyy')
                        : `${format(startDate, 'MMM d, yyyy')} – ${format(endDate, 'MMM d, yyyy')}`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto min-w-[480px] p-0 z-[10001]" align="start">
                  <div className="p-2 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={useAllTime ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setUseAllTime(true)}
                      >
                        All time
                      </Button>
                      <span className="text-xs text-muted-foreground">or pick a date range below</span>
                    </div>
                    <div className="flex flex-row gap-6">
                      <div>
                        <p className="text-sm font-medium">Start date</p>
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(d) => {
                            if (d) {
                              setUseAllTime(false);
                              setStartDate(d);
                            }
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium">End date</p>
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={(d) => {
                            if (d) selectEndDateAndClose(d);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              {(() => {
                const isDefaultRange =
                  !useAllTime && isSameDay(endDate, today) && differenceInCalendarDays(endDate, startDate) === 30;
                return useAllTime || !isDefaultRange ? (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      resetDateRangeToDefault();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        resetDateRangeToDefault();
                      }
                    }}
                    className="shrink-0 rounded p-0.5 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-red-600 cursor-pointer ml-0.5"
                    aria-label="Reset to last 30 days"
                  >
                    <XIcon className="size-4 text-red-600" />
                  </span>
                ) : null;
              })()}
            </div>
            <Select
              value={selectedRegion || 'all'}
              onValueChange={(v) => setSelectedRegion(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="h-9 min-w-[140px] w-[200px] bg-white border-gray-200 text-foreground">
                <SelectValue placeholder="All regions" />
              </SelectTrigger>
              <SelectContent className="z-[10001]">
                <SelectItem value="all">All regions</SelectItem>
                {uniqueRegions.map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedBusinessType || 'all'}
              onValueChange={(v) => setSelectedBusinessType(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="h-9 min-w-[140px] w-[200px] bg-white border-gray-200 text-foreground">
                <SelectValue placeholder="All business types" />
              </SelectTrigger>
              <SelectContent className="z-[10001]">
                <SelectItem value="all">All business types</SelectItem>
                {uniqueBusinessTypes.map((bt) => (
                  <SelectItem key={bt} value={bt}>
                    {bt === 'Not set' ? 'Not set' : businessTypeLabelMap.get(bt) ?? bt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedUserUid || 'all'}
              onValueChange={(v) => setSelectedUserUid(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="h-9 min-w-[140px] w-[200px] bg-white border-gray-200 text-foreground">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent className="z-[10001]">
                <SelectItem value="all">All users</SelectItem>
                {usersList.map((u) => (
                  <SelectItem key={u.uid} value={String(u.uid)}>
                    {[u.name, u.surname].filter(Boolean).join(' ').trim() || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-nowrap items-center gap-2">
            <Button
              variant={viewMode === 'map' ? 'default' : 'outline'}
              size="sm"
              className="h-9 bg-white border-gray-200 text-foreground gap-1.5 shrink-0"
              onClick={() => setViewMode(viewMode === 'map' ? 'table' : 'map')}
            >
              {viewMode === 'map' ? (
                <>
                  <List className="size-4" />
                  View table
                </>
              ) : (
                <>
                  <MapIcon className="size-4" />
                  View on map
                </>
              )}
            </Button>
            <div className="relative w-56 min-w-0 shrink sm:w-64">
              <Input
                placeholder="Search visits…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  'w-full bg-white border-gray-200 text-foreground placeholder:text-gray-700 focus:outline-none focus:ring-0 focus-visible:ring-0 h-9',
                  searchQuery && 'pr-8'
                )}
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-red-600"
                  aria-label="Clear search"
                >
                  <XIcon className="size-4 text-red-600" />
                </button>
              ) : null}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 bg-white border-gray-200 text-foreground gap-1.5"
                  disabled={exportLoading || checkInsQuery.isLoading || filteredCheckIns.length === 0}
                >
                  {exportLoading ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <DownloadIcon className="size-4" />
                  )}
                  Export
                  <ChevronDownIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[10rem] z-[9999]">
                <DropdownMenuLabel className="text-muted-foreground font-normal">
                  Export filtered visits
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('csv')}>CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')}>Excel</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {viewMode === 'table' ? (
          <VisitsTable
            checkIns={filteredCheckIns}
            isLoading={checkInsQuery.isLoading}
            emptyMessage={checkIns.length === 0 ? 'No visits yet. Start a visit to see it here.' : 'No visits match your search.'}
            onVisitUpdated={() => checkInsQuery.refetch()}
          />
        ) : (
          <div className="min-h-[500px] h-[70vh] overflow-hidden flex flex-col">
            <VisitsMap visits={filteredCheckIns} className="flex-1 min-h-0" />
          </div>
        )}
      </section>
    </div>
  );
}

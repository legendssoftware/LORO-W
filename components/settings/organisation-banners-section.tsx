'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  ImageIcon,
  Plus,
  RefreshCw,
  Save,
  Smartphone,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useApiClient } from '@/api/hooks/use-api-client';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import {
  deleteOrganisationBanner,
  getOrganisationBanners,
  patchActiveOrganisationBanners,
  patchOrganisationBanner,
  postConfirmOrganisationBanners,
  postOrganisationBanner,
  postPreviewOrganisationBanners,
} from '@/api/endpoints/organisation-banner';
import { getShopBanners } from '@/api/endpoints/shop';
import type {
  BannerSuggestion,
  CreateOrganisationBannerBody,
  OrganisationBannerRecord,
} from '@/api/types/organisation-banner';
import { settingsOrgBannersKey } from '@/api/query-keys/settings';
import { LogoField } from '@/components/settings/logo-field';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  BANNER_SCHEDULE_FILTERS,
  bannerScheduleFilterLabel,
  bannerScheduleStatusLabel,
  defaultEndsAtIso,
  fromDateTimeLocalValue,
  getBannerScheduleLabel,
  getBannerScheduleStatus,
  toDateTimeLocalValue,
  type BannerScheduleFilter,
  type BannerScheduleStatus,
} from '@/lib/banner-schedule';

const PANEL_CLASS = 'rounded-xl border border-border bg-card shadow-sm';
const DAILY_AI_LIMIT = 5;

const BANNER_CATEGORIES = [
  { value: 'news', label: 'News' },
  { value: 'promotions', label: 'Promotions' },
  { value: 'events', label: 'Events' },
  { value: 'blog', label: 'Blog' },
  { value: 'other', label: 'Other' },
] as const;

function emptyBannerBody(): CreateOrganisationBannerBody {
  return {
    title: '',
    subtitle: '',
    description: '',
    image: '',
    category: 'promotions',
    isPublished: true,
    startsAt: new Date().toISOString(),
    endsAt: null,
  };
}

function recordToForm(record: OrganisationBannerRecord): CreateOrganisationBannerBody {
  return {
    title: record.title,
    subtitle: record.subtitle,
    description: record.description,
    image: record.image,
    category: record.category,
    isPublished: record.isPublished,
    startsAt: record.startsAt ?? new Date().toISOString(),
    endsAt: record.endsAt,
  };
}

function formToPreviewRecord(form: CreateOrganisationBannerBody, uid = 0): OrganisationBannerRecord {
  return {
    uid,
    title: form.title,
    subtitle: form.subtitle,
    description: form.description,
    image: form.image,
    category: form.category,
    isPublished: form.isPublished ?? true,
    isAiGenerated: false,
    sourceNewsUid: null,
    carouselOrder: null,
    startsAt: form.startsAt ?? null,
    endsAt: form.endsAt ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function validateBannerForm(form: CreateOrganisationBannerBody): string | null {
  if (!form.title.trim()) return 'Title is required';
  if (!form.subtitle.trim()) return 'Subtitle is required';
  if (!form.description.trim()) return 'Description is required';
  if (!form.image.trim()) return 'Image URL or upload is required';
  if (!form.category.trim()) return 'Category is required';
  if (!form.startsAt) return 'Start time is required';
  const start = new Date(form.startsAt);
  if (Number.isNaN(start.getTime())) return 'Start time is invalid';
  if (form.endsAt) {
    const end = new Date(form.endsAt);
    if (Number.isNaN(end.getTime())) return 'End time is invalid';
    if (end <= start) return 'End time must be after start time';
  }
  return null;
}

function scheduleStatusBadge(status: BannerScheduleStatus) {
  switch (status) {
    case 'live':
      return <Badge className="bg-green-600">{bannerScheduleStatusLabel(status)}</Badge>;
    case 'scheduled':
      return <Badge variant="secondary">{bannerScheduleStatusLabel(status)}</Badge>;
    case 'ended':
      return <Badge variant="outline">{bannerScheduleStatusLabel(status)}</Badge>;
    case 'hidden':
      return <Badge variant="outline">{bannerScheduleStatusLabel(status)}</Badge>;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function carouselSlotBadge(status: BannerScheduleStatus, rank: number) {
  switch (status) {
    case 'live':
      return <Badge className="bg-violet-600">Active #{rank}</Badge>;
    case 'scheduled':
      return <Badge className="bg-violet-600">Queued #{rank}</Badge>;
    case 'ended':
      return <Badge variant="outline">Slot #{rank}</Badge>;
    case 'hidden':
      return <Badge variant="outline">Slot #{rank}</Badge>;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function OrganisationBannersSection() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const { isTokenReady } = useTokenReady();
  const { backendUserData } = useSessionSync();
  const orgRef = backendUserData?.organisationRef ?? '';
  const enabled = Boolean(orgRef) && isTokenReady;

  const [editingUid, setEditingUid] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState<CreateOrganisationBannerBody>(() => emptyBannerBody());
  const [previewBanner, setPreviewBanner] = useState<OrganisationBannerRecord | null>(null);
  const [deleteUid, setDeleteUid] = useState<number | null>(null);
  const [draftActiveUids, setDraftActiveUids] = useState<number[]>([]);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiTheme, setAiTheme] = useState('sales');
  const [aiCount, setAiCount] = useState(DAILY_AI_LIMIT);
  const [aiSuggestions, setAiSuggestions] = useState<BannerSuggestion[]>([]);
  const [listFilter, setListFilter] = useState<BannerScheduleFilter>('all');

  const bannersQuery = useQuery({
    queryKey: settingsOrgBannersKey(orgRef),
    queryFn: () => getOrganisationBanners(client, orgRef),
    enabled,
  });

  const liveAppQuery = useQuery({
    queryKey: ['shop', 'banners', 'live'],
    queryFn: () => getShopBanners(client),
    enabled,
    staleTime: 1000 * 60,
  });

  const banners = bannersQuery.data?.banners ?? [];
  const aiGeneratedToday = bannersQuery.data?.aiGeneratedToday ?? 0;
  const liveInAppUids = bannersQuery.data?.liveInAppUids ?? [];
  const aiRemaining = Math.max(0, DAILY_AI_LIMIT - aiGeneratedToday);

  useEffect(() => {
    setDraftActiveUids(liveInAppUids);
  }, [liveInAppUids.join(',')]);

  const invalidateBanners = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: settingsOrgBannersKey(orgRef) }),
      queryClient.invalidateQueries({ queryKey: ['shop', 'banners', 'live'] }),
    ]);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const validationError = validateBannerForm(form);
      if (validationError) throw new Error(validationError);
      if (editingUid === 'new') {
        return postOrganisationBanner(client, orgRef, form);
      }
      if (typeof editingUid === 'number') {
        return patchOrganisationBanner(client, orgRef, editingUid, form);
      }
      throw new Error('No banner selected');
    },
    onSuccess: async (result) => {
      toast.success(result.message);
      await invalidateBanners();
      setEditingUid(null);
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to save banner'),
  });

  const publishMut = useMutation({
    mutationFn: ({ uid, isPublished }: { uid: number; isPublished: boolean }) =>
      patchOrganisationBanner(client, orgRef, uid, { isPublished }),
    onSuccess: async (result) => {
      toast.success(result.message);
      await invalidateBanners();
    },
    onError: () => toast.error('Failed to update publish status'),
  });

  const deleteMut = useMutation({
    mutationFn: (uid: number) => deleteOrganisationBanner(client, orgRef, uid),
    onSuccess: async (result, uid) => {
      toast.success(result.message);
      await invalidateBanners();
      if (editingUid === uid) setEditingUid(null);
      setDeleteUid(null);
      setDraftActiveUids((prev) => prev.filter((id) => id !== uid));
    },
    onError: () => toast.error('Failed to delete banner'),
  });

  const activeMut = useMutation({
    mutationFn: (uids: number[]) => patchActiveOrganisationBanners(client, orgRef, { uids }),
    onSuccess: async (result) => {
      toast.success(result.message);
      setDraftActiveUids(result.liveInAppUids);
      await invalidateBanners();
    },
    onError: () => toast.error('Failed to update active carousel'),
  });

  const previewAiMut = useMutation({
    mutationFn: () =>
      postPreviewOrganisationBanners(client, orgRef, {
        count: Math.min(aiCount, aiRemaining || aiCount),
        theme: aiTheme,
      }),
    onSuccess: (result) => {
      if (result.suggestions.length === 0) {
        toast.error(result.message || 'No suggestions generated');
        return;
      }
      setAiSuggestions(
        result.suggestions.map((s) => ({ ...s, selected: true }))
      );
      toast.success(result.message);
    },
    onError: () => toast.error('Failed to generate AI previews'),
  });

  const confirmAiMut = useMutation({
    mutationFn: () => {
      const selected = aiSuggestions.filter((s) => s.selected);
      if (selected.length === 0) throw new Error('Select at least one banner to save');
      return postConfirmOrganisationBanners(client, orgRef, { suggestions: selected });
    },
    onSuccess: async (result) => {
      toast.success(result.message);
      await invalidateBanners();
      setAiDialogOpen(false);
      setAiSuggestions([]);
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to save AI banners'),
  });

  const liveInAppSet = useMemo(() => new Set(draftActiveUids), [draftActiveUids]);

  const publishedBanners = useMemo(
    () => banners.filter((b) => b.isPublished),
    [banners]
  );

  const bannersAvailableToAdd = useMemo(
    () => publishedBanners.filter((banner) => !liveInAppSet.has(banner.uid)),
    [publishedBanners, liveInAppSet]
  );

  const filteredBanners = useMemo(() => {
    if (listFilter === 'all') return banners;
    return banners.filter((banner) => getBannerScheduleStatus(banner) === listFilter);
  }, [banners, listFilter]);

  const formError = useMemo(() => {
    if (editingUid === null) return null;
    return validateBannerForm(form);
  }, [editingUid, form]);

  const activeDirty = useMemo(() => {
    if (draftActiveUids.length !== liveInAppUids.length) return true;
    return draftActiveUids.some((uid, i) => uid !== liveInAppUids[i]);
  }, [draftActiveUids, liveInAppUids]);

  function startCreate() {
    setForm(emptyBannerBody());
    setEditingUid('new');
  }

  function startEdit(record: OrganisationBannerRecord) {
    setForm(recordToForm(record));
    setEditingUid(record.uid);
  }

  function openFormPreview() {
    const validationError = validateBannerForm(form);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setPreviewBanner(formToPreviewRecord(form, typeof editingUid === 'number' ? editingUid : 0));
  }

  function liveAppRank(uid: number): number | null {
    const index = draftActiveUids.indexOf(uid);
    return index >= 0 ? index + 1 : null;
  }

  function toggleActive(uid: number) {
    setDraftActiveUids((prev) => {
      if (prev.includes(uid)) {
        return prev.filter((id) => id !== uid);
      }
      return [...prev, uid];
    });
  }

  function moveSlot(slotIndex: number, direction: -1 | 1) {
    setDraftActiveUids((prev) => {
      const nextIndex = slotIndex + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(slotIndex, 1);
      next.splice(nextIndex, 0, moved);
      return next;
    });
  }

  function removeSlot(slotIndex: number) {
    setDraftActiveUids((prev) => prev.filter((_, index) => index !== slotIndex));
  }

  function appendBanner(uid: string) {
    const bannerUid = Number(uid);
    if (!Number.isFinite(bannerUid)) return;
    setDraftActiveUids((prev) => (prev.includes(bannerUid) ? prev : [...prev, bannerUid]));
  }

  function openAiDialog() {
    setAiTheme('sales');
    setAiCount(Math.max(1, aiRemaining));
    setAiSuggestions([]);
    setAiDialogOpen(true);
  }

  function updateSuggestion(index: number, patch: Partial<BannerSuggestion>) {
    setAiSuggestions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );
  }

  return (
    <div className={PANEL_CLASS} data-tour="settings-active-panel">
      <div className="px-6 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-medium">
              <ImageIcon className="size-5" />
              App banners &amp; news
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage carousel banners shown in the mobile app. Every published banner you add can play
              in Home and Sales, in the order below. Position 1 plays first. New published banners that
              are already in their play window enter position 1 automatically.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              AI saved today: {aiGeneratedToday}/{DAILY_AI_LIMIT}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                void bannersQuery.refetch();
                void liveAppQuery.refetch();
              }}
              disabled={bannersQuery.isFetching}
            >
              <RefreshCw className={`mr-2 size-4 ${bannersQuery.isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={openAiDialog}
              disabled={aiRemaining <= 0}
            >
              <Sparkles className="mr-2 size-4" />
              Generate with AI
            </Button>
            <Button type="button" size="sm" onClick={startCreate}>
              <Plus className="mr-2 size-4" />
              New banner
            </Button>
          </div>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Active carousel selection */}
      <div className="space-y-3 px-6 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Smartphone className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Active carousel (mobile app)</h3>
            <Badge variant="outline">
              {draftActiveUids.length} active
            </Badge>
          </div>
          {activeDirty ? (
            <Button
              type="button"
              size="sm"
              onClick={() => activeMut.mutate(draftActiveUids)}
              disabled={activeMut.isPending}
            >
              <Save className="mr-2 size-4" />
              {activeMut.isPending ? 'Saving…' : 'Save active selection'}
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Add as many published banners as you need. Position 1 appears first in Home and Sales.
          Scheduled banners stay in this order and go live automatically at their start time.
        </p>

        <div className="flex gap-3 overflow-x-auto pb-2">
          {draftActiveUids.map((uid, slotIndex) => {
            const banner = banners.find((b) => b.uid === uid);
            const slotStatus = banner ? getBannerScheduleStatus(banner) : null;
            return (
              <Card key={uid} className="w-52 shrink-0 overflow-hidden">
                <div className="flex items-center justify-between gap-1 border-b bg-muted/40 px-2 py-1">
                  <Badge className="bg-violet-600">#{slotIndex + 1}</Badge>
                  <div className="flex items-center gap-0.5">
                    {slotStatus ? scheduleStatusBadge(slotStatus) : null}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-6"
                      aria-label={`Remove banner ${slotIndex + 1}`}
                      onClick={() => removeSlot(slotIndex)}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                </div>
                {banner?.image ? (
                  <img src={banner.image} alt="" className="h-20 w-full object-cover" />
                ) : (
                  <div className="flex h-20 items-center justify-center bg-muted text-xs text-muted-foreground">
                    Missing banner
                  </div>
                )}
                <div className="space-y-2 p-2">
                  <p className="line-clamp-2 text-xs font-medium">
                    {banner?.title ?? `Banner #${uid}`}
                  </p>
                  {banner ? (
                    <>
                      <p className="line-clamp-1 text-xs text-muted-foreground">{banner.subtitle}</p>
                      <p className="line-clamp-2 text-[11px] text-muted-foreground">
                        {getBannerScheduleLabel(banner)}
                      </p>
                    </>
                  ) : null}
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 flex-1 px-2"
                      disabled={slotIndex === 0}
                      aria-label={`Move banner ${slotIndex + 1} earlier`}
                      onClick={() => moveSlot(slotIndex, -1)}
                    >
                      <ChevronLeft className="size-3" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 flex-1 px-2"
                      disabled={slotIndex === draftActiveUids.length - 1}
                      aria-label={`Move banner ${slotIndex + 1} later`}
                      onClick={() => moveSlot(slotIndex, 1)}
                    >
                      <ChevronRight className="size-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}

          <Card className="flex w-52 shrink-0 flex-col justify-between overflow-hidden">
            <div className="flex items-center gap-1 border-b bg-muted/40 px-2 py-1">
              <Badge variant="outline">Add</Badge>
            </div>
            <div className="flex flex-1 flex-col justify-center gap-2 p-3">
              <p className="text-xs text-muted-foreground">
                Append a published banner to the end of the carousel.
              </p>
              <Select
                key={draftActiveUids.join(',') || 'none'}
                onValueChange={appendBanner}
                disabled={bannersAvailableToAdd.length === 0}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue
                    placeholder={
                      bannersAvailableToAdd.length === 0 ? 'All published added' : 'Add banner'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {bannersAvailableToAdd.map((banner) => {
                    const status = getBannerScheduleStatus(banner);
                    return (
                      <SelectItem key={banner.uid} value={String(banner.uid)}>
                        {banner.title} ({bannerScheduleStatusLabel(status)})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </Card>
        </div>
      </div>

      <Separator className="my-6" />

      {/* All banners CRUD list */}
      <div className="space-y-4 px-6 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-medium">All banners</h3>
          <ToggleGroup
            type="single"
            value={listFilter}
            onValueChange={(value) => {
              if (BANNER_SCHEDULE_FILTERS.includes(value as BannerScheduleFilter)) {
                setListFilter(value as BannerScheduleFilter);
              }
            }}
            variant="outline"
            size="sm"
            aria-label="Filter banners by schedule status"
          >
            {BANNER_SCHEDULE_FILTERS.map((filter) => (
              <ToggleGroupItem key={filter} value={filter} className="px-3">
                {bannerScheduleFilterLabel(filter)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        {bannersQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading banners…</p>
        ) : bannersQuery.isError ? (
          <p className="text-sm text-destructive">
            Failed to load banners. Check your connection and try Refresh.
          </p>
        ) : banners.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No banners yet. Generate AI suggestions or create one manually.
          </p>
        ) : filteredBanners.length === 0 ? (
          <p className="text-sm text-muted-foreground">No banners match this filter.</p>
        ) : (
          filteredBanners.map((banner) => {
            const rank = liveAppRank(banner.uid);
            const isActive = liveInAppSet.has(banner.uid);
            const status = getBannerScheduleStatus(banner);
            return (
              <Card key={banner.uid} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{banner.title}</h3>
                      {banner.isAiGenerated ? <Badge variant="secondary">AI generated</Badge> : null}
                      {scheduleStatusBadge(status)}
                      {isActive && rank ? carouselSlotBadge(status, rank) : null}
                      <Badge variant="outline">{banner.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{banner.subtitle}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{getBannerScheduleLabel(banner)}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{banner.description}</p>
                    {banner.sourceNewsUid ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Linked news article #{banner.sourceNewsUid}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <Switch
                        id={`publish-${banner.uid}`}
                        checked={banner.isPublished}
                        disabled={publishMut.isPending}
                        onCheckedChange={(checked) =>
                          publishMut.mutate({ uid: banner.uid, isPublished: checked })
                        }
                      />
                      <Label htmlFor={`publish-${banner.uid}`} className="text-xs">
                        Published
                      </Label>
                      {banner.isPublished ? (
                        <Button
                          type="button"
                          size="sm"
                          variant={isActive ? 'secondary' : 'outline'}
                          className="h-7 text-xs"
                          onClick={() => toggleActive(banner.uid)}
                        >
                          {isActive ? 'Remove from carousel' : 'Add to carousel'}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {banner.image ? (
                    <img src={banner.image} alt="" className="h-16 w-28 rounded-md border object-cover" />
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => setPreviewBanner(banner)}>
                      <Eye className="mr-2 size-4" />
                      Preview
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => startEdit(banner)}>
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteUid(banner.uid)}
                      disabled={deleteMut.isPending}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Create / edit banner dialog */}
      <Dialog
        open={editingUid !== null}
        onOpenChange={(open) => {
          if (!open) setEditingUid(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingUid === 'new' ? 'Create banner' : 'Edit banner'}</DialogTitle>
            {editingUid === 'new' ? (
              <DialogDescription>
                Published banners that are currently in their play window are added at position 1
                when saved. Schedule a future start to plan ahead, then add the banner to the carousel
                so it goes live automatically.
              </DialogDescription>
            ) : null}
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="banner-title">Title</Label>
              <Input
                id="banner-title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Summer Sale"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="banner-subtitle">Subtitle</Label>
              <Input
                id="banner-subtitle"
                value={form.subtitle}
                onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value }))}
                placeholder="e.g. Up to 30% off"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="banner-description">Description</Label>
              <Textarea
                id="banner-description"
                rows={4}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Short banner copy for the app carousel"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {BANNER_CATEGORIES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="banner-published"
                checked={form.isPublished ?? true}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isPublished: checked }))}
              />
              <Label htmlFor="banner-published">Published in mobile app</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="banner-starts-at">Start time</Label>
              <Input
                id="banner-starts-at"
                type="datetime-local"
                value={toDateTimeLocalValue(form.startsAt)}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setForm((prev) => ({ ...prev, startsAt: fromDateTimeLocalValue(e.target.value) }));
                }}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="banner-no-end"
                checked={!form.endsAt}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({
                    ...prev,
                    endsAt: checked ? null : prev.endsAt ?? defaultEndsAtIso(),
                  }))
                }
              />
              <Label htmlFor="banner-no-end">No end date</Label>
            </div>
            {form.endsAt ? (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="banner-ends-at">End time</Label>
                <Input
                  id="banner-ends-at"
                  type="datetime-local"
                  value={toDateTimeLocalValue(form.endsAt)}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      endsAt: e.target.value ? fromDateTimeLocalValue(e.target.value) : null,
                    }))
                  }
                />
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground md:col-span-2">
              Published banners play only inside this window. Add scheduled banners to a carousel slot
              so they go live automatically at start time.
            </p>
          </div>

          <LogoField
            client={client}
            value={form.image}
            onChange={(url) => setForm((prev) => ({ ...prev, image: url }))}
            urlInputId="banner-image"
          />

          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

          <DialogFooter className="flex flex-row justify-end gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={openFormPreview}
              disabled={Boolean(formError)}
            >
              <Eye className="mr-2 size-4" />
              Preview
            </Button>
            <Button
              type="button"
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending || Boolean(formError)}
              className="bg-violet-600 text-white hover:bg-violet-700"
            >
              {saveMut.isPending ? 'Saving…' : 'Save banner'}
            </Button>
            <Button
              type="button"
              onClick={() => setEditingUid(null)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Saved / form preview dialog — phone width, matching the app carousel and detail modal */}
      <Dialog open={Boolean(previewBanner)} onOpenChange={(open) => !open && setPreviewBanner(null)}>
        <DialogContent className="max-h-[90vh] w-[390px] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-[390px]">
          <DialogHeader>
            <DialogTitle>Mobile preview</DialogTitle>
            <DialogDescription>
              Phone-sized carousel and tap dialog, the size reps see in the app.
            </DialogDescription>
          </DialogHeader>
          {previewBanner?.image ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Carousel preview (image only in app)
              </p>
              <div className="h-[336px] w-full overflow-hidden rounded-xl bg-muted">
                <img
                  src={previewBanner.image}
                  alt=""
                  className="size-full object-cover object-center"
                />
              </div>
            </div>
          ) : null}
          {previewBanner ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Dialog preview</p>
              <div className="rounded-2xl bg-black/70 p-3">
                <div className="mx-auto flex h-[min(80dvh,675px)] w-[92%] flex-col overflow-y-auto rounded-2xl bg-background shadow-md">
                  {previewBanner.image ? (
                    <div className="w-full shrink-0 bg-muted">
                      <img
                        src={previewBanner.image}
                        alt=""
                        className="h-auto w-full object-contain object-center"
                      />
                    </div>
                  ) : null}
                  <div className="space-y-2 px-5 pt-5 pb-7">
                    {previewBanner.category ? (
                      <Badge variant="secondary" className="capitalize">
                        {previewBanner.category}
                      </Badge>
                    ) : null}
                    <p className="text-xl font-bold leading-tight">{previewBanner.title}</p>
                    {previewBanner.subtitle ? (
                      <p className="text-base text-muted-foreground">{previewBanner.subtitle}</p>
                    ) : null}
                    {previewBanner.description ? (
                      <p className="text-sm leading-6 text-muted-foreground">
                        {previewBanner.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          {previewBanner ? (
            <div className="space-y-2 border-t pt-3">
              <p className="text-xs text-muted-foreground">{getBannerScheduleLabel(previewBanner)}</p>
              <div className="flex flex-wrap gap-2">
                {scheduleStatusBadge(getBannerScheduleStatus(previewBanner))}
                {previewBanner.uid > 0 && liveInAppSet.has(previewBanner.uid) ? (
                  carouselSlotBadge(
                    getBannerScheduleStatus(previewBanner),
                    liveAppRank(previewBanner.uid) ?? 1
                  )
                ) : null}
                <Badge variant="outline">{previewBanner.category}</Badge>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* AI preview & confirm dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-h-[90vh] w-[80vw] max-w-[80vw] overflow-y-auto sm:max-w-[80vw]">
          <DialogHeader>
            <DialogTitle>Generate banners with AI</DialogTitle>
            <DialogDescription>
              Preview suggestions before saving. Only confirmed banners count toward the daily limit ({aiRemaining} remaining today).
            </DialogDescription>
            <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              Content is AI-generated. Review and edit all suggestions before saving — accuracy is not guaranteed.
            </p>
          </DialogHeader>

          {aiSuggestions.length === 0 ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Input
                  value={aiTheme}
                  onChange={(e) => setAiTheme(e.target.value)}
                  placeholder="e.g. Sales, product launch, end-of-quarter push"
                />
              </div>
              <div className="space-y-2">
                <Label>Count</Label>
                <Select value={String(aiCount)} onValueChange={(v) => setAiCount(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: Math.max(1, aiRemaining) }).map((_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {aiSuggestions.map((suggestion, index) => (
                <Card key={index} className="p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Checkbox
                      id={`ai-select-${index}`}
                      checked={suggestion.selected ?? false}
                      onCheckedChange={(checked) =>
                        updateSuggestion(index, { selected: checked === true })
                      }
                    />
                    <Label htmlFor={`ai-select-${index}`} className="text-sm font-medium">
                      Include banner #{index + 1}
                    </Label>
                    <Badge variant="secondary">AI generated</Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {suggestion.image ? (
                      <img src={suggestion.image} alt="" className="h-24 w-full rounded-md border object-cover" />
                    ) : null}
                    <div className="space-y-2">
                      <Input
                        value={suggestion.title}
                        onChange={(e) => updateSuggestion(index, { title: e.target.value })}
                        placeholder="Title"
                      />
                      <Input
                        value={suggestion.subtitle}
                        onChange={(e) => updateSuggestion(index, { subtitle: e.target.value })}
                        placeholder="Subtitle"
                      />
                      <Select
                        value={suggestion.category}
                        onValueChange={(v) => updateSuggestion(index, { category: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BANNER_CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Textarea
                    className="mt-2"
                    rows={2}
                    value={suggestion.description}
                    onChange={(e) => updateSuggestion(index, { description: e.target.value })}
                    placeholder="Description"
                  />
                </Card>
              ))}
            </div>
          )}

          <DialogFooter className="flex flex-row justify-end gap-2 sm:justify-end">
            {aiSuggestions.length > 0 ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAiSuggestions([])}
                >
                  <X className="mr-2 size-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => confirmAiMut.mutate()}
                  disabled={confirmAiMut.isPending || aiSuggestions.filter((s) => s.selected).length === 0}
                  className="bg-violet-600 text-white hover:bg-violet-700"
                >
                  {confirmAiMut.isPending
                    ? 'Saving…'
                    : `Save selected (${aiSuggestions.filter((s) => s.selected).length})`}
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="cancel" onClick={() => setAiDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => previewAiMut.mutate()}
                  disabled={previewAiMut.isPending || aiRemaining <= 0}
                >
                  <Sparkles className="mr-2 size-4" />
                  {previewAiMut.isPending ? 'Generating…' : 'Generate preview'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteUid !== null} onOpenChange={(open) => !open && setDeleteUid(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete banner?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the banner from the mobile app carousel. You can create a new one at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteUid !== null && deleteMut.mutate(deleteUid)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

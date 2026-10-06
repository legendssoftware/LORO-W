'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Plus, Eye, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApiClient } from '@/api/hooks/use-api-client';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import {
  deleteOrganisationNotice,
  getActiveOrganisationNotice,
  getOrganisationNotices,
  patchOrganisationNotice,
  postOrganisationNotice,
} from '@/api/endpoints/organisation-notice';
import {
  DEFAULT_ORGANISATION_NOTICE_THEME,
  type CreateOrganisationNoticeBody,
  type OrganisationNoticeRecord,
  type OrganisationNoticeTheme,
} from '@/api/types/organisation-notice';
import {
  activeOrgNoticeKey,
  settingsOrgNoticesKey,
} from '@/api/query-keys/settings';
import { getNoticeDisplayScheduleLabel, getNoticeStatus } from '@/lib/organisation-notice-content';
import {
  applyNoticeDisplayMode,
  emptyNoticeBody,
  getNoticeDisplayMode,
  normalizeNoticeFormForSave,
  noticeCopyFromForm,
  NOTICE_FORM_PLACEHOLDERS,
  type NoticeCopyFields,
  type NoticeDisplayMode,
} from '@/lib/organisation-notice-form';
import { SalesBenchmarksWelcomeDialog } from '@/components/sales-benchmarks-welcome-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const PANEL_CLASS = 'rounded-xl border border-border bg-card shadow-sm';

function toDateTimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}

function recordToForm(record: OrganisationNoticeRecord): CreateOrganisationNoticeBody {
  return {
    title: record.title,
    subtitle: record.subtitle,
    content: record.content,
    translations: record.translations ?? undefined,
    showFrom: record.showFrom,
    showUntil: record.showUntil,
    theme: record.theme ?? DEFAULT_ORGANISATION_NOTICE_THEME,
    isEnabled: record.isEnabled,
  };
}

function statusBadge(status: ReturnType<typeof getNoticeStatus>) {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-600">Active</Badge>;
    case 'scheduled':
      return <Badge variant="secondary">Scheduled</Badge>;
    case 'expired':
      return <Badge variant="outline">Expired</Badge>;
    default:
      return <Badge variant="destructive">Disabled</Badge>;
  }
}

export function OrganisationNoticesSection() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const { isTokenReady } = useTokenReady();
  const { backendUserData } = useSessionSync();
  const orgRef = backendUserData?.organisationRef ?? '';
  const enabled = Boolean(orgRef) && isTokenReady;

  const [editingUid, setEditingUid] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState<CreateOrganisationNoticeBody>(() => emptyNoticeBody());
  const [copy, setCopy] = useState<NoticeCopyFields>({ header: '', body: '', footer: '' });
  const [previewNotice, setPreviewNotice] = useState<OrganisationNoticeRecord | null>(null);

  const noticesQuery = useQuery({
    queryKey: settingsOrgNoticesKey(orgRef),
    queryFn: () => getOrganisationNotices(client, orgRef),
    enabled,
  });

  const activeNoticeQuery = useQuery({
    queryKey: activeOrgNoticeKey(orgRef),
    queryFn: () => getActiveOrganisationNotice(client, orgRef),
    enabled,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = normalizeNoticeFormForSave(form, copy);
      if (editingUid === 'new') {
        return postOrganisationNotice(client, orgRef, payload);
      }
      if (typeof editingUid === 'number') {
        return patchOrganisationNotice(client, orgRef, editingUid, payload);
      }
      throw new Error('No notice selected');
    },
    onSuccess: async (result) => {
      toast.success(result.message);
      await queryClient.invalidateQueries({ queryKey: settingsOrgNoticesKey(orgRef) });
      await queryClient.invalidateQueries({ queryKey: activeOrgNoticeKey(orgRef) });
      setEditingUid(null);
    },
    onError: () => toast.error('Failed to save notice'),
  });

  const deleteMut = useMutation({
    mutationFn: (uid: number) => deleteOrganisationNotice(client, orgRef, uid),
    onSuccess: async (result, uid) => {
      toast.success(result.message);
      await queryClient.invalidateQueries({ queryKey: settingsOrgNoticesKey(orgRef) });
      await queryClient.invalidateQueries({ queryKey: activeOrgNoticeKey(orgRef) });
      if (editingUid === uid) setEditingUid(null);
    },
    onError: () => toast.error('Failed to delete notice'),
  });

  const notices = noticesQuery.data?.notices ?? [];

  const previewRecord = useMemo((): OrganisationNoticeRecord | null => {
    if (!previewNotice) return null;
    return previewNotice;
  }, [previewNotice]);

  function startCreate() {
    const next = emptyNoticeBody();
    setForm(next);
    setCopy(noticeCopyFromForm(next));
    setEditingUid('new');
  }

  function startEdit(record: OrganisationNoticeRecord) {
    const next = recordToForm(record);
    setForm(next);
    setCopy(noticeCopyFromForm(next));
    setEditingUid(record.uid);
  }

  function resetToDefault() {
    const activeNotice = activeNoticeQuery.data?.notice;
    const fallbackNotice =
      notices.find((notice) => getNoticeStatus(notice) === 'active') ?? notices[0] ?? null;
    const source = activeNotice ?? fallbackNotice;

    if (!source) {
      toast.error('No notice available to load');
      return;
    }

    const next = recordToForm(source);
    setForm(next);
    setCopy(noticeCopyFromForm(next));
    toast.success('Loaded notice from organisation');
  }

  function openPreview() {
    const normalized = normalizeNoticeFormForSave(form, copy);
    const record: OrganisationNoticeRecord = {
      uid: typeof editingUid === 'number' ? editingUid : 0,
      title: normalized.title,
      subtitle: normalized.subtitle,
      content: normalized.content,
      translations: normalized.translations ?? null,
      showFrom: normalized.showFrom,
      showUntil: normalized.showUntil ?? null,
      theme: normalized.theme ?? DEFAULT_ORGANISATION_NOTICE_THEME,
      isEnabled: normalized.isEnabled ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setPreviewNotice(record);
  }

  return (
    <div className={PANEL_CLASS} data-tour="settings-active-panel">
      <div className="px-6 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-medium">
              <Megaphone className="size-5" />
              Organisation notices
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage the sign-in notice shown on the dashboard. By default each user sees it 3 times.
              Set a date to keep showing it on every sign-in until then.
            </p>
          </div>
          <Button type="button" size="sm" onClick={startCreate}>
            <Plus className="mr-2 size-4" />
            New notice
          </Button>
        </div>
      </div>

      <Separator className="my-6" />

      <div className="space-y-4 px-6 pb-6">
        {noticesQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading notices…</p>
        ) : notices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notices yet.</p>
        ) : (
          notices.map((notice) => (
            <Card key={notice.uid} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{notice.title}</h3>
                    {statusBadge(getNoticeStatus(notice))}
                    {notice.theme === 'policy' ? (
                      <Badge className="bg-amber-500 hover:bg-amber-500">Policy</Badge>
                    ) : (
                      <Badge variant="destructive">Alert</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{notice.subtitle}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {getNoticeDisplayScheduleLabel(notice)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setPreviewNotice(notice)}>
                    <Eye className="mr-2 size-4" />
                    Preview
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => startEdit(notice)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteMut.mutate(notice.uid)}
                    disabled={deleteMut.isPending}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {editingUid !== null ? (
        <>
          <Separator />
          <div className="space-y-6 px-6 py-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">{editingUid === 'new' ? 'Create notice' : 'Edit notice'}</h3>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={resetToDefault}>
                  Reset to default
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={openPreview}>
                  Preview
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="notice-show-from">Show from</Label>
                <Input
                  id="notice-show-from"
                  type="datetime-local"
                  value={toDateTimeLocalValue(form.showFrom)}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, showFrom: fromDateTimeLocalValue(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-3">
                <Label>Display</Label>
                <RadioGroup
                  value={getNoticeDisplayMode(form)}
                  onValueChange={(value) => {
                    const mode: NoticeDisplayMode =
                      value === 'until-date' ? 'until-date' : 'three-times';
                    setForm((prev) => applyNoticeDisplayMode(prev, mode));
                  }}
                  className="gap-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="three-times" id="notice-mode-three" />
                    <Label htmlFor="notice-mode-three" className="font-normal">
                      Show 3 times (default)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="until-date" id="notice-mode-until" />
                    <Label htmlFor="notice-mode-until" className="font-normal">
                      Show until a date
                    </Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  By default each user sees this notice 3 times. Set a date to keep showing it on every
                  sign-in until then.
                </p>
              </div>
              <div className="space-y-3">
                <Label>Colour</Label>
                <RadioGroup
                  value={form.theme ?? DEFAULT_ORGANISATION_NOTICE_THEME}
                  onValueChange={(value) => {
                    const theme: OrganisationNoticeTheme = value === 'policy' ? 'policy' : 'alert';
                    setForm((prev) => ({ ...prev, theme }));
                  }}
                  className="gap-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="alert" id="notice-theme-alert" />
                    <Label htmlFor="notice-theme-alert" className="font-normal">
                      Alert (red)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="policy" id="notice-theme-policy" />
                    <Label htmlFor="notice-theme-policy" className="font-normal">
                      Policy (amber)
                    </Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  Use amber for policy and allowance notices so they stand out from red disciplinary alerts.
                </p>
              </div>
              {form.showUntil ? (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notice-show-until">Show until (last day to show)</Label>
                  <Input
                    id="notice-show-until"
                    type="datetime-local"
                    value={toDateTimeLocalValue(form.showUntil)}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        showUntil: e.target.value ? fromDateTimeLocalValue(e.target.value) : null,
                      }))
                    }
                  />
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="notice-enabled"
                checked={form.isEnabled ?? true}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isEnabled: checked }))}
              />
              <Label htmlFor="notice-enabled">Enabled</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notice-header">Header</Label>
              <Textarea
                id="notice-header"
                rows={3}
                placeholder={NOTICE_FORM_PLACEHOLDERS.header}
                value={copy.header}
                onChange={(e) => setCopy((prev) => ({ ...prev, header: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                The first line is the title. Any further lines are the subtitle.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notice-body">Body</Label>
              <Textarea
                id="notice-body"
                rows={12}
                placeholder={NOTICE_FORM_PLACEHOLDERS.body}
                value={copy.body}
                onChange={(e) => setCopy((prev) => ({ ...prev, body: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Separate paragraphs with a blank line.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notice-footer">Footer</Label>
              <Textarea
                id="notice-footer"
                rows={4}
                placeholder={NOTICE_FORM_PLACEHOLDERS.footer}
                value={copy.footer}
                onChange={(e) => setCopy((prev) => ({ ...prev, footer: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">The last line is the signature.</p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending}
                className="bg-violet-600 text-white hover:bg-violet-700"
              >
                {saveMut.isPending ? 'Saving…' : 'Save notice'}
              </Button>
              <Button
                type="button"
                onClick={() => setEditingUid(null)}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Cancel
              </Button>
            </div>
          </div>
        </>
      ) : null}

      <SalesBenchmarksWelcomeDialog
        previewNotice={previewRecord}
        forceOpen={Boolean(previewRecord)}
        onPreviewClose={() => setPreviewNotice(null)}
      />
    </div>
  );
}

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
import type {
  CreateOrganisationNoticeBody,
  OrganisationNoticeRecord,
} from '@/api/types/organisation-notice';
import {
  activeOrgNoticeKey,
  settingsOrgNoticesKey,
} from '@/api/query-keys/settings';
import { getNoticeStatus } from '@/lib/organisation-notice-content';
import {
  arrayToLines,
  emptyNoticeBody,
  linesToArray,
  normalizeNoticeFormForSave,
  NOTICE_FORM_PLACEHOLDERS,
  NOTICE_SECTION_LABELS,
  updateSection,
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
      const payload = normalizeNoticeFormForSave(form);
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
    setForm(emptyNoticeBody());
    setEditingUid('new');
  }

  function startEdit(record: OrganisationNoticeRecord) {
    setForm(recordToForm(record));
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

    setForm(recordToForm(source));
    toast.success('Loaded notice from organisation');
  }

  function openPreview() {
    const normalized = normalizeNoticeFormForSave(form);
    const record: OrganisationNoticeRecord = {
      uid: typeof editingUid === 'number' ? editingUid : 0,
      title: normalized.title,
      subtitle: normalized.subtitle,
      content: normalized.content,
      translations: normalized.translations ?? null,
      showFrom: normalized.showFrom,
      showUntil: normalized.showUntil ?? null,
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
              Manage the sign-in notice shown to users on the dashboard. Schedule when it appears and when it stops.
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
                  </div>
                  <p className="text-sm text-muted-foreground">{notice.subtitle}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Show from {new Date(notice.showFrom).toLocaleString()}
                    {notice.showUntil ? ` until ${new Date(notice.showUntil).toLocaleString()}` : ' (no end date)'}
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
                <Label htmlFor="notice-title">Title</Label>
                <Input
                  id="notice-title"
                  placeholder={NOTICE_FORM_PLACEHOLDERS.title}
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notice-subtitle">Subtitle</Label>
                <Input
                  id="notice-subtitle"
                  placeholder={NOTICE_FORM_PLACEHOLDERS.subtitle}
                  value={form.subtitle}
                  onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value }))}
                />
              </div>
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
              <div className="space-y-2">
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
              <Label htmlFor="notice-greeting">Greeting</Label>
              <Input
                id="notice-greeting"
                placeholder={NOTICE_FORM_PLACEHOLDERS.greeting}
                value={form.content.greeting}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    content: { ...prev.content, greeting: e.target.value },
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notice-intro">Intro paragraphs (one per line)</Label>
              <Textarea
                id="notice-intro"
                rows={8}
                placeholder={NOTICE_FORM_PLACEHOLDERS.introParagraphs}
                value={arrayToLines(form.content.introParagraphs)}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    content: {
                      ...prev.content,
                      introParagraphs: linesToArray(e.target.value),
                    },
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notice-emphasis-intro">Emphasis intro</Label>
              <Textarea
                id="notice-emphasis-intro"
                rows={2}
                placeholder={NOTICE_FORM_PLACEHOLDERS.emphasisIntro}
                value={form.content.emphasisIntro}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    content: { ...prev.content, emphasisIntro: e.target.value },
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notice-emphasis-bullets">Emphasis bullets (one per line)</Label>
              <Textarea
                id="notice-emphasis-bullets"
                rows={10}
                placeholder={NOTICE_FORM_PLACEHOLDERS.emphasisBullets}
                value={arrayToLines(form.content.emphasisBullets)}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    content: {
                      ...prev.content,
                      emphasisBullets: linesToArray(e.target.value),
                    },
                  }))
                }
              />
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">Body sections</h4>
              {form.content.sections.map((section, index) => (
                <Card key={`section-${index}`} className="space-y-3 p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    {NOTICE_SECTION_LABELS[index] ?? `Section ${index + 1}`}
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor={`section-title-${index}`}>Section title (optional)</Label>
                    <Input
                      id={`section-title-${index}`}
                      placeholder={NOTICE_FORM_PLACEHOLDERS.sectionTitle}
                      value={section.title ?? ''}
                      onChange={(e) =>
                        setForm((prev) =>
                          updateSection(prev, index, {
                            title: e.target.value || undefined,
                          })
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`section-intro-${index}`}>Section intro (optional)</Label>
                    <Textarea
                      id={`section-intro-${index}`}
                      rows={2}
                      placeholder={NOTICE_FORM_PLACEHOLDERS.sectionIntro}
                      value={section.intro ?? ''}
                      onChange={(e) =>
                        setForm((prev) =>
                          updateSection(prev, index, {
                            intro: e.target.value || undefined,
                          })
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`section-paragraphs-${index}`}>Paragraphs (one per line)</Label>
                    <Textarea
                      id={`section-paragraphs-${index}`}
                      rows={6}
                      placeholder={NOTICE_FORM_PLACEHOLDERS.sectionParagraphs}
                      value={arrayToLines(section.paragraphs)}
                      onChange={(e) =>
                        setForm((prev) =>
                          updateSection(prev, index, {
                            paragraphs: linesToArray(e.target.value),
                          })
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`section-bullets-${index}`}>Bullets (one per line, optional)</Label>
                    <Textarea
                      id={`section-bullets-${index}`}
                      rows={6}
                      placeholder={NOTICE_FORM_PLACEHOLDERS.sectionBullets}
                      value={arrayToLines(section.bullets)}
                      onChange={(e) =>
                        setForm((prev) =>
                          updateSection(prev, index, {
                            bullets: linesToArray(e.target.value),
                          })
                        )
                      }
                    />
                  </div>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notice-closing">Closing lines (one per line)</Label>
                <Textarea
                  id="notice-closing"
                  rows={4}
                  placeholder={NOTICE_FORM_PLACEHOLDERS.closingParagraphs}
                  value={arrayToLines(form.content.closingParagraphs)}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      content: {
                        ...prev.content,
                        closingParagraphs: linesToArray(e.target.value),
                      },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notice-closing-signature">Closing signature</Label>
                <Input
                  id="notice-closing-signature"
                  placeholder={NOTICE_FORM_PLACEHOLDERS.closingSignature}
                  value={form.content.closingSignature}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      content: { ...prev.content, closingSignature: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notice-acknowledge">Acknowledge button label</Label>
                <Input
                  id="notice-acknowledge"
                  placeholder={NOTICE_FORM_PLACEHOLDERS.acknowledgeLabel}
                  value={form.content.acknowledgeLabel}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      content: { ...prev.content, acknowledgeLabel: e.target.value },
                    }))
                  }
                />
              </div>
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

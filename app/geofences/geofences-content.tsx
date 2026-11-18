'use client';

import { useState } from 'react';
import { useSessionSync, useTokenReady } from '@/api/hooks';
import type { GeofenceArea } from '@/api/endpoints/geofences';
import { useDeleteGeofenceMutation, useGeofenceEvents, useGeofences, useSaveGeofenceMutation } from '@/api/hooks/use-geofences';
import { FeatureDenied, FeatureShell } from '@/components/feature-page';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { canAccessGeofences, canEditGeofences } from '@/lib/access';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import toast from 'react-hot-toast';

export function GeofencesContent() {
  const { isTokenReady } = useTokenReady();
  const { isSyncing: isLoading, backendUserData } = useSessionSync();
  const ready = isTokenReady && !isLoading;
  const canEdit = canEditGeofences(backendUserData?.accessLevel);
  const list = useGeofences({ enabled: ready });
  const save = useSaveGeofenceMutation();
  const remove = useDeleteGeofenceMutation();
  const [selected, setSelected] = useState<GeofenceArea | null>(null);
  const [form, setForm] = useState({ name: '', latitude: '', longitude: '', radius: '500' });
  const events = useGeofenceEvents(selected?.uid ?? selected?.ref ?? null, { enabled: selected != null });
  const rows = list.data ?? [];

  if (ready && !canAccessGeofences(backendUserData?.accessLevel)) return <FeatureDenied title="Geofences" />;

  function openNew() {
    setForm({ name: '', latitude: '', longitude: '', radius: '500' });
    setSelected({ name: '', latitude: 0, longitude: 0, radius: 500 });
  }

  return (
    <>
      <FeatureShell
        tourId="geofences"
        title="Geofences"
        description="Create areas and review entry events. The same areas draw on Competitor Overview."
        actions={canEdit ? <Button type="button" onClick={openNew}>New area</Button> : undefined}
        isLoading={!ready || list.isLoading}
        isError={list.isError}
        error={list.error}
        onRetry={() => void list.refetch()}
        isEmpty={rows.length === 0 && selected == null}
        emptyMessage="No geofence areas yet."
      >
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Radius</TableHead><TableHead>Location</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={String(row.uid ?? row.ref ?? row.name)} className="cursor-pointer" onClick={() => {
                setSelected(row);
                setForm({ name: row.name, latitude: String(row.latitude), longitude: String(row.longitude), radius: String(row.radius) });
              }}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.radius} m</TableCell>
                <TableCell>{row.latitude}, {row.longitude}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </FeatureShell>
      <Dialog open={selected != null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selected?.uid || selected?.ref ? 'Area' : 'New area'}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Label htmlFor="geo-name">Name</Label>
            <Input id="geo-name" value={form.name} disabled={!canEdit} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <Label htmlFor="geo-lat">Latitude</Label>
            <Input id="geo-lat" value={form.latitude} disabled={!canEdit} onChange={(event) => setForm((current) => ({ ...current, latitude: event.target.value }))} />
            <Label htmlFor="geo-lng">Longitude</Label>
            <Input id="geo-lng" value={form.longitude} disabled={!canEdit} onChange={(event) => setForm((current) => ({ ...current, longitude: event.target.value }))} />
            <Label htmlFor="geo-radius">Radius (m)</Label>
            <Input id="geo-radius" value={form.radius} disabled={!canEdit} onChange={(event) => setForm((current) => ({ ...current, radius: event.target.value }))} />
            <p className="text-sm text-muted-foreground">
              {events.isLoading ? 'Loading events…' : events.isError ? 'Could not load events.' : `${events.data?.length ?? 0} entry events.`}
            </p>
          </div>
          {canEdit ? (
            <DialogFooter>
              {selected?.uid || selected?.ref ? (
                <Button type="button" variant="destructive" onClick={() => {
                  const ref = selected?.uid ?? selected?.ref;
                  if (ref == null) return;
                  void remove.mutateAsync(ref).then(() => { toast.success('Area deleted'); setSelected(null); }, (error: unknown) => toast.error(getQueryErrorMessage(error, 'Could not delete')));
                }}>Delete</Button>
              ) : null}
              <Button type="button" onClick={() => {
                void save.mutateAsync({
                  ref: selected?.uid ?? selected?.ref,
                  name: form.name,
                  latitude: Number(form.latitude),
                  longitude: Number(form.longitude),
                  radius: Number(form.radius),
                }).then(() => { toast.success('Area saved'); setSelected(null); }, (error: unknown) => toast.error(getQueryErrorMessage(error, 'Could not save')));
              }}>Save</Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

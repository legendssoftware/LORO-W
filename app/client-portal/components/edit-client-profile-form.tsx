'use client';

import { useState } from 'react';
import type { ClientProfileData, UpdateClientProfilePayload } from '@/api/types/client-portal';
import { useUpdateClientProfile } from '@/api/hooks/use-update-client-profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FORM_PLACEHOLDERS } from '@/lib/form-placeholders';
import toast from 'react-hot-toast';

export function EditClientProfileForm({
  client,
  onSaved,
}: {
  client: ClientProfileData;
  onSaved?: () => void;
}) {
  const mutation = useUpdateClientProfile();
  const [form, setForm] = useState<UpdateClientProfilePayload>({
    contactPerson: client.contactPerson ?? '',
    phone: client.phone ?? '',
    alternativePhone: client.alternativePhone ?? '',
    website: client.website ?? '',
    description: client.description ?? '',
    industry: client.industry ?? '',
    address: client.address,
    socialMedia: client.socialMedia,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate(form, {
      onSuccess: () => {
        toast.success('Profile updated');
        onSaved?.();
      },
      onError: () => toast.error('Failed to update profile'),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Edit profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Contact person">
            <Input
              value={form.contactPerson ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
              placeholder={FORM_PLACEHOLDERS.fullName}
            />
          </Field>
          <Field label="Phone">
            <Input
              value={form.phone ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder={FORM_PLACEHOLDERS.landline}
            />
          </Field>
          <Field label="Alternative phone">
            <Input
              value={form.alternativePhone ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, alternativePhone: e.target.value }))}
              placeholder={FORM_PLACEHOLDERS.phone}
            />
          </Field>
          <Field label="Website">
            <Input
              value={form.website ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              placeholder={FORM_PLACEHOLDERS.website}
            />
          </Field>
          <Field label="Industry">
            <Input
              value={form.industry ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
              placeholder="e.g. Construction"
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Brief description of your business"
            />
          </Field>
          <Field label="Street">
            <Input
              value={form.address?.street ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  address: { ...f.address, street: e.target.value },
                }))
              }
              placeholder={FORM_PLACEHOLDERS.street}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City">
              <Input
                value={form.address?.city ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    address: { ...f.address, city: e.target.value },
                  }))
                }
                placeholder={FORM_PLACEHOLDERS.city}
              />
            </Field>
            <Field label="Postal code">
              <Input
                value={form.address?.postalCode ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    address: { ...f.address, postalCode: e.target.value },
                  }))
                }
                placeholder={FORM_PLACEHOLDERS.postalCode}
              />
            </Field>
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

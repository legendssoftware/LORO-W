'use client';

import type { Control } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PERSONNEL_DETAILS_GROUPS } from '@/lib/user-form/personnel-fields';
import type { UserFormValues } from '@/lib/user-form';
import { PersonnelFieldGrid } from '@/components/personnel-field-grid';

export function PersonnelDetailsCard({ control }: { control: Control<UserFormValues> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm sm:text-base">Personnel details</CardTitle>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Identity, address, medical, emergency, banking, tax, and insurance from the personnel form.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {PERSONNEL_DETAILS_GROUPS.map((group) => (
          <section key={group.title} className="space-y-3">
            <h3 className="text-sm font-medium">{group.title}</h3>
            <PersonnelFieldGrid control={control} prefix="profile" fields={group.fields} />
          </section>
        ))}
      </CardContent>
    </Card>
  );
}

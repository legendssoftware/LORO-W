'use client';

import type { Control } from 'react-hook-form';
import { PERSONNEL_DETAILS_GROUPS } from '@/lib/user-form/personnel-fields';
import type { UserFormValues } from '@/lib/user-form';
import { PersonnelFieldGrid } from '@/components/personnel-field-grid';
import {
  CollapsibleFormGroup,
  CollapsibleFormSection,
} from '@/components/collapsible-form-section';

export function PersonnelDetailsCard({ control }: { control: Control<UserFormValues> }) {
  return (
    <CollapsibleFormSection
      title="Personnel details"
      description="Identity, address, medical, emergency, banking, tax, and insurance from the personnel form."
      contentClassName="space-y-6"
    >
      {PERSONNEL_DETAILS_GROUPS.map((group) => (
        <CollapsibleFormGroup key={group.title} title={group.title}>
          <PersonnelFieldGrid control={control} prefix="profile" fields={group.fields} />
        </CollapsibleFormGroup>
      ))}
    </CollapsibleFormSection>
  );
}

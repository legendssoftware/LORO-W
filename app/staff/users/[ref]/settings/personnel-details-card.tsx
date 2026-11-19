'use client';

import type { Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { PERSONNEL_DETAILS_GROUPS } from '@/lib/user-form/personnel-fields';
import type { UserFormValues } from '@/lib/user-form';
import { PersonnelFieldGrid } from '@/components/personnel-field-grid';
import {
  CollapsibleFormGroup,
  CollapsibleFormSection,
} from '@/components/collapsible-form-section';

const GROUP_TITLE_KEYS: Record<string, string> = {
  Identity: 'identity',
  Sizes: 'sizes',
  'Education and languages': 'educationAndLanguages',
  Address: 'address',
  Medical: 'medical',
  'Emergency contacts': 'emergencyContacts',
  Dependants: 'dependants',
  Banking: 'banking',
  Tax: 'tax',
  Insurance: 'insurance',
};

export function PersonnelDetailsCard({ control }: { control: Control<UserFormValues> }) {
  const { t } = useTranslation('screens');
  return (
    <CollapsibleFormSection
      title={t('chrome.staff.settings.sections.personnelDetails')}
      description={t('chrome.staff.settings.sections.personnelDetailsDesc')}
      contentClassName="space-y-6"
    >
      {PERSONNEL_DETAILS_GROUPS.map((group) => {
        const key = GROUP_TITLE_KEYS[group.title];
        const translatedTitle = key
          ? t(`chrome.staff.settings.personnelGroups.${key}`, { defaultValue: group.title })
          : group.title;
        return (
          <CollapsibleFormGroup key={group.title} title={translatedTitle}>
            <PersonnelFieldGrid control={control} prefix="profile" fields={group.fields} />
          </CollapsibleFormGroup>
        );
      })}
    </CollapsibleFormSection>
  );
}

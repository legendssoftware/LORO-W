'use client';

import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguagePreference } from '@/components/i18n-provider';
import { isLanguageChoice, LANGUAGE_CHOICES } from '@/lib/i18n/resolve-locale';

export function LanguageSwitcher({ id }: { id?: string }) {
  const { preference, setPreference } = useLanguagePreference();
  const { t } = useTranslation('common');
  const value = isLanguageChoice(preference) ? preference : 'auto';

  return (
    <Select value={value} onValueChange={setPreference}>
      <SelectTrigger id={id} aria-label={t('language')} size="sm" className="w-[6.25rem]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGE_CHOICES.map((choice) => (
          <SelectItem key={choice.value} value={choice.value}>
            {choice.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

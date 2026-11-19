import { createInstance, type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18N_NAMESPACES, resources } from './resources';
import type { UiLocale } from './resolve-locale';

export function createAppI18n(locale: UiLocale): I18nInstance {
  const instance = createInstance();
  instance.use(initReactI18next);
  void instance.init({
    resources,
    lng: locale,
    fallbackLng: 'en',
    ns: [...I18N_NAMESPACES],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return instance;
}

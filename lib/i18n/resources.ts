import commonEn from '../../messages/en/common.json';
import navEn from '../../messages/en/nav.json';
import authEn from '../../messages/en/auth.json';
import settingsEn from '../../messages/en/settings.json';
import portalEn from '../../messages/en/portal.json';
import staffEn from '../../messages/en/staff.json';
import marketingEn from '../../messages/en/marketing.json';
import screensEn from '../../messages/en/screens.json';
import commonPt from '../../messages/pt/common.json';
import navPt from '../../messages/pt/nav.json';
import authPt from '../../messages/pt/auth.json';
import settingsPt from '../../messages/pt/settings.json';
import portalPt from '../../messages/pt/portal.json';
import staffPt from '../../messages/pt/staff.json';
import marketingPt from '../../messages/pt/marketing.json';
import screensPt from '../../messages/pt/screens.json';
import commonFr from '../../messages/fr/common.json';
import navFr from '../../messages/fr/nav.json';
import authFr from '../../messages/fr/auth.json';
import settingsFr from '../../messages/fr/settings.json';
import portalFr from '../../messages/fr/portal.json';
import staffFr from '../../messages/fr/staff.json';
import marketingFr from '../../messages/fr/marketing.json';
import screensFr from '../../messages/fr/screens.json';
import commonEs from '../../messages/es/common.json';
import navEs from '../../messages/es/nav.json';
import authEs from '../../messages/es/auth.json';
import settingsEs from '../../messages/es/settings.json';
import portalEs from '../../messages/es/portal.json';
import staffEs from '../../messages/es/staff.json';
import marketingEs from '../../messages/es/marketing.json';
import screensEs from '../../messages/es/screens.json';

export const resources = {
  en: { common: commonEn, nav: navEn, auth: authEn, settings: settingsEn, portal: portalEn, staff: staffEn, marketing: marketingEn, screens: screensEn },
  pt: { common: commonPt, nav: navPt, auth: authPt, settings: settingsPt, portal: portalPt, staff: staffPt, marketing: marketingPt, screens: screensPt },
  fr: { common: commonFr, nav: navFr, auth: authFr, settings: settingsFr, portal: portalFr, staff: staffFr, marketing: marketingFr, screens: screensFr },
  es: { common: commonEs, nav: navEs, auth: authEs, settings: settingsEs, portal: portalEs, staff: staffEs, marketing: marketingEs, screens: screensEs },
} as const;

export const I18N_NAMESPACES = Object.keys(resources.en);

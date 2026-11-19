'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { I18nextProvider } from 'react-i18next';
import type { i18n as I18nInstance } from 'i18next';
import { usePatchUserPreferences, useUserPreferences } from '@/api/hooks/use-user';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { createAppI18n } from '@/lib/i18n/create-i18n';
import { LANGUAGE_PREFERENCE_KEY, writeLocaleCookie } from '@/lib/i18n/cookie';
import { deviceLocalesFromTags, resolveUiLocale, type UiLocale } from '@/lib/i18n/resolve-locale';

const PENDING_KEY = 'loro-language-pending';

type LanguagePreferenceContextValue = {
  preference: string;
  setPreference: (next: string) => void;
};

const LanguagePreferenceContext = createContext<LanguagePreferenceContextValue | null>(null);

export function useLanguagePreference(): LanguagePreferenceContextValue {
  const value = useContext(LanguagePreferenceContext);
  if (!value) {
    throw new Error('useLanguagePreference must be used within I18nProvider');
  }
  return value;
}

function deviceLocales() {
  if (typeof navigator === 'undefined') return [];
  return deviceLocalesFromTags(navigator.languages);
}

function readStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(key) ?? null;
}

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: UiLocale;
  children: ReactNode;
}) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const [instance] = useState(() => createAppI18n(initialLocale));
  const [preference, setPreferenceState] = useState<string>(initialLocale);
  const userLocked = useRef(false);
  const applied = useRef<string | null>(null);
  const { backendUserData, error: sessionError } = useSessionSync();
  const ref = backendUserData?.uid != null ? String(backendUserData.uid) : null;
  const prefs = useUserPreferences(ref);
  const patch = usePatchUserPreferences(ref);
  const patchRef = useRef(patch);
  patchRef.current = patch;

  const commit = useCallback(
    (next: string, persist: boolean, i18n: I18nInstance) => {
      const resolved = resolveUiLocale(next, deviceLocales());
      window.localStorage.setItem(LANGUAGE_PREFERENCE_KEY, next);
      writeLocaleCookie(resolved);
      document.documentElement.lang = resolved;
      void i18n.changeLanguage(resolved);
      setPreferenceState(next);
      if (persist && ref) {
        patchRef.current.mutate({ language: next });
      }
      if (resolved !== initialLocale) {
        router.refresh();
      }
    },
    [initialLocale, ref, router],
  );

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && !backendUserData && !sessionError) return;
    if (ref && !prefs.isFetched) return;

    const pending = readStorage(PENDING_KEY);
    const server = prefs.data?.preferences?.language;
    if (pending && server === pending) {
      window.sessionStorage.removeItem(PENDING_KEY);
    }
    if (userLocked.current && !pending) return;

    const stored = window.localStorage.getItem(LANGUAGE_PREFERENCE_KEY);
    const next = pending ?? (ref ? (server ?? 'auto') : (stored ?? 'auto'));
    const resolved = resolveUiLocale(next, deviceLocales());
    const signature = `${next}:${resolved}`;
    if (applied.current === signature) return;
    applied.current = signature;
    if (userLocked.current) return;
    commit(next, false, instance);
  }, [
    backendUserData,
    commit,
    instance,
    isLoaded,
    isSignedIn,
    prefs.data?.preferences?.language,
    prefs.isFetched,
    ref,
    sessionError,
  ]);

  const setPreference = useCallback(
    (next: string) => {
      userLocked.current = true;
      window.sessionStorage.setItem(PENDING_KEY, next);
      applied.current = `${next}:${resolveUiLocale(next, deviceLocales())}`;
      commit(next, true, instance);
    },
    [commit, instance],
  );

  return (
    <LanguagePreferenceContext.Provider value={{ preference, setPreference }}>
      <I18nextProvider i18n={instance}>{children}</I18nextProvider>
    </LanguagePreferenceContext.Provider>
  );
}

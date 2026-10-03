import { createContext, use, useMemo } from 'react';
import { brand } from '@/constants/brand';
import { usePreferences } from '@/stores/preferences-store';
import { dirOf } from './config';
import { createFormatters } from './format';
import ar from './messages/ar.json';
import en from './messages/en.json';
import { createTranslator } from './translator';

const MESSAGES = { en, ar };
const I18nContext = createContext(null);

/** Builds `{ locale, dir, t, format }` for a language (exported for tests). */
export function createI18n(locale) {
  const base = createTranslator(locale, MESSAGES[locale], locale === 'en' ? null : en);
  const brandParams = { brand: locale === 'ar' ? brand.nameAr : brand.name };
  return { locale, dir: dirOf(locale), t: (key, params) => base(key, { ...brandParams, ...params }), format: createFormatters(locale) };
}

/** Provides translations for the language chosen in the preferences store. */
export default function I18nProvider({ locale: forced, children }) {
  const preferred = usePreferences((s) => s.locale);
  const locale = forced ?? preferred;
  const value = useMemo(() => createI18n(locale), [locale]);
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n() {
  const value = use(I18nContext);
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>');
  return value;
}

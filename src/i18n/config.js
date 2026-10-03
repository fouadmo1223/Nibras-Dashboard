/** Dashboard languages. The choice is a per-device preference (stores/preferences-store.js). */
export const LOCALES = ['en', 'ar'];
export const DEFAULT_LOCALE = 'en';

export const LOCALE_META = {
  en: { label: 'English', short: 'EN', dir: 'ltr' },
  ar: { label: 'العربية', short: 'ع', dir: 'rtl' },
};

export const isLocale = (value) => LOCALES.includes(value);
export const dirOf = (locale) => LOCALE_META[locale]?.dir ?? 'ltr';

/** First supported language from the browser's preferences (navigator.languages). */
export function browserLocale(languages = typeof navigator === 'undefined' ? [] : navigator.languages ?? []) {
  return languages.map((tag) => tag.toLowerCase().split('-')[0]).find(isLocale) ?? DEFAULT_LOCALE;
}

import { describe, expect, it } from 'vitest';
import { browserLocale } from './config';
import ar from './messages/ar.json';
import en from './messages/en.json';
import { createI18n } from './I18nProvider';

const PLURAL = /\.(zero|one|two|few|many|other)$/;
/** Message keys; plural entries collapse to their parent key (Arabic has more forms than English). */
const keys = (node, prefix = '') =>
  Object.entries(node).flatMap(([k, v]) => (typeof v === 'string' ? [`${prefix}${k}`] : keys(v, `${prefix}${k}.`)));
const messageKeys = (catalog) => [...new Set(keys(catalog).map((k) => k.replace(PLURAL, '')))].sort();

describe('dashboard messages', () => {
  it('has the same keys in English and Arabic', () => {
    expect(messageKeys(ar)).toEqual(messageKeys(en));
  });

  it('fills the brand and plural forms per language', () => {
    expect(createI18n('en').t('meta.title')).toBe('Nibras Admin');
    expect(createI18n('ar').t('meta.title')).toBe('نبراس · لوحة الإدارة');
    expect(createI18n('en').t('overview.account.permissions', { count: 1 })).toBe('1 permission');
    expect(createI18n('ar').t('overview.account.permissions', { count: 2 })).toBe('صلاحيتان');
    expect(createI18n('ar').t('overview.account.permissions', { count: 5 })).toBe('5 صلاحيات');
  });

  it('defaults to the browser language when it is supported', () => {
    expect(browserLocale(['ar-EG', 'en'])).toBe('ar');
    expect(browserLocale(['fr-FR', 'de'])).toBe('en');
  });
});

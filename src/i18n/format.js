/**
 * Locale-aware formatting. Arabic uses Western digits (ar-u-nu-latn) so prices, codes and
 * the API's own messages read consistently (ADR-020).
 */
const INTL_LOCALE = { en: 'en', ar: 'ar-u-nu-latn' };

const RELATIVE_UNITS = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
  ['second', 1],
];

export function createFormatters(locale) {
  const intl = INTL_LOCALE[locale] ?? locale;
  const relative = new Intl.RelativeTimeFormat(intl, { numeric: 'auto' });
  return {
    intlLocale: intl,
    number: (value, options) => new Intl.NumberFormat(intl, options).format(value),
    currency: (amount, currency = 'USD', options) =>
      new Intl.NumberFormat(intl, { style: 'currency', currency, ...options }).format(amount),
    date: (value, options = { dateStyle: 'medium' }) => new Intl.DateTimeFormat(intl, options).format(new Date(value)),
    /** "3 minutes ago" / "منذ 3 دقائق"; under a minute reads "now". */
    relativeTime(value, now = Date.now()) {
      const seconds = Math.round((new Date(value).getTime() - now) / 1000);
      for (const [unit, size] of RELATIVE_UNITS) {
        if (Math.abs(seconds) >= size && unit !== 'second') return relative.format(Math.round(seconds / size), unit);
      }
      return relative.format(0, 'second');
    },
  };
}

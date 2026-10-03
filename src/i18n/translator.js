/**
 * Minimal message formatter (same implementation in the website, dashboard and mobile app):
 * - nested messages, dotted keys: t('auth.login.title')
 * - `{name}` placeholders filled from params
 * - plural entries: an object of CLDR categories ({ one, two, few, many, other }) picked with
 *   Intl.PluralRules from `params.count` — Arabic uses all six
 * Missing keys fall back to the fallback catalog (English), then to the key itself.
 */
export function createTranslator(locale, messages, fallback) {
  const rules = typeof Intl !== 'undefined' && Intl.PluralRules ? new Intl.PluralRules(locale) : null;
  const lookup = (catalog, key) => key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), catalog);

  return function t(key, params) {
    let entry = lookup(messages, key);
    if (entry === undefined && fallback) entry = lookup(fallback, key);
    if (entry && typeof entry === 'object') {
      entry = entry[rules ? rules.select(Number(params?.count ?? 0)) : 'other'] ?? entry.other;
    }
    if (typeof entry !== 'string') return key;
    return params ? entry.replace(/\{(\w+)\}/g, (match, name) => (params[name] ?? match).toString()) : entry;
  };
}

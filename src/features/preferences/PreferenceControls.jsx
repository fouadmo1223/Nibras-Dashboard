import { Check, Languages, Monitor, Moon, Sun } from 'lucide-react';
import Menu from '@/components/ui/Menu';
import { accents } from '@/constants/accents';
import { LOCALE_META, LOCALES } from '@/i18n/config';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { THEMES, usePreferences } from '@/stores/preferences-store';
import { useSwitchLocale } from './use-switch-locale';

export const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor };

const iconButton =
  'inline-grid size-9 place-items-center rounded-lg text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground aria-expanded:bg-surface-muted aria-expanded:text-foreground';

export function ThemeMenu() {
  const { t } = useI18n();
  const theme = usePreferences((s) => s.theme);
  const setTheme = usePreferences((s) => s.setTheme);
  const Icon = THEME_ICONS[theme];
  return (
    <Menu
      label={t('theme.change', { theme: t(`theme.${theme}`) })}
      triggerClassName={iconButton}
      triggerContent={<Icon className="size-[1.125rem]" aria-hidden="true" />}
      items={THEMES.map((id) => ({ id, label: t(`theme.${id}`), icon: THEME_ICONS[id], selected: theme === id, onSelect: () => setTheme(id) }))}
    />
  );
}

export function LanguageMenu() {
  const { t, locale } = useI18n();
  const switchLocale = useSwitchLocale();
  return (
    <Menu
      label={t('language.change', { language: LOCALE_META[locale].label })}
      triggerClassName={cn(iconButton, 'inline-flex w-auto items-center gap-1.5 px-2.5 text-sm font-medium')}
      triggerContent={
        <>
          <Languages className="size-[1.125rem]" aria-hidden="true" />
          <span aria-hidden="true">{LOCALE_META[locale].short}</span>
        </>
      }
      items={LOCALES.map((id) => ({
        id,
        label: LOCALE_META[id].label,
        lang: id,
        selected: locale === id,
        onSelect: () => id !== locale && switchLocale(id),
      }))}
    />
  );
}

/** Radio group shown as a segmented control; arrow keys follow the visual direction (mirrored in RTL). */
export function Segmented({ label, options, value, onChange, className }) {
  const onKeyDown = (event) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const visual = document.dir === 'rtl' && (event.key === 'ArrowRight' || event.key === 'ArrowLeft') ? -step : step;
    const index = options.findIndex((o) => o.id === value);
    const next = options[(index + visual + options.length) % options.length];
    onChange(next.id);
    event.currentTarget.querySelector(`[data-id="${next.id}"]`)?.focus();
  };
  return (
    // Roving-tabindex radio group: the checked radio is the tab stop; the group only routes arrow keys.
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus
    <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className={cn('inline-flex rounded-lg border border-border bg-surface-muted p-1', className)}>
      {options.map((option) => {
        const Icon = option.icon;
        const checked = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            // Styled pill radios: a native radio input cannot render as a button.
            // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            data-id={option.id}
            lang={option.lang}
            onClick={() => onChange(option.id)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors',
              checked ? 'bg-surface text-foreground shadow-elevation-1' : 'text-foreground-muted hover:text-foreground',
            )}
          >
            {Icon && <Icon className="size-4" aria-hidden="true" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function ThemeSegmented() {
  const { t } = useI18n();
  const theme = usePreferences((s) => s.theme);
  const setTheme = usePreferences((s) => s.setTheme);
  return (
    <Segmented
      label={t('theme.label')}
      value={theme}
      onChange={setTheme}
      options={THEMES.map((id) => ({ id, label: t(`theme.${id}`), icon: THEME_ICONS[id] }))}
    />
  );
}

export function LanguageSegmented() {
  const { t, locale } = useI18n();
  const switchLocale = useSwitchLocale();
  return (
    <Segmented
      label={t('language.label')}
      value={locale}
      onChange={(id) => id !== locale && switchLocale(id)}
      options={LOCALES.map((id) => ({ id, label: LOCALE_META[id].label, lang: id }))}
    />
  );
}

/** Swatch radio group for a primary/secondary accent preset (colors from the generated tokens). */
export function AccentPicker({ kind, label }) {
  const { t } = useI18n();
  const value = usePreferences((s) => s[kind]);
  const set = usePreferences((s) => (kind === 'primary' ? s.setPrimary : s.setSecondary));
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-3">
      {accents[kind].map(({ id, swatch }) => {
        const checked = value === id;
        return (
          <button
            key={id}
            type="button"
            // Styled pill radios: a native radio input cannot render as a button.
            // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
            role="radio"
            aria-checked={checked}
            onClick={() => set(id)}
            className={cn(
              'group flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
              checked ? 'border-primary bg-primary-soft text-foreground' : 'border-border text-foreground-muted hover:border-border-strong hover:text-foreground',
            )}
          >
            <span
              aria-hidden="true"
              className="relative grid size-6 place-items-center rounded-full ring-1 ring-black/10 ring-inset"
              style={{ background: `light-dark(${swatch.light}, ${swatch.dark})` }}
            >
              {checked && <Check className="size-3.5 text-white mix-blend-difference" />}
            </span>
            {t(`settings.accents.${id}`)}
          </button>
        );
      })}
    </div>
  );
}

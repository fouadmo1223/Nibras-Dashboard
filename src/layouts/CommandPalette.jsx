import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Languages, LogOut, PanelLeft, Search } from 'lucide-react';
import { useCurrentUser } from '@/features/auth/current-user';
import { THEME_ICONS } from '@/features/preferences/PreferenceControls';
import { useSwitchLocale } from '@/features/preferences/use-switch-locale';
import { LOCALE_META, LOCALES } from '@/i18n/config';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { usePreferences } from '@/stores/preferences-store';
import { visibleNavGroups } from './navigation';

/** Lower-cased, diacritics- and tatweel-free text for forgiving matching in English and Arabic. */
const normalize = (value) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ًͯ-ٟـ]/g, '');

/**
 * Global search / command palette (Ctrl+K or ⌘K): jump to any page or run an action.
 * Combobox pattern: focus stays in the input, arrows move the active option, Enter runs it.
 */
export default function CommandPalette({ open, onClose, onSignOut }) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const switchLocale = useSwitchLocale();
  const setTheme = usePreferences((s) => s.setTheme);
  const toggleSidebar = usePreferences((s) => s.toggleSidebar);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const listId = useId();

  const commands = useMemo(() => {
    const pages = visibleNavGroups(user.permissions).flatMap((group) =>
      group.items.map((item) => ({ id: `page:${item.key}`, group: 'pages', label: t(`nav.${item.key}`), icon: item.icon, run: () => navigate(item.to) })),
    );
    const otherLocale = LOCALES.find((l) => l !== locale);
    const actions = [
      ...['light', 'dark', 'system'].map((theme) => ({
        id: `theme:${theme}`,
        group: 'actions',
        label: t(`search.actions.theme${theme[0].toUpperCase()}${theme.slice(1)}`),
        icon: THEME_ICONS[theme],
        run: () => setTheme(theme),
      })),
      { id: 'language', group: 'actions', label: t('search.actions.language', { language: LOCALE_META[otherLocale].label }), icon: Languages, run: () => switchLocale(otherLocale) },
      { id: 'sidebar', group: 'actions', label: t('search.actions.toggleSidebar'), icon: PanelLeft, shortcut: 'Ctrl B', run: toggleSidebar },
      { id: 'sign-out', group: 'actions', label: t('search.actions.signOut'), icon: LogOut, run: onSignOut },
    ];
    return [...pages, ...actions];
  }, [t, locale, user.permissions, navigate, setTheme, switchLocale, toggleSidebar, onSignOut]);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    return q ? commands.filter((c) => normalize(c.label).includes(q)) : commands;
  }, [commands, query]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) {
      setQuery('');
      setActive(0);
      dialog.showModal();
      inputRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const run = (command) => {
    onClose();
    command.run();
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!results.length) return;
      setActive((i) => (i + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length);
    } else if (event.key === 'Enter' && results[active]) {
      event.preventDefault();
      run(results[active]);
    }
  };

  const optionId = (index) => `${listId}-${index}`;
  let index = -1;

  return (
    // Backdrop click closes; keyboard users have Esc (native <dialog> cancel).
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      aria-label={t('search.label')}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => event.target === dialogRef.current && onClose()}
      className="mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-2xl border border-border bg-surface-raised p-0 text-foreground shadow-elevation-3 backdrop:bg-black/50 backdrop:backdrop-blur-sm open:animate-dialog-in"
    >
      <div className="flex items-center gap-3 border-b border-border px-4">
        <Search className="size-5 shrink-0 text-foreground-subtle" aria-hidden="true" />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={results[active] ? optionId(active) : undefined}
          aria-autocomplete="list"
          aria-label={t('search.label')}
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-foreground-subtle"
        />
        <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[0.6875rem] text-foreground-subtle sm:inline">Esc</kbd>
      </div>

      {/* Combobox pattern: the input keeps focus and owns the keyboard (aria-activedescendant). */}
      {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role */}
      <div id={listId} role="listbox" aria-label={t('search.label')} className="max-h-[50vh] overflow-y-auto p-2">
        {results.length === 0 && <p className="px-3 py-8 text-center text-sm text-foreground-muted">{t('search.empty', { query })}</p>}
        {['pages', 'actions'].map((group) => {
          const items = results.filter((c) => c.group === group);
          if (!items.length) return null;
          return (
            // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
            <div key={group} role="group" aria-label={t(`search.groups.${group}`)} className="mb-1">
              <p className="px-3 pb-1 pt-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-foreground-subtle" aria-hidden="true">
                {t(`search.groups.${group}`)}
              </p>
              {items.map((command) => {
                index += 1;
                const i = index;
                const Icon = command.icon;
                return (
                  // Options are driven from the input (arrows + Enter); the click handler is for pointer users.
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
                  <div
                    key={command.id}
                    id={optionId(i)}
                    // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
                    role="option"
                    aria-selected={i === active}
                    onMouseMove={() => setActive(i)}
                    onClick={() => run(command)}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm',
                      i === active ? 'bg-primary-soft text-primary' : 'text-foreground',
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1 truncate">{command.label}</span>
                    {command.shortcut && <kbd className="font-mono text-[0.6875rem] text-foreground-subtle">{command.shortcut}</kbd>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 border-t border-border px-4 py-2.5 text-xs text-foreground-subtle" aria-hidden="true">
        <span>
          <kbd className="font-mono">↑↓</kbd> {t('search.hints.navigate')}
        </span>
        <span>
          <kbd className="font-mono">↵</kbd> {t('search.hints.select')}
        </span>
        <span>
          <kbd className="font-mono">Esc</kbd> {t('search.hints.close')}
        </span>
      </div>
    </dialog>
  );
}

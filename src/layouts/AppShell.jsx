import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Menu as MenuIcon, Search, X } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { SignOutDialog } from '@/features/auth/SignOutButton';
import { LanguageMenu, ThemeMenu } from '@/features/preferences/PreferenceControls';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { usePreferences } from '@/stores/preferences-store';
import Breadcrumbs from './Breadcrumbs';
import ChatWidget from './ChatWidget';
import CommandPalette from './CommandPalette';
import NotificationBell from './NotificationBell';
import Sidebar, { SidebarNav } from './Sidebar';
import UserMenu from './UserMenu';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** Small-screen navigation drawer (native <dialog>), sliding in from the inline-start edge. */
function MobileSidebar({ open, onClose }) {
  const { t, locale } = useI18n();
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    // Backdrop click closes; keyboard users have Esc (native <dialog> cancel).
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      aria-label={t('nav.main')}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => event.target === ref.current && onClose()}
      className="fixed inset-y-0 start-0 end-auto m-0 h-dvh max-h-dvh w-72 max-w-[85vw] bg-surface p-0 text-foreground shadow-elevation-3 backdrop:bg-black/50 backdrop:backdrop-blur-sm open:animate-drawer-in rtl:open:animate-drawer-in-rtl"
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Logo label={t('common.admin')} lang={locale} />
          <button
            type="button"
            onClick={onClose}
            aria-label={t('nav.closeMenu')}
            className="inline-grid size-9 place-items-center rounded-lg text-foreground-muted hover:bg-surface-muted hover:text-foreground"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <SidebarNav onNavigate={onClose} />
      </div>
    </dialog>
  );
}

/**
 * Authenticated dashboard frame: collapsible sidebar, top bar (breadcrumbs, search,
 * language, theme, account) and the routed page. Shortcuts: Ctrl/⌘+K search, Ctrl/⌘+B sidebar.
 */
export default function AppShell() {
  const { t } = useI18n();
  const location = useLocation();
  const sidebar = usePreferences((s) => s.sidebar);
  const toggleSidebar = usePreferences((s) => s.toggleSidebar);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const compact = sidebar === 'compact';

  // Close the drawer whenever the route changes.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (location.pathname !== lastPath) {
    setLastPath(location.pathname);
    setDrawerOpen(false);
  }

  useEffect(() => {
    const onKeyDown = (event) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (mod && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleSidebar]);

  const openSignOut = useCallback(() => setSigningOut(true), []);

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main"
        className="fixed start-4 top-2 z-50 -translate-y-16 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-transform focus:translate-y-0"
      >
        {t('common.skipToContent')}
      </a>
      <Sidebar compact={compact} onToggle={toggleSidebar} />
      <MobileSidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className={cn('flex min-h-dvh flex-col transition-[padding] duration-300 ease-emphasized', compact ? 'lg:ps-[4.5rem]' : 'lg:ps-64')}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={t('nav.openMenu')}
            className="inline-grid size-9 place-items-center rounded-lg text-foreground-muted hover:bg-surface-muted hover:text-foreground lg:hidden"
          >
            <MenuIcon className="size-5" aria-hidden="true" />
          </button>
          <Breadcrumbs />

          <div className="ms-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-keyshortcuts="Control+K Meta+K"
              className="hidden h-9 w-64 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-foreground-subtle transition-colors hover:border-border-strong md:flex"
            >
              <Search className="size-4" aria-hidden="true" />
              <span className="flex-1 text-start">{t('search.open')}</span>
              <kbd className="rounded border border-border px-1.5 font-mono text-[0.6875rem]">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
            </button>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label={t('search.open')}
              className="inline-grid size-9 place-items-center rounded-lg text-foreground-muted hover:bg-surface-muted hover:text-foreground md:hidden"
            >
              <Search className="size-[1.125rem]" aria-hidden="true" />
            </button>
            <LanguageMenu />
            <ThemeMenu />
            <NotificationBell />
            <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
            <UserMenu onSignOut={openSignOut} />
          </div>
        </header>

        <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onSignOut={openSignOut} />
      <SignOutDialog open={signingOut} onClose={() => setSigningOut(false)} />
      <ChatWidget />
    </div>
  );
}

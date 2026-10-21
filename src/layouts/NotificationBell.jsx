import { useEffect, useId, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, CheckCheck } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import {
  getUnreadNotificationCount,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationKeys,
} from '@/services/notifications.service';

const PAGE_LIMIT = 10;
const NEAR_BOTTOM_PX = 80;

function NotificationRow({ item, onRead, format }) {
  const content = (
    <>
      <span aria-hidden="true" className={cn('mt-1.5 size-2 shrink-0 rounded-full', item.read ? 'bg-transparent' : 'bg-primary')} />
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm leading-5', item.read ? 'text-foreground-muted' : 'text-foreground')}>{item.message}</p>
        <p className="mt-1 text-xs text-foreground-subtle">{format.date(item.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</p>
      </div>
    </>
  );
  const className = 'flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-start transition-colors hover:bg-surface-muted';

  if (item.link) {
    return (
      <Link to={item.link} onClick={() => onRead(item)} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => onRead(item)} className={className}>
      {content}
    </button>
  );
}

/** Bell icon with an unread badge; opens a popover of the current user's notifications, loaded page by page as the list is scrolled. */
export default function NotificationBell() {
  const { t, format } = useI18n();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const panelId = useId();

  const unread = useQuery({ queryKey: notificationKeys.unreadCount(), queryFn: getUnreadNotificationCount, refetchInterval: 60_000 });
  const list = useInfiniteQuery({
    queryKey: notificationKeys.mine({ limit: PAGE_LIMIT }),
    queryFn: ({ pageParam }) => listMyNotifications({ page: pageParam, limit: PAGE_LIMIT }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.items.length, 0);
      return loaded < lastPage.pagination.total ? pages.length + 1 : undefined;
    },
    enabled: open,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  const markOne = useMutation({ mutationFn: (id) => markNotificationRead(id), onSuccess: refresh });
  const markAll = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: refresh });

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const count = unread.data ?? 0;
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];

  const onRead = (item) => {
    if (!item.read) markOne.mutate(item.id);
  };

  const onListScroll = (event) => {
    const el = event.currentTarget;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    if (nearBottom && list.hasNextPage && !list.isFetchingNextPage) list.fetchNextPage();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={count > 0 ? t('notifications.unreadBadge', { count }) : t('notifications.title')}
        title={t('notifications.title')}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-grid size-9 shrink-0 place-items-center rounded-lg text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
      >
        <Bell className="size-[1.125rem]" aria-hidden="true" />
        {count > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -end-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
          >
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            role="dialog"
            aria-label={t('notifications.title')}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 34 }}
            className="absolute end-0 top-full z-50 mt-2 w-80 origin-top-right rounded-xl border border-border bg-surface-raised p-2 shadow-elevation-3 rtl:origin-top-left"
          >
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-sm font-semibold text-foreground">{t('notifications.title')}</span>
              {count > 0 ? (
                <button
                  type="button"
                  onClick={() => markAll.mutate()}
                  disabled={markAll.isPending}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary-soft disabled:opacity-50"
                >
                  <CheckCheck className="size-3.5" aria-hidden="true" />
                  {t('notifications.markAllRead')}
                </button>
              ) : null}
            </div>

            <div onScroll={onListScroll} className="max-h-96 overflow-y-auto">
              {list.isPending ? (
                <div className="space-y-2 p-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-muted" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-foreground-subtle">{t('notifications.empty')}</p>
              ) : (
                <div className="space-y-0.5">
                  {items.map((item) => (
                    <NotificationRow key={item.id} item={item} onRead={onRead} format={format} />
                  ))}
                  {list.isFetchingNextPage ? (
                    <div className="flex justify-center py-3">
                      <div className="size-4 animate-spin rounded-full border-2 border-border-strong border-t-primary" aria-hidden="true" />
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

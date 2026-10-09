import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Accessible dropdown menu (WAI-ARIA menu button): opens with click, Enter, Space or
 * ArrowDown; arrow keys / Home / End move between items; Esc or Tab closes and returns
 * focus to the trigger; clicking outside closes. Items with `selected` render as
 * menuitemradio. `header` renders non-interactive content above the items.
 */
export default function Menu({ label, triggerClassName, triggerContent, triggerProps, items, header, align = 'end', className, menuClassName }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const itemRefs = useRef([]);
  const menuId = useId();
  const radio = items.some((item) => item.selected !== undefined);

  const focusItem = (index) => {
    const count = items.length;
    itemRefs.current[((index % count) + count) % count]?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const openAt = (index) => {
    setOpen(true);
    requestAnimationFrame(() => focusItem(index));
  };

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  const selectedIndex = () => Math.max(0, items.findIndex((item) => item.selected));

  const onTriggerKeyDown = (event) => {
    if (['ArrowDown', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      openAt(selectedIndex());
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      openAt(items.length - 1);
    }
  };

  const onMenuKeyDown = (event) => {
    const index = itemRefs.current.indexOf(document.activeElement);
    const keys = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: items.length - 1 };
    if (event.key in keys) {
      event.preventDefault();
      focusItem(keys[event.key]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab') {
      close(false);
    }
  };

  const select = (item) => {
    close();
    item.onSelect?.();
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : openAt(selectedIndex()))}
        onKeyDown={onTriggerKeyDown}
        className={triggerClassName}
        {...triggerProps}
      >
        {triggerContent}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={onMenuKeyDown}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 34 }}
            className={cn(
              'absolute top-full z-50 mt-2 min-w-48 overflow-hidden rounded-xl border border-border bg-surface-raised p-1.5 shadow-elevation-3',
              align === 'end' ? 'end-0 origin-top-right rtl:origin-top-left' : 'start-0 origin-top-left rtl:origin-top-right',
              menuClassName,
            )}
          >
            {header}
            {items.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  ref={(node) => {
                    itemRefs.current[index] = node;
                  }}
                  type="button"
                  role={radio ? 'menuitemradio' : 'menuitem'}
                  aria-checked={radio ? Boolean(item.selected) : undefined}
                  tabIndex={-1}
                  lang={item.lang}
                  onClick={() => select(item)}
                  className={cn(
                    'group/item flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-start text-sm outline-none',
                    'transition-[background-color,color,padding] duration-150 ease-standard',
                    // Brand-tinted hover/focus (visible on both themes) with a small nudge toward the reading direction.
                    'text-foreground hover:bg-primary-soft hover:ps-4 hover:text-primary focus-visible:bg-primary-soft focus-visible:ps-4 focus-visible:text-primary',
                    item.selected && 'font-medium',
                    item.tone === 'danger' && 'text-error hover:bg-error-soft hover:text-error focus-visible:bg-error-soft focus-visible:text-error',
                  )}
                >
                  {Icon && <Icon className="size-4 shrink-0 text-foreground-muted transition-colors group-hover/item:text-current group-focus-visible/item:text-current" aria-hidden="true" />}
                  <span className="flex-1">{item.label}</span>
                  {item.selected && <Check className="size-4 text-primary" aria-hidden="true" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

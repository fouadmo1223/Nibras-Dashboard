import { useState } from 'react';
import { cn } from '@/lib/cn';
import { inputClassName } from './Input';

/**
 * A single visible text input toggled between an English and an Arabic value, for places that hold
 * state as plain value/onChange (dynamic lists) rather than react-hook-form — see BilingualField for that case.
 */
export default function BilingualInput({
  valueEn,
  valueAr,
  onChangeEn,
  onChangeAr,
  placeholderEn,
  placeholderAr,
  className,
  inputClassNameOverride,
}) {
  const [lang, setLang] = useState('en');
  const fieldClass = inputClassNameOverride ?? inputClassName;

  return (
    <div className={cn('relative', className)}>
      {/* px (not pe): the toggle below is positioned against the page's own direction (end-1), which
          doesn't match either input's own forced dir="ltr"/"rtl" — a logical pe-14 would clear the
          toggle on the wrong side whenever the two directions disagree (e.g. an English field on an
          Arabic-language page). Symmetric physical padding clears it correctly either way. */}
      <input
        dir="ltr"
        placeholder={placeholderEn}
        value={valueEn}
        onChange={(e) => onChangeEn(e.target.value)}
        className={cn(fieldClass, 'px-20', lang !== 'en' && 'hidden')}
      />
      <input
        dir="rtl"
        placeholder={placeholderAr}
        value={valueAr}
        onChange={(e) => onChangeAr(e.target.value)}
        className={cn(fieldClass, 'px-20', lang !== 'ar' && 'hidden')}
      />
      <div
        role="tablist"
        aria-label="language"
        className="absolute end-1 top-1/2 inline-flex -translate-y-1/2 rounded border border-border-strong bg-surface p-0.5"
      >
        {[{ key: 'en', text: 'EN' }, { key: 'ar', text: 'AR' }].map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={lang === tab.key}
            onClick={() => setLang(tab.key)}
            className={cn(
              'rounded px-1.5 py-0.5 text-[11px] font-semibold tracking-wide transition-colors',
              lang === tab.key ? 'bg-primary-soft text-primary' : 'text-foreground-subtle hover:text-foreground',
            )}
          >
            {tab.text}
          </button>
        ))}
      </div>
    </div>
  );
}

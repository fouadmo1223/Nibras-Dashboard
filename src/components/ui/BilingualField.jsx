import { useId, useState } from 'react';
import { cn } from '@/lib/cn';
import Input, { inputClassName } from './Input';

const textareaClassName = cn(inputClassName, 'h-auto min-h-24 resize-y py-2.5 leading-6');

/**
 * One label, one visible input, a small EN/AR toggle instead of two permanently-shown fields.
 * Both registered inputs stay mounted (just visually hidden) so react-hook-form's refs never
 * churn — switching tabs doesn't lose focus, doesn't re-register, and both values keep validating
 * in the background. A dot on the inactive tab flags an error hiding there. Builds its own
 * label/hint/error chrome (rather than wrapping `<Field>`) since it binds two inputs, not one —
 * `Field`'s single-child `cloneElement` can't target either of them correctly.
 */
export default function BilingualField({
  label,
  nameEn,
  nameAr,
  register,
  errors,
  placeholderEn,
  placeholderAr,
  hint,
  multiline = false,
  rows = 3,
  required = false,
  className,
}) {
  const [lang, setLang] = useState('en');
  const idEn = useId();
  const idAr = useId();
  const hintId = useId();
  const errorEn = errors?.[nameEn]?.message;
  const errorAr = errors?.[nameAr]?.message;
  const activeError = lang === 'en' ? errorEn : errorAr;
  const errorId = useId();
  const describedBy = [activeError ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  const Tag = multiline ? 'textarea' : Input;
  const sharedClass = multiline ? textareaClassName : undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={lang === 'en' ? idEn : idAr} className="text-sm font-medium text-foreground">
          {label}
          {required ? <span className="text-error"> *</span> : null}
        </label>
        <div role="tablist" aria-label={`${label} — language`} className="inline-flex shrink-0 rounded-md border border-border-strong bg-surface p-0.5">
          {[
            { key: 'en', text: 'EN', error: errorEn },
            { key: 'ar', text: 'AR', error: errorAr },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={lang === tab.key}
              onClick={() => setLang(tab.key)}
              className={cn(
                'relative rounded px-2.5 py-1 text-xs font-semibold tracking-wide transition-colors',
                lang === tab.key ? 'bg-primary-soft text-primary' : 'text-foreground-subtle hover:text-foreground',
              )}
            >
              {tab.text}
              {tab.error ? <span className="absolute -top-0.5 end-0.5 size-1.5 rounded-full bg-error" aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      </div>

      {multiline ? (
        <>
          <textarea
            id={idEn}
            dir="ltr"
            rows={rows}
            placeholder={placeholderEn}
            aria-invalid={errorEn ? true : undefined}
            aria-describedby={lang === 'en' ? describedBy : undefined}
            className={cn(sharedClass, lang !== 'en' && 'hidden')}
            {...register(nameEn)}
          />
          <textarea
            id={idAr}
            dir="rtl"
            rows={rows}
            placeholder={placeholderAr}
            aria-invalid={errorAr ? true : undefined}
            aria-describedby={lang === 'ar' ? describedBy : undefined}
            className={cn(sharedClass, lang !== 'ar' && 'hidden')}
            {...register(nameAr)}
          />
        </>
      ) : (
        <>
          <Tag
            id={idEn}
            dir="ltr"
            placeholder={placeholderEn}
            aria-invalid={errorEn ? true : undefined}
            aria-describedby={lang === 'en' ? describedBy : undefined}
            className={cn(lang !== 'en' && 'hidden')}
            {...register(nameEn)}
          />
          <Tag
            id={idAr}
            dir="rtl"
            placeholder={placeholderAr}
            aria-invalid={errorAr ? true : undefined}
            aria-describedby={lang === 'ar' ? describedBy : undefined}
            className={cn(lang !== 'ar' && 'hidden')}
            {...register(nameAr)}
          />
        </>
      )}

      {activeError ? (
        <p id={errorId} role="alert" className="text-sm text-error">
          {activeError}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-sm text-foreground-subtle">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

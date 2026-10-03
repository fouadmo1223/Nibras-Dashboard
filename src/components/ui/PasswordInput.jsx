
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { passwordStrength } from '@/features/auth/auth-schemas';
import { inputClassName } from './Input';

const STRENGTH = [
  { level: 'tooShort', bar: 'bg-error' },
  { level: 'okay', bar: 'bg-warning' },
  { level: 'good', bar: 'bg-warning' },
  { level: 'strong', bar: 'bg-success' },
  { level: 'excellent', bar: 'bg-success' },
];

/** Password field with a visibility toggle; pass `strengthValue` (the watched value) to show a strength meter. */
export default function PasswordInput({ className, strengthValue, ref, ...props }) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const score = passwordStrength(strengthValue);

  return (
    <div>
      <div className="relative">
        <input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={cn(inputClassName, 'pe-11', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t('password.hide') : t('password.show')}
          aria-pressed={visible}
          className="absolute inset-y-0 end-0 grid w-11 place-items-center rounded-e-md text-foreground-subtle transition-colors hover:text-foreground"
        >
          {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
        </button>
      </div>
      {strengthValue ? (
        <div className="mt-2 flex items-center gap-3" aria-live="polite">
          <div className="flex flex-1 gap-1" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors duration-300',
                  i < score ? STRENGTH[score].bar : 'bg-surface-muted',
                )}
              />
            ))}
          </div>
          <span className="w-16 text-end text-xs text-foreground-subtle">{t(`password.levels.${STRENGTH[score].level}`)}</span>
        </div>
      ) : null}
    </div>
  );
}

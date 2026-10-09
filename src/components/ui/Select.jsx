import { useController } from 'react-hook-form';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import Menu from './Menu';

/**
 * Custom select, styled like `Input` instead of the browser's native control. Built on
 * `Menu` (WAI-ARIA menu pattern), so it gets the same keyboard nav, focus management and
 * click-outside handling for free. Takes `control`/`name` directly (via `useController`),
 * so it drops into `<Field>` the same way a plain `register()`-bound `<Input>` does — Field
 * clones `id`/`aria-invalid`/`aria-describedby` onto it and those just work.
 */
export default function Select({ control, name, options, placeholder, disabled, id, 'aria-invalid': ariaInvalid, 'aria-describedby': describedBy }) {
  const {
    field: { value, onChange },
  } = useController({ control, name });
  const selected = options.find((o) => o.value === value);

  return (
    <Menu
      label={placeholder}
      className="w-full"
      menuClassName="w-full"
      items={options.map((option) => ({
        id: option.value,
        label: option.label,
        selected: option.value === value,
        onSelect: () => onChange(option.value),
      }))}
      triggerContent={
        <>
          <span className={cn('truncate', !selected && 'text-foreground-subtle')}>{selected ? selected.label : placeholder}</span>
          <ChevronDown className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
        </>
      }
      triggerClassName={cn(
        'flex h-11 w-full items-center justify-between gap-2 rounded-md border border-border-strong bg-surface px-3.5 text-[15px] text-foreground',
        'shadow-[inset_0_1px_0_rgb(0_0_0/0.02)] transition-[border-color,box-shadow] duration-150',
        'focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15',
        'aria-[invalid=true]:border-error aria-[invalid=true]:focus:ring-error/15',
        'disabled:cursor-not-allowed disabled:opacity-60',
      )}
      triggerProps={{ id, disabled, 'aria-invalid': ariaInvalid, 'aria-describedby': describedBy }}
    />
  );
}

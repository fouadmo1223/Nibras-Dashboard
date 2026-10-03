import { cn } from '@/lib/cn';

const SIZES = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-14 text-lg' };

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts.at(-1)[0] : '')).toUpperCase() || '?';
}

/** User photo (512px WebP served by the API), falling back to initials. */
export default function Avatar({ user, size = 'md', className }) {
  const base = cn('relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full', SIZES[size], className);
  if (user?.avatarUrl) {
    return (
      <span className={base}>
        <img src={user.avatarUrl} alt={user.name ?? ''} loading="lazy" decoding="async" className="size-full object-cover" />
      </span>
    );
  }
  return (
    <span className={cn(base, 'bg-primary-soft font-semibold text-primary')} aria-hidden={!user?.name}>
      {initials(user?.name)}
    </span>
  );
}

import { brand } from '@/constants/brand';

const { mark, colors } = brand;

// light-dark() follows the resolved color-scheme (system or data-theme). Brand
// colors stay fixed even when the admin customises primary/secondary colors.
const fills = {
  page: `light-dark(${colors.light.page}, ${colors.dark.page})`,
  flame: `light-dark(${colors.light.flame}, ${colors.dark.flame})`,
  core: `light-dark(${colors.light.core}, ${colors.dark.core})`,
};

/** The Nibras mark: an open book whose spine carries a flame. */
export function LogoMark({ className = 'size-8', title }) {
  return (
    <svg
      viewBox={mark.viewBox}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <path style={{ fill: fills.page }} d={mark.pageLeft} />
      <path style={{ fill: fills.page }} d={mark.pageRight} />
      <path style={{ fill: fills.flame }} d={mark.flame} />
      <path style={{ fill: fills.core }} d={mark.flameCore} />
    </svg>
  );
}

/** Mark + wordmark lockup with an optional product label (e.g. "Admin"). */
export default function Logo({ label, className = '', markClassName = 'size-8', lang = 'en' }) {
  const name = lang === 'ar' ? brand.nameAr : brand.name;
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className={markClassName} />
      <span
        className={`text-xl font-semibold leading-none tracking-tight text-foreground ${lang === 'ar' ? 'font-arabic' : 'font-display'}`}
      >
        {name}
      </span>
      {label && (
        <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-foreground-muted">
          {label}
        </span>
      )}
    </span>
  );
}

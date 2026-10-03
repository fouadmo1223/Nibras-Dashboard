import { Languages, LayoutPanelLeft, Palette, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import Button from '@/components/ui/Button';
import { AccentPicker, LanguageSegmented, Segmented, ThemeSegmented } from '@/features/preferences/PreferenceControls';
import { useI18n } from '@/i18n/I18nProvider';
import { SIDEBAR_MODES, usePreferences } from '@/stores/preferences-store';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 28 } } };

function Section({ icon: Icon, title, description, children }) {
  return (
    <motion.section variants={item} className="rounded-2xl border border-border bg-surface p-6 shadow-elevation-1 sm:p-7">
      <header className="mb-6 flex items-start gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-foreground-muted">{description}</p>}
        </div>
      </header>
      {children}
    </motion.section>
  );
}

/** Live preview of the current accents, so color choices can be judged in context. */
function AccentPreview() {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-dashed border-border-strong p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-foreground-subtle">{t('settings.preview.title')}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button size="sm">{t('settings.preview.primary')}</Button>
        <span className="inline-flex h-9 items-center rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground">
          {t('settings.preview.secondary')}
        </span>
        <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">{t('settings.preview.badge')}</span>
        <span className="text-sm font-medium text-primary underline underline-offset-4">{t('settings.preview.link')}</span>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useI18n();
  const sidebar = usePreferences((s) => s.sidebar);
  const setSidebar = usePreferences((s) => s.setSidebar);
  const resetAppearance = usePreferences((s) => s.resetAppearance);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.div variants={item} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('settings.title')}</h1>
          <p className="mt-2 text-foreground-muted">{t('settings.subtitle')}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={resetAppearance}>
          <RotateCcw className="size-4" aria-hidden="true" />
          {t('settings.reset')}
        </Button>
      </motion.div>

      <div className="mt-8 space-y-6">
        <Section icon={Palette} title={t('settings.appearance.title')} description={t('settings.appearance.description')}>
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">{t('theme.label')}</p>
              <ThemeSegmented />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">{t('settings.primary')}</p>
              <AccentPicker kind="primary" label={t('settings.primary')} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">{t('settings.secondary')}</p>
              <AccentPicker kind="secondary" label={t('settings.secondary')} />
            </div>
            <AccentPreview />
          </div>
        </Section>

        <Section icon={LayoutPanelLeft} title={t('settings.layout.title')} description={t('settings.layout.description')}>
          <Segmented
            label={t('settings.layout.title')}
            value={sidebar}
            onChange={setSidebar}
            options={SIDEBAR_MODES.map((id) => ({ id, label: t(`settings.sidebar.${id}`) }))}
          />
        </Section>

        <Section icon={Languages} title={t('settings.language.title')} description={t('settings.language.description')}>
          <LanguageSegmented />
        </Section>
      </div>
    </motion.div>
  );
}

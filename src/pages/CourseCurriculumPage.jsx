import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { ChevronDown, ChevronUp, Clapperboard, HelpCircle, Layers, Plus, Trash2 } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useI18n } from '@/i18n/I18nProvider';
import { errorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/cn';
import { courseKeys, getCourse, getCourseCurriculum, saveCourseCurriculum } from '@/services/courses.service';
import { toast } from '@/stores/toast-store';

let localIdSeq = 0;
const newLocalId = () => `new-${Date.now()}-${localIdSeq++}`;

const emptyLesson = () => ({ localId: newLocalId(), id: undefined, type: 'VIDEO', titleEn: '', titleAr: '', videoUrl: '', durationMinutes: '' });
const emptySection = () => ({ localId: newLocalId(), id: undefined, titleEn: '', titleAr: '', lessons: [emptyLesson()] });

function fromApi(apiSections) {
  if (!apiSections.length) return [emptySection()];
  return apiSections.map((s) => ({
    localId: s.id,
    id: s.id,
    titleEn: s.titleEn,
    titleAr: s.titleAr,
    lessons: s.lessons.map((l) => ({
      localId: l.id,
      id: l.id,
      type: l.type,
      titleEn: l.titleEn,
      titleAr: l.titleAr,
      videoUrl: l.videoUrl ?? '',
      durationMinutes: l.durationSeconds != null ? String(Math.round(l.durationSeconds / 60)) : '',
    })),
  }));
}

function toApi(sections) {
  return sections.map((s) => ({
    ...(s.id ? { id: s.id } : {}),
    titleEn: s.titleEn.trim(),
    titleAr: s.titleAr.trim(),
    lessons: s.lessons.map((l) => ({
      ...(l.id ? { id: l.id } : {}),
      type: l.type,
      titleEn: l.titleEn.trim(),
      titleAr: l.titleAr.trim(),
      ...(l.type === 'VIDEO'
        ? { videoUrl: l.videoUrl.trim(), durationSeconds: Math.max(1, Math.round(Number(l.durationMinutes || 0) * 60)) }
        : {}),
    })),
  }));
}

function totalMinutes(sections) {
  const seconds = sections
    .flatMap((s) => s.lessons)
    .filter((l) => l.type === 'VIDEO')
    .reduce((sum, l) => sum + Number(l.durationMinutes || 0) * 60, 0);
  return Math.round(seconds / 60);
}

function countLessons(sections) {
  return sections.reduce((sum, s) => sum + s.lessons.length, 0);
}

function move(array, index, direction) {
  const target = index + direction;
  if (target < 0 || target >= array.length) return array;
  const next = array.slice();
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

const inputClass =
  'h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-foreground outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15';

/** Bare up/down reorder buttons — matches the gallery image reorder pattern (keyboard-operable, no DnD lib). */
function ReorderButtons({ index, length, onMove, labels }) {
  return (
    <div className="flex shrink-0 flex-col">
      <button
        type="button"
        onClick={() => onMove(index, -1)}
        disabled={index === 0}
        aria-label={labels.earlier}
        className="rounded p-0.5 text-foreground-subtle hover:bg-surface-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronUp className="size-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onMove(index, 1)}
        disabled={index === length - 1}
        aria-label={labels.later}
        className="rounded p-0.5 text-foreground-subtle hover:bg-surface-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * The editable curriculum tree. Owns `sections` as local state, lazily seeded once from
 * `initialSections` (a fresh instance of this component mounts per course id, so there's no
 * stale-data risk — no effect needed to "sync" it).
 */
function CurriculumEditor({ courseId, courseTitle, initialSections, onSaved }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [sections, setSections] = useState(() => fromApi(initialSections));
  const [dirty, setDirty] = useState(false);

  const update = (updater) => {
    setSections(updater);
    setDirty(true);
  };

  const save = useMutation({
    mutationFn: () => saveCourseCurriculum(courseId, toApi(sections)),
    onSuccess: (result) => {
      toast.success(result.message);
      setDirty(false);
      onSaved();
    },
    onError: (error) => toast.error(errorMessage(error, t)),
  });

  const setSection = (index, patch) => update((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  const setLesson = (sectionIndex, lessonIndex, patch) =>
    update((prev) =>
      prev.map((s, i) => (i !== sectionIndex ? s : { ...s, lessons: s.lessons.map((l, j) => (j === lessonIndex ? { ...l, ...patch } : l)) })),
    );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <Layers className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">{t('curriculum.title')}</h1>
          <p className="truncate text-sm text-foreground-subtle">{courseTitle}</p>
        </div>
      </div>

      <p className="mt-4 text-sm text-foreground-muted">
        {t('curriculum.summary', { lessons: countLessons(sections), minutes: totalMinutes(sections) })}
      </p>

      <div className="mt-6 space-y-5">
        {sections.map((section, sectionIndex) => (
          <Card key={section.localId} className="p-5">
            <div className="flex items-start gap-3">
              <ReorderButtons
                index={sectionIndex}
                length={sections.length}
                onMove={(i, dir) => update((prev) => move(prev, i, dir))}
                labels={{ earlier: t('curriculum.sectionMoveEarlier'), later: t('curriculum.sectionMoveLater') }}
              />
              <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                <input
                  dir="ltr"
                  placeholder={t('curriculum.sectionTitleEn')}
                  value={section.titleEn}
                  onChange={(e) => setSection(sectionIndex, { titleEn: e.target.value })}
                  className={cn(inputClass, 'font-medium')}
                />
                <input
                  dir="rtl"
                  placeholder={t('curriculum.sectionTitleAr')}
                  value={section.titleAr}
                  onChange={(e) => setSection(sectionIndex, { titleAr: e.target.value })}
                  className={cn(inputClass, 'font-medium')}
                />
              </div>
              <button
                type="button"
                onClick={() => update((prev) => prev.filter((_, i) => i !== sectionIndex))}
                disabled={sections.length === 1}
                aria-label={t('curriculum.sectionRemove')}
                className="shrink-0 rounded-md p-2 text-foreground-subtle hover:bg-error-soft hover:text-error disabled:pointer-events-none disabled:opacity-30"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>

            <ul className="mt-4 space-y-2.5 border-s-2 border-border ps-4">
              {section.lessons.map((lesson, lessonIndex) => (
                <li key={lesson.localId} className="flex flex-wrap items-start gap-2 rounded-lg bg-surface-muted/60 p-3">
                  <ReorderButtons
                    index={lessonIndex}
                    length={section.lessons.length}
                    onMove={(i, dir) => setSection(sectionIndex, { lessons: move(section.lessons, i, dir) })}
                    labels={{ earlier: t('curriculum.lessonMoveEarlier'), later: t('curriculum.lessonMoveLater') }}
                  />

                  <div className="flex shrink-0 overflow-hidden rounded-md border border-border-strong">
                    {[
                      { value: 'VIDEO', icon: Clapperboard, label: t('curriculum.lessonTypeVideo') },
                      { value: 'QUIZ', icon: HelpCircle, label: t('curriculum.lessonTypeQuiz') },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        aria-pressed={lesson.type === opt.value}
                        aria-label={opt.label}
                        onClick={() => setLesson(sectionIndex, lessonIndex, { type: opt.value })}
                        title={opt.label}
                        className={cn(
                          'grid size-9 place-items-center transition-colors',
                          lesson.type === opt.value ? 'bg-primary text-primary-foreground' : 'bg-surface text-foreground-subtle hover:bg-surface-muted',
                        )}
                      >
                        <opt.icon className="size-4" aria-hidden="true" />
                      </button>
                    ))}
                  </div>

                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                    <input
                      dir="ltr"
                      placeholder={t('curriculum.lessonTitleEn')}
                      value={lesson.titleEn}
                      onChange={(e) => setLesson(sectionIndex, lessonIndex, { titleEn: e.target.value })}
                      className={inputClass}
                    />
                    <input
                      dir="rtl"
                      placeholder={t('curriculum.lessonTitleAr')}
                      value={lesson.titleAr}
                      onChange={(e) => setLesson(sectionIndex, lessonIndex, { titleAr: e.target.value })}
                      className={inputClass}
                    />
                    {lesson.type === 'VIDEO' ? (
                      <>
                        <input
                          dir="ltr"
                          type="url"
                          placeholder={t('curriculum.lessonVideoUrl')}
                          value={lesson.videoUrl}
                          onChange={(e) => setLesson(sectionIndex, lessonIndex, { videoUrl: e.target.value })}
                          className={cn(inputClass, 'sm:col-span-2')}
                        />
                        <input
                          dir="ltr"
                          type="number"
                          min="1"
                          placeholder={t('curriculum.lessonDuration')}
                          value={lesson.durationMinutes}
                          onChange={(e) => setLesson(sectionIndex, lessonIndex, { durationMinutes: e.target.value })}
                          className={cn(inputClass, 'w-32')}
                        />
                      </>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSection(sectionIndex, { lessons: section.lessons.filter((_, j) => j !== lessonIndex) })}
                    disabled={section.lessons.length === 1}
                    aria-label={t('curriculum.lessonRemove')}
                    className="shrink-0 rounded-md p-2 text-foreground-subtle hover:bg-error-soft hover:text-error disabled:pointer-events-none disabled:opacity-30"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => setSection(sectionIndex, { lessons: [...section.lessons, emptyLesson()] })}
            >
              <Plus className="size-3.5" aria-hidden="true" />
              {t('curriculum.lessonAdd')}
            </Button>
          </Card>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="secondary" onClick={() => update((prev) => [...prev, emptySection()])}>
          <Plus className="size-4" aria-hidden="true" />
          {t('curriculum.sectionAdd')}
        </Button>
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            {t('common.cancel')}
          </Button>
          <Button type="button" loading={save.isPending} disabled={!dirty} onClick={() => save.mutate()}>
            {t('curriculum.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Data-fetching shell: loads the course and its curriculum, then hands both to the editor. */
export default function CourseCurriculumPage() {
  const { id } = useParams();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const course = useQuery({ queryKey: courseKeys.detail(id), queryFn: () => getCourse(id) });
  const curriculum = useQuery({ queryKey: courseKeys.curriculum(id), queryFn: () => getCourseCurriculum(id) });

  if (course.isPending || curriculum.isPending) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-9 w-64 animate-pulse rounded-md bg-surface-muted" />
        <div className="mt-8 h-96 animate-pulse rounded-2xl bg-surface-muted" />
      </div>
    );
  }

  if (course.isError || curriculum.isError) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Alert tone="error" title={errorMessage(course.error ?? curriculum.error, t)} />
      </div>
    );
  }

  return (
    <CurriculumEditor
      key={curriculum.dataUpdatedAt}
      courseId={id}
      courseTitle={course.data.titleEn}
      initialSections={curriculum.data}
      onSaved={() => queryClient.invalidateQueries({ queryKey: courseKeys.curriculum(id) })}
    />
  );
}

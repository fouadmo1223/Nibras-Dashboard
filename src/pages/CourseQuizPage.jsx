import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { CheckCircle2, ChevronLeft, Download, FileText, ListChecks, Plus, Trash2 } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import BilingualInput from '@/components/ui/BilingualInput';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useI18n } from '@/i18n/I18nProvider';
import { errorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/cn';
import { courseKeys, getCourse, getCourseCurriculum } from '@/services/courses.service';
import {
  getQuizQuestions,
  gradeQuizSubmission,
  listQuizAttempts,
  listQuizSubmissions,
  quizKeys,
  quizSubmissionDownloadUrl,
  saveQuizQuestions,
  setQuizConfig,
} from '@/services/quizzes.service';
import { toast } from '@/stores/toast-store';

const inputClass =
  'h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-foreground outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15';

let localIdSeq = 0;
const newLocalId = () => `new-${Date.now()}-${localIdSeq++}`;
const emptyOption = () => ({ localId: newLocalId(), id: undefined, textEn: '', textAr: '', isCorrect: false });
const emptyQuestion = () => ({ localId: newLocalId(), id: undefined, textEn: '', textAr: '', options: [emptyOption(), emptyOption()] });

function questionsFromApi(apiQuestions) {
  if (!apiQuestions.length) return [emptyQuestion()];
  return apiQuestions.map((q) => ({
    localId: q.id,
    id: q.id,
    textEn: q.textEn,
    textAr: q.textAr,
    options: q.options.map((o) => ({ localId: o.id, id: o.id, textEn: o.textEn, textAr: o.textAr, isCorrect: o.isCorrect })),
  }));
}

function questionsToApi(questions) {
  return questions.map((q) => ({
    ...(q.id ? { id: q.id } : {}),
    textEn: q.textEn.trim(),
    textAr: q.textAr.trim(),
    options: q.options.map((o) => ({ ...(o.id ? { id: o.id } : {}), textEn: o.textEn.trim(), textAr: o.textAr.trim(), isCorrect: o.isCorrect })),
  }));
}

/** Mode + mode-specific settings (question count, or max upload size). */
function ConfigSection({ courseId, lessonId, lesson, onConfigured }) {
  const { t } = useI18n();
  const [mode, setMode] = useState(lesson.quizMode ?? '');
  const [questionCount, setQuestionCount] = useState(lesson.quizQuestionCount ?? 10);
  const [uploadMaxMb, setUploadMaxMb] = useState(lesson.uploadMaxBytes ? Math.round(lesson.uploadMaxBytes / 1024 / 1024) : 50);

  const save = useMutation({
    mutationFn: () => {
      const body = mode === 'MCQ' ? { mode, questionCount: Number(questionCount) } : mode === 'UPLOAD' ? { mode, uploadMaxMb: Number(uploadMaxMb) } : {};
      return setQuizConfig(courseId, lessonId, body);
    },
    onSuccess: (result) => {
      toast.success(result.message);
      onConfigured();
    },
    onError: (error) => toast.error(errorMessage(error, t)),
  });

  const MODES = [
    { value: '', label: t('quiz.modeNone') },
    { value: 'MCQ', label: t('quiz.modeMcq') },
    { value: 'UPLOAD', label: t('quiz.modeUpload') },
  ];

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-foreground">{t('quiz.modeLabel')}</h2>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        {MODES.map((opt) => (
          <button
            key={opt.value || 'none'}
            type="button"
            onClick={() => setMode(opt.value)}
            aria-pressed={mode === opt.value}
            className={cn(
              'flex-1 rounded-lg border px-4 py-3 text-start text-sm font-medium transition-colors',
              mode === opt.value
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-border-strong bg-surface text-foreground-muted hover:bg-surface-muted',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {mode === 'MCQ' ? (
        <div className="mt-4 max-w-xs">
          <label className="block text-sm text-foreground-subtle" htmlFor="quiz-question-count">
            {t('quiz.questionCount')}
          </label>
          <input
            id="quiz-question-count"
            type="number"
            min="1"
            value={questionCount}
            onChange={(e) => setQuestionCount(e.target.value)}
            className={cn(inputClass, 'mt-1.5')}
          />
          <p className="mt-1.5 text-xs text-foreground-subtle">{t('quiz.questionCountHint')}</p>
        </div>
      ) : null}

      {mode === 'UPLOAD' ? (
        <div className="mt-4 max-w-xs">
          <label className="block text-sm text-foreground-subtle" htmlFor="quiz-upload-max">
            {t('quiz.uploadMaxMb')}
          </label>
          <input
            id="quiz-upload-max"
            type="number"
            min="1"
            value={uploadMaxMb}
            onChange={(e) => setUploadMaxMb(e.target.value)}
            className={cn(inputClass, 'mt-1.5')}
          />
        </div>
      ) : null}

      <Button type="button" className="mt-5" loading={save.isPending} onClick={() => save.mutate()}>
        {t('quiz.saveConfig')}
      </Button>
    </Card>
  );
}

/** The MCQ question bank: local editable state, lazily seeded from the server (fresh instance per save via `key`). */
function QuestionBankEditor({ courseId, lessonId, initialQuestions, onSaved }) {
  const { t } = useI18n();
  const [questions, setQuestions] = useState(() => questionsFromApi(initialQuestions));

  const save = useMutation({
    mutationFn: () => saveQuizQuestions(courseId, lessonId, questionsToApi(questions)),
    onSuccess: (result) => {
      toast.success(result.message);
      onSaved();
    },
    onError: (error) => toast.error(errorMessage(error, t)),
  });

  const setQuestion = (qIndex, patch) => setQuestions((prev) => prev.map((q, i) => (i === qIndex ? { ...q, ...patch } : q)));
  const setOption = (qIndex, oIndex, patch) =>
    setQuestions((prev) =>
      prev.map((q, i) => (i !== qIndex ? q : { ...q, options: q.options.map((o, j) => (j === oIndex ? { ...o, ...patch } : o)) })),
    );
  const setCorrect = (qIndex, oIndex) =>
    setQuestions((prev) =>
      prev.map((q, i) => (i !== qIndex ? q : { ...q, options: q.options.map((o, j) => ({ ...o, isCorrect: j === oIndex })) })),
    );

  return (
    <Card className="mt-6 p-5">
      <h2 className="text-sm font-semibold text-foreground">{t('quiz.questionBank.title')}</h2>
      <p className="mt-1 text-xs text-foreground-subtle">{t('quiz.questionBank.hint')}</p>

      <div className="mt-4 space-y-4">
        {questions.map((q, qIndex) => (
          <div key={q.localId} className="rounded-xl border border-border bg-surface-muted/60 p-4">
            <div className="flex items-start gap-2">
              <BilingualInput
                className="min-w-0 flex-1"
                inputClassNameOverride={cn(inputClass, 'font-medium')}
                placeholderEn={t('quiz.questionBank.questionTitleEn')}
                placeholderAr={t('quiz.questionBank.questionTitleAr')}
                valueEn={q.textEn}
                valueAr={q.textAr}
                onChangeEn={(v) => setQuestion(qIndex, { textEn: v })}
                onChangeAr={(v) => setQuestion(qIndex, { textAr: v })}
              />
              <button
                type="button"
                onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qIndex))}
                disabled={questions.length === 1}
                aria-label={t('quiz.questionBank.questionRemove')}
                className="shrink-0 rounded-md p-2 text-foreground-subtle hover:bg-error-soft hover:text-error disabled:pointer-events-none disabled:opacity-30"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {q.options.map((o, oIndex) => (
                <div key={o.localId} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCorrect(qIndex, oIndex)}
                    aria-pressed={o.isCorrect}
                    aria-label={t('quiz.questionBank.optionCorrect')}
                    title={t('quiz.questionBank.optionCorrect')}
                    className={cn(
                      'grid size-9 shrink-0 place-items-center rounded-md border transition-colors',
                      o.isCorrect
                        ? 'border-success bg-success-soft text-success'
                        : 'border-border-strong text-foreground-subtle hover:bg-surface-muted',
                    )}
                  >
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                  </button>
                  <BilingualInput
                    className="min-w-0 flex-1"
                    inputClassNameOverride={inputClass}
                    placeholderEn={t('quiz.questionBank.optionTextEn')}
                    placeholderAr={t('quiz.questionBank.optionTextAr')}
                    valueEn={o.textEn}
                    valueAr={o.textAr}
                    onChangeEn={(v) => setOption(qIndex, oIndex, { textEn: v })}
                    onChangeAr={(v) => setOption(qIndex, oIndex, { textAr: v })}
                  />
                  <button
                    type="button"
                    onClick={() => setQuestion(qIndex, { options: q.options.filter((_, j) => j !== oIndex) })}
                    disabled={q.options.length === 2}
                    aria-label={t('quiz.questionBank.optionRemove')}
                    className="shrink-0 rounded-md p-2 text-foreground-subtle hover:bg-error-soft hover:text-error disabled:pointer-events-none disabled:opacity-30"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" onClick={() => setQuestion(qIndex, { options: [...q.options, emptyOption()] })}>
                <Plus className="size-3.5" aria-hidden="true" />
                {t('quiz.questionBank.optionAdd')}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Button type="button" variant="secondary" onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}>
          <Plus className="size-4" aria-hidden="true" />
          {t('quiz.questionBank.questionAdd')}
        </Button>
        <Button type="button" loading={save.isPending} onClick={() => save.mutate()}>
          {t('quiz.questionBank.save')}
        </Button>
      </div>
    </Card>
  );
}

function SubmissionRow({ submission }) {
  const { t, format } = useI18n();
  const queryClient = useQueryClient();
  const [grade, setGrade] = useState(submission.gradePercent ?? '');
  const [feedback, setFeedback] = useState(submission.feedback ?? '');

  const save = useMutation({
    mutationFn: () => gradeQuizSubmission(submission.id, { gradePercent: Number(grade), feedback: feedback.trim() || undefined }),
    onSuccess: (result) => {
      toast.success(result.message);
      queryClient.invalidateQueries({ queryKey: quizKeys.all });
    },
    onError: (error) => toast.error(errorMessage(error, t)),
  });

  return (
    <li className="flex flex-wrap items-start gap-4 rounded-xl border border-border bg-surface-muted/60 p-4">
      <div className="min-w-48 flex-1">
        <p className="font-medium text-foreground">{submission.enrollment.user.name}</p>
        <p className="text-sm text-foreground-subtle">{submission.enrollment.user.email}</p>
        <p className="mt-1 text-xs text-foreground-subtle">{format.date(submission.submittedAt, { dateStyle: 'medium', timeStyle: 'short' })}</p>
        {submission.gradedAt ? (
          <p className="mt-1 text-xs font-medium text-success">{t('quiz.submissions.saved')}</p>
        ) : (
          <p className="mt-1 text-xs text-foreground-subtle">{t('quiz.submissions.ungraded')}</p>
        )}
      </div>
      <a
        href={quizSubmissionDownloadUrl(submission.id)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-border-strong px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
      >
        <Download className="size-4" aria-hidden="true" />
        {t('quiz.submissions.download')}
      </a>
      <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
        <div>
          <label className="block text-xs text-foreground-subtle">{t('quiz.submissions.grade')}</label>
          <input
            type="number"
            min="0"
            max="100"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className={cn(inputClass, 'mt-1 w-24')}
          />
        </div>
        <div className="min-w-48 flex-1">
          <label className="block text-xs text-foreground-subtle">{t('quiz.submissions.feedback')}</label>
          <input type="text" value={feedback} onChange={(e) => setFeedback(e.target.value)} className={cn(inputClass, 'mt-1')} />
        </div>
        <Button type="button" size="sm" loading={save.isPending} disabled={grade === ''} onClick={() => save.mutate()}>
          {t('quiz.submissions.save')}
        </Button>
      </div>
    </li>
  );
}

function SubmissionsSection({ courseId, lessonId }) {
  const { t } = useI18n();
  const submissions = useQuery({ queryKey: quizKeys.submissions(courseId, lessonId), queryFn: () => listQuizSubmissions(courseId, lessonId) });
  const rows = submissions.data ?? [];

  return (
    <Card className="mt-6 p-5">
      <h2 className="text-sm font-semibold text-foreground">{t('quiz.submissions.title')}</h2>
      {submissions.isPending ? (
        <div className="mt-4 h-16 animate-pulse rounded-xl bg-surface-muted" />
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-foreground-subtle">{t('quiz.submissions.empty')}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((s) => (
            <SubmissionRow key={s.id} submission={s} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function AttemptsSection({ courseId, lessonId }) {
  const { t, format } = useI18n();
  const attempts = useQuery({ queryKey: quizKeys.attempts(courseId, lessonId), queryFn: () => listQuizAttempts(courseId, lessonId) });
  const rows = attempts.data ?? [];

  return (
    <Card className="mt-6 p-5">
      <h2 className="text-sm font-semibold text-foreground">{t('quiz.attempts.title')}</h2>
      {attempts.isPending ? (
        <div className="mt-4 h-16 animate-pulse rounded-xl bg-surface-muted" />
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-foreground-subtle">{t('quiz.attempts.empty')}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface-muted/60 p-4">
              <div className="min-w-48 flex-1">
                <p className="font-medium text-foreground">{a.enrollment.user.name}</p>
                <p className="text-sm text-foreground-subtle">{a.enrollment.user.email}</p>
                <p className="mt-1 text-xs text-foreground-subtle">{format.date(a.startedAt, { dateStyle: 'medium', timeStyle: 'short' })}</p>
              </div>
              <span
                className={cn(
                  'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium',
                  a.submittedAt ? 'bg-success-soft text-success' : 'bg-surface-muted text-foreground-muted',
                )}
              >
                {a.submittedAt ? `${a.scorePercent}%` : t('quiz.attempts.inProgress')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Data-fetching shell: course + curriculum (to find this lesson's current quiz config), then the config/bank/submissions below it. */
export default function CourseQuizPage() {
  const { id: courseId, lessonId } = useParams();
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const course = useQuery({ queryKey: courseKeys.detail(courseId), queryFn: () => getCourse(courseId) });
  const curriculum = useQuery({ queryKey: courseKeys.curriculum(courseId), queryFn: () => getCourseCurriculum(courseId) });
  const lesson = curriculum.data?.flatMap((s) => s.lessons).find((l) => l.id === lessonId);

  const questions = useQuery({
    queryKey: quizKeys.questions(courseId, lessonId),
    queryFn: () => getQuizQuestions(courseId, lessonId),
    enabled: lesson?.quizMode === 'MCQ',
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: courseKeys.curriculum(courseId) });
    queryClient.invalidateQueries({ queryKey: quizKeys.all });
  };

  if (course.isPending || curriculum.isPending) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-9 w-64 animate-pulse rounded-md bg-surface-muted" />
        <div className="mt-8 h-64 animate-pulse rounded-2xl bg-surface-muted" />
      </div>
    );
  }

  if (course.isError || curriculum.isError || !lesson) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Alert tone="error" title={course.isError || curriculum.isError ? errorMessage(course.error ?? curriculum.error, t) : t('quiz.title')} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground-subtle hover:text-foreground"
      >
        <ChevronLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        {t('quiz.backToCurriculum')}
      </button>

      <div className="mt-3 flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          {lesson.quizMode === 'UPLOAD' ? <FileText className="size-5" aria-hidden="true" /> : <ListChecks className="size-5" aria-hidden="true" />}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">{t('quiz.title')}</h1>
          <p className="truncate text-sm text-foreground-subtle">{lesson.titleEn}</p>
        </div>
      </div>

      <div className="mt-6">
        <ConfigSection key={`${lesson.quizMode}-${lesson.quizQuestionCount}-${lesson.uploadMaxBytes}`} courseId={courseId} lessonId={lessonId} lesson={lesson} onConfigured={invalidateAll} />
      </div>

      {lesson.quizMode === 'MCQ' ? (
        questions.isPending ? (
          <div className="mt-6 h-40 animate-pulse rounded-2xl bg-surface-muted" />
        ) : questions.isError ? (
          <Alert tone="error" title={errorMessage(questions.error, t)} className="mt-6" />
        ) : (
          <QuestionBankEditor
            key={questions.dataUpdatedAt}
            courseId={courseId}
            lessonId={lessonId}
            initialQuestions={questions.data}
            onSaved={() => queryClient.invalidateQueries({ queryKey: quizKeys.questions(courseId, lessonId) })}
          />
        )
      ) : null}

      {lesson.quizMode === 'MCQ' ? <AttemptsSection courseId={courseId} lessonId={lessonId} /> : null}
      {lesson.quizMode === 'UPLOAD' ? <SubmissionsSection courseId={courseId} lessonId={lessonId} /> : null}
    </div>
  );
}

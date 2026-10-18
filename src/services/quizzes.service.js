import { apiRequest, API_URL } from './api-client';

export const quizKeys = {
  all: ['quizzes'],
  questions: (courseId, lessonId) => [...quizKeys.all, 'questions', courseId, lessonId],
  submissions: (courseId, lessonId) => [...quizKeys.all, 'submissions', courseId, lessonId],
  attempts: (courseId, lessonId) => [...quizKeys.all, 'attempts', courseId, lessonId],
};

export const setQuizConfig = (courseId, lessonId, body) => apiRequest(`/admin/courses/${courseId}/lessons/${lessonId}/quiz`, { method: 'PUT', body });

export const getQuizQuestions = (courseId, lessonId) => apiRequest(`/admin/courses/${courseId}/lessons/${lessonId}/questions`).then((r) => r.data);
export const saveQuizQuestions = (courseId, lessonId, questions) =>
  apiRequest(`/admin/courses/${courseId}/lessons/${lessonId}/questions`, { method: 'PUT', body: { questions } });

export const listQuizSubmissions = (courseId, lessonId) =>
  apiRequest(`/admin/courses/${courseId}/lessons/${lessonId}/submissions`).then((r) => r.data);
export const gradeQuizSubmission = (submissionId, body) => apiRequest(`/admin/quiz-submissions/${submissionId}/grade`, { method: 'PATCH', body });

export const listQuizAttempts = (courseId, lessonId) =>
  apiRequest(`/admin/courses/${courseId}/lessons/${lessonId}/attempts`).then((r) => r.data);

/** A plain authenticated GET URL — the browser sends the session cookie on normal navigation, same as an <img> tag. */
export const quizSubmissionDownloadUrl = (submissionId) => `${API_URL}/admin/quiz-submissions/${submissionId}/download`;

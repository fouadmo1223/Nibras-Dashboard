import { createBrowserRouter } from 'react-router';
import NotFoundPage from '@/pages/NotFoundPage';
import RouteErrorPage from '@/pages/RouteErrorPage';

/** Route modules load on demand so the initial bundle stays small as admin modules grow. */
const page = (load) => async () => ({ Component: (await load()).default });

/** Signed-in frame: RequireAuth (dashboard.access) around the sidebar/top-bar shell. */
async function loadShell() {
  const [{ default: RequireAuth }, { default: AppShell }] = await Promise.all([
    import('@/features/auth/RequireAuth'),
    import('@/layouts/AppShell'),
  ]);
  return {
    Component: () => (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
  };
}

// `handle.crumb` is the message key shown in the breadcrumbs.
export const routes = [
  {
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/login', lazy: page(() => import('@/pages/LoginPage')) },
      { path: '/forgot-password', lazy: page(() => import('@/pages/ForgotPasswordPage')) },
      {
        path: '/',
        lazy: loadShell,
        children: [
          { index: true, lazy: page(() => import('@/pages/OverviewPage')), handle: { crumb: 'nav.overview' } },
          {
            path: 'categories',
            handle: { crumb: 'nav.categories' },
            children: [
              { index: true, lazy: page(() => import('@/pages/CategoriesPage')) },
              { path: 'new', lazy: page(() => import('@/pages/CategoryFormPage')), handle: { crumb: 'categories.new' } },
              { path: ':id', lazy: page(() => import('@/pages/CategoryFormPage')), handle: { crumb: 'categories.edit' } },
            ],
          },
          {
            // Admin moderation: view any course, remove with a reason. Editing stays with its instructor.
            path: 'courses',
            handle: { crumb: 'nav.courses' },
            children: [
              { index: true, lazy: page(() => import('@/pages/CoursesPage')) },
              { path: ':id', lazy: page(() => import('@/pages/CourseFormPage')), handle: { crumb: 'courses.view' } },
            ],
          },
          {
            // An instructor's own courses: create, edit, publish and manage curriculum/quizzes.
            path: 'my-courses',
            handle: { crumb: 'nav.myCourses' },
            children: [
              { index: true, lazy: page(() => import('@/pages/MyCoursesPage')) },
              { path: 'new', lazy: page(() => import('@/pages/CourseFormPage')), handle: { crumb: 'courses.new' } },
              { path: ':id', lazy: page(() => import('@/pages/CourseFormPage')), handle: { crumb: 'courses.edit' } },
              { path: ':id/curriculum', lazy: page(() => import('@/pages/CourseCurriculumPage')), handle: { crumb: 'curriculum.title' } },
              { path: ':id/lessons/:lessonId/quiz', lazy: page(() => import('@/pages/CourseQuizPage')), handle: { crumb: 'quiz.title' } },
            ],
          },
          {
            path: 'instructors',
            handle: { crumb: 'nav.instructors' },
            children: [
              { index: true, lazy: page(() => import('@/pages/InstructorsPage')) },
              { path: 'new', lazy: page(() => import('@/pages/InstructorFormPage')), handle: { crumb: 'instructors.new' } },
              { path: ':id', lazy: page(() => import('@/pages/InstructorFormPage')), handle: { crumb: 'instructors.edit' } },
            ],
          },
          { path: 'orders', lazy: page(() => import('@/pages/OrdersPage')), handle: { crumb: 'nav.orders' } },
          { path: 'coupons', lazy: page(() => import('@/pages/CouponsPage')), handle: { crumb: 'nav.coupons' } },
          { path: 'reviews', lazy: page(() => import('@/pages/ReviewsPage')), handle: { crumb: 'nav.reviews' } },
          { path: 'analytics', lazy: page(() => import('@/pages/AnalyticsPage')), handle: { crumb: 'nav.analytics' } },
          { path: 'users', lazy: page(() => import('@/pages/UsersPage')), handle: { crumb: 'nav.users' } },
          { path: 'roles', lazy: page(() => import('@/pages/RolesPage')), handle: { crumb: 'nav.roles' } },
          { path: 'audit-log', lazy: page(() => import('@/pages/AuditLogPage')), handle: { crumb: 'nav.auditLog' } },
          { path: 'settings', lazy: page(() => import('@/pages/SettingsPage')), handle: { crumb: 'nav.settings' } },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);

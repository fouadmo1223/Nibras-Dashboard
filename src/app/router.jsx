import { createBrowserRouter } from 'react-router';
import FoundationPage from '@/pages/FoundationPage';
import NotFoundPage from '@/pages/NotFoundPage';

export const routes = [
  { path: '/', element: <FoundationPage /> },
  { path: '*', element: <NotFoundPage /> },
];

export const router = createBrowserRouter(routes);

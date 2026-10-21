import { apiRequest } from './api-client';

export const reviewKeys = {
  all: ['reviews'],
  admin: (query) => [...reviewKeys.all, 'admin', query],
};

/** Returns `{ items, pagination }` — filterable by rating/courseId/instructorId/q, paged. */
export const listReviews = (query) =>
  apiRequest('/admin/reviews', { query }).then((r) => ({ items: r.data, pagination: r.meta.pagination }));
export const removeReview = (id) => apiRequest(`/admin/reviews/${id}`, { method: 'DELETE' });

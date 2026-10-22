import { API_URL, apiRequest } from './api-client';

export const analyticsKeys = {
  all: ['analytics'],
  summary: (query) => [...analyticsKeys.all, 'summary', query],
  revenue: (query) => [...analyticsKeys.all, 'revenue', query],
  enrollments: (query) => [...analyticsKeys.all, 'enrollments', query],
  topCourses: (query) => [...analyticsKeys.all, 'top-courses', query],
};

export const getAnalyticsSummary = (query) => apiRequest('/admin/analytics/summary', { query }).then((r) => r.data);
export const getRevenueOverTime = (query) => apiRequest('/admin/analytics/revenue', { query }).then((r) => r.data);
export const getEnrollmentsOverTime = (query) => apiRequest('/admin/analytics/enrollments', { query }).then((r) => r.data);
export const getTopCourses = (query) => apiRequest('/admin/analytics/top-courses', { query }).then((r) => r.data);

/** Builds the PDF export URL for the current filters — opened directly so the browser handles the download. */
export const analyticsExportUrl = (query) => {
  const url = new URL(`${API_URL}/admin/analytics/export`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }
  return url.toString();
};

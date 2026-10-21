import { apiRequest } from './api-client';

export const analyticsKeys = {
  all: ['analytics'],
  summary: () => [...analyticsKeys.all, 'summary'],
  revenue: (days) => [...analyticsKeys.all, 'revenue', days],
  enrollments: (days) => [...analyticsKeys.all, 'enrollments', days],
  topCourses: (by, limit) => [...analyticsKeys.all, 'top-courses', by, limit],
};

export const getAnalyticsSummary = () => apiRequest('/admin/analytics/summary').then((r) => r.data);
export const getRevenueOverTime = (days) => apiRequest('/admin/analytics/revenue', { query: { days } }).then((r) => r.data);
export const getEnrollmentsOverTime = (days) => apiRequest('/admin/analytics/enrollments', { query: { days } }).then((r) => r.data);
export const getTopCourses = (by, limit) => apiRequest('/admin/analytics/top-courses', { query: { by, limit } }).then((r) => r.data);

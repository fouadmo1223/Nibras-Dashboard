import { apiRequest } from './api-client';

export const courseKeys = {
  all: ['courses'],
  admin: () => [...courseKeys.all, 'admin'],
  detail: (id) => [...courseKeys.all, 'admin', id],
};

export const listCourses = () => apiRequest('/admin/courses').then((r) => r.data);
export const getCourse = (id) => apiRequest(`/admin/courses/${id}`).then((r) => r.data);
export const createCourse = (body) => apiRequest('/admin/courses', { method: 'POST', body });
export const updateCourse = (id, body) => apiRequest(`/admin/courses/${id}`, { method: 'PATCH', body });

export function uploadCourseImage(id, file) {
  const body = new FormData();
  body.append('image', file);
  return apiRequest(`/admin/courses/${id}/image`, { method: 'POST', body });
}

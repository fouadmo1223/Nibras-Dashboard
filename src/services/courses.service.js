import { apiRequest } from './api-client';

export const courseKeys = {
  all: ['courses'],
  admin: () => [...courseKeys.all, 'admin'],
  mine: () => [...courseKeys.all, 'mine'],
  detail: (id) => [...courseKeys.all, 'admin', id],
  curriculum: (id) => [...courseKeys.all, 'admin', id, 'curriculum'],
};

export const listCourses = () => apiRequest('/admin/courses').then((r) => r.data);
export const listMyCourses = () => apiRequest('/admin/courses/mine').then((r) => r.data);
export const getCourse = (id) => apiRequest(`/admin/courses/${id}`).then((r) => r.data);
export const createCourse = (body) => apiRequest('/admin/courses', { method: 'POST', body });
export const updateCourse = (id, body) => apiRequest(`/admin/courses/${id}`, { method: 'PATCH', body });

export const getCourseCurriculum = (id) => apiRequest(`/admin/courses/${id}/curriculum`).then((r) => r.data);
export const saveCourseCurriculum = (id, sections) => apiRequest(`/admin/courses/${id}/curriculum`, { method: 'PUT', body: { sections } });

export function uploadCourseImage(id, file) {
  const body = new FormData();
  body.append('image', file);
  return apiRequest(`/admin/courses/${id}/image`, { method: 'POST', body });
}

export function addCourseGalleryImage(id, file) {
  const body = new FormData();
  body.append('image', file);
  return apiRequest(`/admin/courses/${id}/images`, { method: 'POST', body });
}

export const removeCourseGalleryImage = (id, imageId) => apiRequest(`/admin/courses/${id}/images/${imageId}`, { method: 'DELETE' });

export const reorderCourseGalleryImages = (id, imageIds) =>
  apiRequest(`/admin/courses/${id}/images/reorder`, { method: 'PATCH', body: { imageIds } });

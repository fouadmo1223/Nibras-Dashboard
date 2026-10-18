import { apiRequest, apiUpload } from './api-client';

export const courseKeys = {
  all: ['courses'],
  admin: () => [...courseKeys.all, 'admin'],
  mine: () => [...courseKeys.all, 'mine'],
  myStats: () => [...courseKeys.all, 'mine', 'stats'],
  detail: (id) => [...courseKeys.all, 'admin', id],
  curriculum: (id) => [...courseKeys.all, 'admin', id, 'curriculum'],
  removals: () => [...courseKeys.all, 'removals'],
};

export const listCourses = () => apiRequest('/admin/courses').then((r) => r.data);
export const listMyCourses = () => apiRequest('/admin/courses/mine').then((r) => r.data);
export const getMyCourseStats = () => apiRequest('/admin/courses/mine/stats').then((r) => r.data);
export const getCourse = (id) => apiRequest(`/admin/courses/${id}`).then((r) => r.data);
export const createCourse = (body) => apiRequest('/admin/courses', { method: 'POST', body });
export const updateCourse = (id, body) => apiRequest(`/admin/courses/${id}`, { method: 'PATCH', body });
export const removeCourse = (id, reason) => apiRequest(`/admin/courses/${id}`, { method: 'DELETE', body: { reason } });
export const approveCoursePublish = (id) => apiRequest(`/admin/courses/${id}/approve`, { method: 'PATCH' });
export const rejectCoursePublish = (id, reason) => apiRequest(`/admin/courses/${id}/reject`, { method: 'PATCH', body: { reason } });

export const listMyCourseRemovals = () => apiRequest('/me/course-removals').then((r) => r.data);
export const acknowledgeCourseRemoval = (id) => apiRequest(`/me/course-removals/${id}/acknowledge`, { method: 'PATCH' });

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

export function uploadLessonVideo(courseId, lessonId, file, onProgress) {
  const body = new FormData();
  body.append('video', file);
  return apiUpload(`/admin/courses/${courseId}/lessons/${lessonId}/video`, body, { onProgress });
}

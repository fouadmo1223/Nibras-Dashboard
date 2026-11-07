import { apiRequest, ApiError } from './api-client';

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

/** Raw PUT straight to the presigned URL — never through apiRequest/apiUpload: this isn't our API, and attaching our own auth headers would risk invalidating the upload's signature. */
function putDirect(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new ApiError(0, { error: { code: 'NETWORK_ERROR', message: 'Unable to reach the server.' } }));
    };
    xhr.onerror = () => reject(new ApiError(0, { error: { code: 'NETWORK_ERROR', message: 'Unable to reach the server.' } }));
    xhr.send(file);
  });
}

/**
 * Large lesson videos can far exceed what a serverless Function can accept as a request body, so
 * this uploads straight to storage instead of proxying the bytes through our API: get a
 * presigned URL (1), PUT the file directly to it (2), then tell the API the upload is done (3)
 * so it can verify the file and point the lesson at it.
 */
export async function uploadLessonVideo(courseId, lessonId, file, onProgress) {
  const { data } = await apiRequest(`/admin/courses/${courseId}/lessons/${lessonId}/video/upload-url`, {
    method: 'POST',
    body: { contentType: file.type },
  });
  onProgress?.(0);
  await putDirect(data.uploadUrl, file, onProgress);
  return apiRequest(`/admin/courses/${courseId}/lessons/${lessonId}/video/complete`, {
    method: 'POST',
    body: { key: data.key },
  });
}

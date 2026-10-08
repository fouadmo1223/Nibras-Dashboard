import { apiRequest } from './api-client';

export const instructorKeys = {
  all: ['instructors'],
  admin: () => [...instructorKeys.all, 'admin'],
};

export const listInstructors = () => apiRequest('/admin/instructors').then((r) => r.data);
export const addInstructor = (body) => apiRequest('/admin/instructors', { method: 'POST', body });
export const updateInstructor = (id, body) => apiRequest(`/admin/instructors/${id}`, { method: 'PATCH', body });

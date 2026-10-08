import { apiRequest } from './api-client';

export const categoryKeys = {
  all: ['categories'],
  admin: () => [...categoryKeys.all, 'admin'],
  detail: (id) => [...categoryKeys.all, 'admin', id],
};

export const listCategories = () => apiRequest('/admin/categories').then((r) => r.data);
export const getCategory = (id) => apiRequest(`/admin/categories/${id}`).then((r) => r.data);
export const createCategory = (body) => apiRequest('/admin/categories', { method: 'POST', body });
export const updateCategory = (id, body) => apiRequest(`/admin/categories/${id}`, { method: 'PATCH', body });

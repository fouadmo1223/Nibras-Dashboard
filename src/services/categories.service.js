import { apiRequest } from './api-client';

export const categoryKeys = {
  all: ['categories'],
  admin: () => [...categoryKeys.all, 'admin'],
  public: () => [...categoryKeys.all, 'public'],
  detail: (id) => [...categoryKeys.all, 'admin', id],
};

export const listCategories = () => apiRequest('/admin/categories').then((r) => r.data);
/** Published categories only — for an instructor picking a category when they don't hold CATEGORIES_MANAGE. */
export const listPublicCategories = () => apiRequest('/categories').then((r) => r.data);
export const getCategory = (id) => apiRequest(`/admin/categories/${id}`).then((r) => r.data);
export const createCategory = (body) => apiRequest('/admin/categories', { method: 'POST', body });
export const updateCategory = (id, body) => apiRequest(`/admin/categories/${id}`, { method: 'PATCH', body });

export function uploadCategoryImage(id, file) {
  const body = new FormData();
  body.append('image', file);
  return apiRequest(`/admin/categories/${id}/image`, { method: 'POST', body });
}

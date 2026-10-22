import { apiRequest } from './api-client';

export const roleKeys = {
  all: ['roles'],
  admin: () => [...roleKeys.all, 'admin'],
  permissions: () => [...roleKeys.all, 'permissions'],
};

export const listRoles = () => apiRequest('/admin/roles').then((r) => r.data);
export const listPermissions = () => apiRequest('/admin/permissions').then((r) => r.data);
export const createRole = (body) => apiRequest('/admin/roles', { method: 'POST', body });
export const updateRole = (id, body) => apiRequest(`/admin/roles/${id}`, { method: 'PATCH', body });
export const deleteRole = (id) => apiRequest(`/admin/roles/${id}`, { method: 'DELETE' });

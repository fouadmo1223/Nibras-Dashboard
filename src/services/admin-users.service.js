import { apiRequest } from './api-client';

export const adminUserKeys = {
  all: ['admin-users'],
  list: (query) => [...adminUserKeys.all, 'list', query],
};

/** Returns `{ items, pagination }` — every user, filterable by name/email, role or status, paged. */
export const listUsers = (query) => apiRequest('/admin/users', { query }).then((r) => ({ items: r.data, pagination: r.meta.pagination }));
export const setUserStatus = (id, body) => apiRequest(`/admin/users/${id}/status`, { method: 'PATCH', body });
export const updateUserRoles = (id, roleIds) => apiRequest(`/admin/users/${id}/roles`, { method: 'PATCH', body: { roleIds } });

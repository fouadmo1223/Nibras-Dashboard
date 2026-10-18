import { apiRequest } from './api-client';

export const orderKeys = {
  all: ['orders'],
  admin: () => [...orderKeys.all, 'admin'],
};

export const listOrders = (status) => apiRequest(`/admin/orders${status ? `?status=${status}` : ''}`).then((r) => r.data);
export const markOrderPaid = (id) => apiRequest(`/admin/orders/${id}/mark-paid`, { method: 'PATCH' });
export const cancelOrder = (id) => apiRequest(`/admin/orders/${id}/cancel`, { method: 'PATCH' });

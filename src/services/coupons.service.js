import { apiRequest } from './api-client';

export const couponKeys = {
  all: ['coupons'],
  admin: () => [...couponKeys.all, 'admin'],
};

export const listCoupons = () => apiRequest('/admin/coupons').then((r) => r.data);
export const createCoupon = (body) => apiRequest('/admin/coupons', { method: 'POST', body });
export const updateCoupon = (id, body) => apiRequest(`/admin/coupons/${id}`, { method: 'PATCH', body });

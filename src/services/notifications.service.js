import { apiRequest } from './api-client';

export const notificationKeys = {
  all: ['notifications'],
  mine: (query) => [...notificationKeys.all, 'mine', query],
  unreadCount: () => [...notificationKeys.all, 'unread-count'],
};

/** Returns `{ items, pagination }` — the current user's own notifications, newest first. */
export const listMyNotifications = (query) =>
  apiRequest('/notifications', { query }).then((r) => ({ items: r.data, pagination: r.meta.pagination }));
export const getUnreadNotificationCount = () => apiRequest('/notifications/unread-count').then((r) => r.data.count);
export const markNotificationRead = (id) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
export const markAllNotificationsRead = () => apiRequest('/notifications/read-all', { method: 'POST' });

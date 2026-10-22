import { apiRequest } from './api-client';

export const auditLogKeys = {
  all: ['audit-logs'],
  list: (query) => [...auditLogKeys.all, 'list', query],
};

/** Returns `{ items, pagination }` — every audit entry, newest first, filterable, paged. */
export const listAuditLogs = (query) => apiRequest('/admin/audit-logs', { query }).then((r) => ({ items: r.data, pagination: r.meta.pagination }));

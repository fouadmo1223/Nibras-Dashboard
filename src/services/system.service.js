import { apiRequest } from './api-client';

export const systemKeys = {
  all: ['system'],
  health: () => [...systemKeys.all, 'health'],
};

export async function getApiHealth({ signal } = {}) {
  const { data } = await apiRequest('/health', { signal });
  return data;
}

import { apiRequest } from './api-client';

export const systemKeys = {
  all: ['system'],
  health: () => [...systemKeys.all, 'health'],
  homeStats: () => [...systemKeys.all, 'home-stats'],
};

export async function getApiHealth({ signal } = {}) {
  const { data } = await apiRequest('/health', { signal });
  return data;
}

/** Platform counters (real database counts) for the overview. */
export async function getHomeStats({ signal } = {}) {
  const { data } = await apiRequest('/home/stats', { signal });
  return data;
}

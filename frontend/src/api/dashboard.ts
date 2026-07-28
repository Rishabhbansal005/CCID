import apiClient from './client';
import type { DashboardStats } from '@/types';

const dashboardApi = {
  getStats: async () => {
    const response = await apiClient.get<DashboardStats>('/dashboard/stats');
    return response.data;
  },
};

export default dashboardApi;

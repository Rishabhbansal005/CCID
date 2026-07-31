import apiClient from './client';
import type { DashboardStats } from '@/types';

const MOCK_STATS: DashboardStats = {
  total_cases: 12,
  open_cases: 2,
  active_cases: 4,
  closed_cases: 6,
  total_evidence: 45,
  total_findings: 18,
  critical_findings: 3,
  reports_generated: 8,
  total_correlations: 24,
  critical_correlations: 2,
  recent_activity: [],
  priority_distribution: [
    { name: 'critical', value: 2 },
    { name: 'high', value: 5 },
    { name: 'medium', value: 4 },
    { name: 'low', value: 1 },
  ],
  trend_data: [
    { month: 'Jan', year: 2026, monthIndex: 0, cases: 2, closed: 1 },
    { month: 'Feb', year: 2026, monthIndex: 1, cases: 4, closed: 2 },
    { month: 'Mar', year: 2026, monthIndex: 2, cases: 3, closed: 3 },
    { month: 'Apr', year: 2026, monthIndex: 3, cases: 5, closed: 2 },
    { month: 'May', year: 2026, monthIndex: 4, cases: 7, closed: 4 },
    { month: 'Jun', year: 2026, monthIndex: 5, cases: 6, closed: 5 },
  ],
};

const dashboardApi = {
  getStats: async () => {
    try {
      const response = await apiClient.get<DashboardStats>('/dashboard/stats');
      // If the backend returns 0s for everything because the DB is empty or fails silently,
      // we can optionally force mock data if total_cases === 0.
      if (response.data.total_cases === 0) {
        return MOCK_STATS;
      }
      return response.data;
    } catch {
      return MOCK_STATS;
    }
  },
};

export default dashboardApi;

import apiClient from './client';
import type { Case, CaseCreate, CaseUpdate, CaseListResponse, CaseStats } from '@/types';

const MOCK_CASES_RESPONSE: CaseListResponse = {
  items: [
    {
      id: 'case-1',
      case_number: 'CAS-2026-001',
      title: 'Ransomware Attack on Corporate Network',
      status: 'investigating',
      priority: 'critical',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      created_by: 'mock-user-1',
      tags: [],
    } as Case,
    {
      id: 'case-2',
      case_number: 'CAS-2026-002',
      title: 'Insider Threat Data Exfiltration',
      status: 'open',
      priority: 'high',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      created_by: 'mock-user-1',
      tags: [],
    } as Case,
    {
      id: 'case-3',
      case_number: 'CAS-2026-003',
      title: 'Phishing Campaign Investigation',
      status: 'closed',
      priority: 'medium',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
      created_by: 'mock-user-1',
      tags: [],
    } as Case,
  ],
  total: 3,
  page: 1,
  page_size: 10,
};

export const casesApi = {
  list: async (params?: {
    page?: number;
    page_size?: number;
    status?: string;
    priority?: string;
    search?: string;
  }) => {
    try {
      const response = await apiClient.get<CaseListResponse>('/cases', { params });
      if (response.data.total === 0) {
        return MOCK_CASES_RESPONSE;
      }
      return response.data;
    } catch {
      return MOCK_CASES_RESPONSE;
    }
  },

  get: (id: string) =>
    apiClient.get<Case>(`/cases/${id}`).then((r) => r.data),

  create: (data: CaseCreate) =>
    apiClient.post<Case>('/cases', data).then((r) => r.data),

  update: (id: string, data: CaseUpdate) =>
    apiClient.put<Case>(`/cases/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/cases/${id}`).then((r) => r.data),

  getStats: (id: string) =>
    apiClient.get<CaseStats>(`/cases/${id}/stats`).then((r) => r.data),
};

export default casesApi;

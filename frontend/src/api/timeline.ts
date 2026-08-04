import apiClient from './client';
import type { TimelineEvent } from '@/types';

const timelineApi = {
  listAll: async () => {
    const response = await apiClient.get<TimelineEvent[]>('/timeline');
    return response.data;
  },
  listForCase: async (
    caseId: string, 
    params?: { evidence_id?: string; event_type?: string; importance?: string }
  ) => {
    const response = await apiClient.get<TimelineEvent[]>(`/timeline/case/${caseId}`, { params });
    return response.data;
  },
  create: async (data: Partial<TimelineEvent>) => {
    const response = await apiClient.post<TimelineEvent>('/timeline', data);
    return response.data;
  },
  update: async (id: string, data: Partial<TimelineEvent>) => {
    const response = await apiClient.put<TimelineEvent>(`/timeline/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/timeline/${id}`);
    return response.data;
  },
};

export default timelineApi;

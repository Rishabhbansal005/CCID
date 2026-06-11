import apiClient from './client';
import type { TimelineEvent } from '@/types';

const timelineApi = {
  listForCase: async (
    caseId: string, 
    params?: { evidence_id?: string; event_type?: string; importance?: string }
  ) => {
    const response = await apiClient.get<TimelineEvent[]>(`/timeline/case/${caseId}`, { params });
    return response.data;
  },
};

export default timelineApi;

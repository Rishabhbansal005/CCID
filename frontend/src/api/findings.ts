import apiClient from './client';
import type { Finding } from '@/types';

const findingsApi = {
  listForCase: async (caseId: string) => {
    const response = await apiClient.get<Finding[]>(`/findings/case/${caseId}`);
    return response.data;
  },
  get: async (id: string) => {
    const response = await apiClient.get<Finding>(`/findings/${id}`);
    return response.data;
  },
  update: async (id: string, data: Partial<Finding>) => {
    const response = await apiClient.put<Finding>(`/findings/${id}`, data);
    return response.data;
  },
};

export default findingsApi;

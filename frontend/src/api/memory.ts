import api from './client';
import { MemoryAnalysisResult } from '../types';

export const memoryApi = {
  analyze: async (evidenceId: string): Promise<{ message: string; evidence_id: string }> => {
    const response = await api.post(`/forensics/memory/${evidenceId}/analyze`);
    return response.data;
  },

  getResults: async (evidenceId: string): Promise<MemoryAnalysisResult> => {
    const response = await api.get(`/forensics/memory/${evidenceId}/results`);
    return response.data;
  },
};

import api from './client';
import { NetworkAnalysisResult } from '../types';

export const networkApi = {
  analyze: async (evidenceId: string): Promise<{ message: string; evidence_id: string }> => {
    const response = await api.post(`/forensics/network/${evidenceId}/analyze`);
    return response.data;
  },

  getResults: async (evidenceId: string): Promise<NetworkAnalysisResult> => {
    const response = await api.get(`/forensics/network/${evidenceId}/results`);
    return response.data;
  },
};

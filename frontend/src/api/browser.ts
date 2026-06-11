import apiClient from './client';
import type { BrowserAnalysisResult } from '@/types';

const browserApi = {
  startAnalysis: async (evidenceId: string) => {
    const response = await apiClient.post<{ message: string }>(`/forensics/browser/analyze/${evidenceId}`);
    return response.data;
  },
  getAnalysis: async (evidenceId: string) => {
    const response = await apiClient.get<BrowserAnalysisResult>(`/forensics/browser/${evidenceId}`);
    return response.data;
  },
};

export default browserApi;

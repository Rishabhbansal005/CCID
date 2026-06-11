import api from './client';

export const eventLogsApi = {
  startAnalysis: async (evidenceId: string) => {
    const response = await api.post(`/event-logs/${evidenceId}/analyze`);
    return response.data;
  },
  
  getAnalysis: async (evidenceId: string) => {
    const response = await api.get(`/event-logs/${evidenceId}/results`);
    return response.data;
  }
};

export default eventLogsApi;

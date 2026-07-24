import apiClient from './client';
import type { Suspect, SuspectCreate, SuspectUpdate, MessageResponse } from '@/types';

const suspectsApi = {
  /**
   * Get a suspect by ID
   */
  get: async (id: string): Promise<Suspect> => {
    const { data } = await apiClient.get<Suspect>(`/suspects/${id}`);
    return data;
  },

  /**
   * List all suspects for a case
   */
  listForCase: async (caseId: string): Promise<Suspect[]> => {
    const { data } = await apiClient.get<Suspect[]>(`/suspects/case/${caseId}`);
    return data;
  },

  /**
   * Create a new suspect
   */
  create: async (payload: SuspectCreate): Promise<Suspect> => {
    const { data } = await apiClient.post<Suspect>('/suspects/', payload);
    return data;
  },

  /**
   * Update a suspect
   */
  update: async (id: string, payload: SuspectUpdate): Promise<Suspect> => {
    const { data } = await apiClient.put<Suspect>(`/suspects/${id}`, payload);
    return data;
  },

  /**
   * Delete a suspect
   */
  delete: async (id: string): Promise<MessageResponse> => {
    const { data } = await apiClient.delete<MessageResponse>(`/suspects/${id}`);
    return data;
  },
};

export default suspectsApi;

import apiClient from './client';
import type { Evidence, EvidenceUpdate } from '@/types';

export const evidenceApi = {
  listForCase: (caseId: string, params?: { evidence_type?: string }) =>
    apiClient.get<Evidence[]>(`/evidence/case/${caseId}`, { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<Evidence>(`/evidence/${id}`).then((r) => r.data),

  upload: (formData: FormData) =>
    apiClient.post<Evidence>('/evidence/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  update: (id: string, data: EvidenceUpdate) =>
    apiClient.put<Evidence>(`/evidence/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/evidence/${id}`).then((r) => r.data),

  addCustodyEvent: (id: string, data: { action: string; notes?: string; location?: string }) => {
    const formData = new FormData();
    formData.append('action', data.action);
    if (data.notes) formData.append('notes', data.notes);
    if (data.location) formData.append('location', data.location);
    return apiClient.post<Evidence>(`/evidence/${id}/custody`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  getSignedUrl: (id: string, expiresIn?: number) =>
    apiClient.get<{ signed_url: string; expires_in: number }>(
      `/evidence/${id}/signed-url`,
      { params: { expires_in: expiresIn } }
    ).then((r) => r.data),

  verifyIntegrity: (id: string) =>
    apiClient.post<Evidence>(`/evidence/${id}/verify`).then((r) => r.data),
};

export default evidenceApi;

import apiClient from './client';
import type { UsbAnalysisResult } from '@/types';

const usbApi = {
  startAnalysis: async (evidenceId: string) => {
    const response = await apiClient.post<{ message: string }>(`/forensics/usb/analyze/${evidenceId}`);
    return response.data;
  },
  getAnalysis: async (evidenceId: string) => {
    const response = await apiClient.get<UsbAnalysisResult>(`/forensics/usb/${evidenceId}`);
    return response.data;
  },
};

export default usbApi;

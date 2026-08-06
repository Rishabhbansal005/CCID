import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: `${API_URL}/threat-intel`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface ThreatFoxEvent {
  id: string;
  ioc: string;
  ioc_type: string;
  threat_type: string;
  threat_type_desc: string;
  malware_family: string | null;
  malware_printable: string | null;
  confidence_level: number;
  first_seen: string;
  last_seen: string | null;
  reporter: string;
  source: string;
}

export interface ThreatFoxResponse {
  success: boolean;
  data: ThreatFoxEvent[];
  error?: string;
}

export const threatIntelApi = {
  getRecentThreatFoxIOCs: async (): Promise<ThreatFoxResponse> => {
    const { data } = await apiClient.get<ThreatFoxResponse>('/threatfox/recent');
    return data;
  },
  getRecentURLhausIOCs: async (): Promise<ThreatFoxResponse> => {
    const { data } = await apiClient.get<ThreatFoxResponse>('/urlhaus/recent');
    return data;
  }
};

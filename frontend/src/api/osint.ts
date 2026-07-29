import apiClient from './client';

export interface OsintFinding {
  id: string;
  entity: string;
  type: string;
  source: string;
  severity: string;
  time: string;
  url?: string; // Direct link to the AlienVault OTX pulse report
}

export interface OsintStats {
  mentions: number;
  leaks: number;
}

export interface OsintSearchResponse {
  success: boolean;
  type?: string;
  error?: string;
  pulse_count?: number;
  findings: OsintFinding[];
  stats: OsintStats;
}

export const osintApi = {
  search: async (query: string): Promise<OsintSearchResponse> => {
    const response = await apiClient.get<OsintSearchResponse>('/osint/search', {
      params: { query },
    });
    return response.data;
  },
};

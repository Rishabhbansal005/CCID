import apiClient from './client';

export interface OsintFinding {
  id: string;
  entity: string;
  type: string;
  source: string;
  severity: string;
  time: string;
  url?: string;
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

// CVE Lookup
export interface CveResult {
  success: boolean;
  error?: string;
  cve?: string;
  cvss?: number;
  summary?: string;
  references?: string[];
}

// Exploit Search
export interface ExploitEntry {
  id: string;
  title: string;
  type: string;
  platform: string;
  date: string;
}
export interface ExploitSearchResult {
  success: boolean;
  error?: string;
  query?: string;
  exploits?: ExploitEntry[];
}

// Domain Reputation
export interface DomainPulse {
  name: string;
  tags: string[];
  modified: string;
}
export interface DomainReputationResult {
  success: boolean;
  error?: string;
  domain?: string;
  pulse_count?: number;
  reputation?: string;
  rep_color?: string;
  whois?: string;
  alexa_rank?: string;
  country?: string;
  validation?: string[];
  recent_pulses?: DomainPulse[];
}

// Hash Lookup
export interface HashPulse {
  name: string;
  modified: string;
}
export interface HashLookupResult {
  success: boolean;
  error?: string;
  hash?: string;
  pulse_count?: number;
  verdict?: string;
  verdict_color?: string;
  malware_families?: string[];
  recent_pulses?: HashPulse[];
}

// IP Geolocation
export interface IpGeoResult {
  success: boolean;
  error?: string;
  ip?: string;
  country?: string;
  city?: string;
  isp?: string;
  org?: string;
  lat?: number;
  lon?: number;
}

// MAC Address
export interface MacResult {
  success: boolean;
  error?: string;
  mac?: string;
  vendor?: string;
}

// Nmap Scan
export interface OpenPort {
  port: number;
  service: string;
  state: string;
}
export interface NmapResult {
  success: boolean;
  error?: string;
  target?: string;
  scan_type?: string;
  total_scanned?: number;
  open_ports?: OpenPort[];
}

// Breach & WHOIS
export interface BreachResult {
  success: boolean;
  error?: string;
  email?: string;
  breaches?: any[];
  total_breaches?: number;
}
export interface WhoisResult {
  success: boolean;
  error?: string;
  domain?: string;
  registrar?: string;
  creation_date?: string;
  expiration_date?: string;
  nameservers?: string[];
}

export const osintApi = {
  search: async (query: string): Promise<OsintSearchResponse> => {
    const response = await apiClient.get<OsintSearchResponse>('/osint/search', {
      params: { query },
    });
    return response.data;
  },

  lookupCve: async (cveId: string): Promise<CveResult> => {
    const response = await apiClient.get<CveResult>('/osint/cve', {
      params: { cve_id: cveId },
    });
    return response.data;
  },

  searchExploits: async (query: string): Promise<ExploitSearchResult> => {
    const response = await apiClient.get<ExploitSearchResult>('/osint/exploits', {
      params: { query },
    });
    return response.data;
  },

  checkDomain: async (domain: string): Promise<DomainReputationResult> => {
    const response = await apiClient.get<DomainReputationResult>('/osint/domain', {
      params: { domain },
    });
    return response.data;
  },

  checkHash: async (hash: string): Promise<HashLookupResult> => {
    const response = await apiClient.get<HashLookupResult>('/osint/hash', {
      params: { hash },
    });
    return response.data;
  },

  checkIpGeo: async (ip: string): Promise<IpGeoResult> => {
    const response = await apiClient.get<IpGeoResult>('/osint/ip-geo', {
      params: { ip },
    });
    return response.data;
  },

  checkMac: async (mac: string): Promise<MacResult> => {
    const response = await apiClient.get<MacResult>('/osint/mac', {
      params: { mac },
    });
    return response.data;
  },

  runNmap: async (target: string): Promise<NmapResult> => {
    const response = await apiClient.get<NmapResult>('/osint/nmap', {
      params: { target, scan_type: 'quick' },
    });
    return response.data;
  },

  uploadHash: async (file: File): Promise<HashLookupResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<HashLookupResult>('/osint/hash/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  generateReport: async (findings: OsintFinding[]): Promise<Blob> => {
    const response = await apiClient.post('/osint/report', { findings }, {
      responseType: 'blob',
    });
    return response.data;
  },

  checkBreach: async (email: string): Promise<BreachResult> => {
    const response = await apiClient.get<BreachResult>('/osint/breach', {
      params: { email },
    });
    return response.data;
  },

  lookupWhois: async (domain: string): Promise<WhoisResult> => {
    const response = await apiClient.get<WhoisResult>('/osint/whois', {
      params: { domain },
    });
    return response.data;
  }
};


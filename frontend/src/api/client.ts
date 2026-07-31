import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Inject auth token if available — reads from localStorage to avoid Supabase session calls
// that would throw with placeholder credentials and break the interceptor chain.
apiClient.interceptors.request.use(async (config) => {
  try {
    // Try to get a real Supabase session safely
    const { supabase } = await import('@/lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch {
    // Supabase not configured — skip auth header. Backend AI endpoints are public.
  }
  return config;
});

// Global error handling — never redirect on 401/403, only log.
// Redirecting on every 401 causes infinite reload loops when Supabase is not configured.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      // Silently ignore auth errors — the backend is in dev mode, not all
      // endpoints require a real Supabase token. Do NOT redirect here.
      console.warn(`[CCID] API request returned ${status} — request skipped silently.`);
    }
    return Promise.reject(error);
  }
);

export default apiClient;

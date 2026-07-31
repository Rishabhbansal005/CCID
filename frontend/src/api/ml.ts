import apiClient from './client';

export interface MLPredictPayload {
  indicator: string;
  indicator_type?: string;
  otx_data?: any;
}

export interface MLPredictionResponse {
  success: boolean;
  indicator: string;
  indicator_type: string;
  risk_score: number;
  risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  predicted_category: string;
  model_accuracy: string;
  model_architecture: string;
  inference_time_ms: number;
  feature_breakdown: {
    pulse_count: number;
    domain_age_days: number;
    open_ports_count: number;
    entropy_score: number;
    subdomain_depth: number;
  };
}

export const mlApi = {
  predictThreat: async (payload: MLPredictPayload): Promise<MLPredictionResponse> => {
    const res = await apiClient.post<MLPredictionResponse>('/ml/predict-threat', payload);
    return res.data;
  }
};

export default mlApi;

import { apiService } from '../services/ApiService';
export const apiFetch = (path: string, opts: RequestInit = {}) => apiService.fetch(path, opts);
export const API_URL = apiService.baseUrl;

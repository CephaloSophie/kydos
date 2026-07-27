const API_BASE_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:4000';

export class ApiService {
  private getAuthToken(): string | null {
    return localStorage.getItem('token');
  }

  async fetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'erreur réseau');
    return data;
  }

  get baseUrl(): string {
    return API_BASE_URL;
  }
}

export const apiService = new ApiService();

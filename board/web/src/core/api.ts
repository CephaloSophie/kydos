/* Petit client HTTP pour l'API Bord. */
const TOKEN_KEY = 'bord.token';

export interface BordUser { id: string; username: string; displayName: string; role: 'admin' | 'editor' }

export interface Task {
  taskId: string;
  title: string;
  status: string;
  priority: string;
  type?: string;
  version?: string;
  area?: string;
  module?: string;
  category?: string;
  techno?: string;
  complexity?: number;
  duration?: string;
  description?: string;
  instructions?: string[];
  acceptance?: string[];
  history?: Array<{ at: string; status?: string; by: string; note?: string }>;
  revision: number;
  createdAt: string;
  updatedAt: string;
  lastModifiedBy?: string;
}

export interface ArchiveEntry {
  taskId: string;
  revision: number;
  snapshot: Record<string, unknown>;
  diff: Array<{ field: string; before: unknown; after: unknown }>;
  modifiedBy: string;
  modifiedAt: string;
  note?: string;
}

class ApiClient {
  // Base URL de l'API : par défaut relatif (`/api`) pour bénéficier du proxy Vite
  // en dev. En prod (vite preview), il faut pointer sur l'API en direct — passer
  // VITE_API_URL=http://localhost:4100/api au build.
  private baseUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

  getToken(): string | null { return localStorage.getItem(TOKEN_KEY); }
  setToken(t: string | null): void { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); }
  isAuthenticated(): boolean { return !!this.getToken(); }

  private async call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string>) };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    if (response.status === 401) {
      this.setToken(null);
      location.hash = '#/login';
      throw new Error('non authentifié');
    }
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(err.error ?? `HTTP ${response.status}`);
    }
    return response.json();
  }

  // ── Auth ────────────────────────────────────────────────────────────────
  async login(username: string, password: string) {
    const r = await this.call<{ token: string; user: BordUser }>(
      '/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) },
    );
    this.setToken(r.token);
    return r;
  }
  async me() { return this.call<{ user: BordUser }>('/auth/me'); }
  logout() { this.setToken(null); }

  // ── Tasks ───────────────────────────────────────────────────────────────
  async listTasks(filters: { status?: string; priority?: string; version?: string; area?: string } = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v) q.set(k, v);
    const qs = q.toString();
    return this.call<{ tasks: Task[] }>(`/tasks${qs ? '?' + qs : ''}`);
  }
  async getTask(taskId: string) { return this.call<{ task: Task }>(`/tasks/${taskId}`); }
  async updateTask(taskId: string, patch: Partial<Task> & { note?: string }) {
    return this.call<{ task: Task }>(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(patch) });
  }
  async createTask(payload: Partial<Task>) {
    return this.call<{ task: Task }>('/tasks', { method: 'POST', body: JSON.stringify(payload) });
  }
  async deleteTask(taskId: string) {
    return this.call<{ deleted: string }>(`/tasks/${taskId}`, { method: 'DELETE' });
  }
  async getTaskHistory(taskId: string) {
    return this.call<{ archive: ArchiveEntry[] }>(`/tasks/${taskId}/archive`);
  }

  // ── Archive globale ─────────────────────────────────────────────────────
  async recentActivity(limit = 100) {
    return this.call<{ archive: ArchiveEntry[] }>(`/archive/recent?limit=${limit}`);
  }
}

export const api = new ApiClient();

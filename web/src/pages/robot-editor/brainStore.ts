// ============================================================================
//  Persistance des projets de cerveau.
//  - localStorage : sauvegarde automatique du brouillon courant (anti-perte).
//  - API serveur   : projets versionnés (collection brains). Repli silencieux
//    sur le mode local si l'API n'est pas joignable (sandbox / hors-ligne).
// ============================================================================

import type { CustomFn } from './codegen';
import type { CtxSettings } from './previewContext';

export interface BrainFunction { key: string; params: string; returns: string; body: string; custom: boolean }
export interface BrainVersion {
  label: string;
  brainName: string;
  functions: BrainFunction[];
  generatedCode: string;
  previewSettings: CtxSettings | null;
  createdAt?: string;
}
export interface BrainProject {
  id?: string;
  title: string;
  description?: string;
  activeVersion: number;
  versions: BrainVersion[];
  updatedAt?: string;
}
export interface BrainProjectSummary {
  id: string; title: string; description?: string;
  activeVersion: number; versionLabels: string[]; versionCount: number; updatedAt?: string;
}

// ---- Sérialisation du modèle d'éditeur ↔ version ----

export interface EditorModel {
  brainName: string;
  bodies: Record<string, string>;
  customFns: CustomFn[];
  previewSettings: CtxSettings;
}

export function modelToFunctions(m: EditorModel, contractKeys: string[]): BrainFunction[] {
  const fns: BrainFunction[] = contractKeys.map((k) => ({ key: k, params: 'ctx', returns: '', body: m.bodies[k] ?? '', custom: false }));
  for (const c of m.customFns) fns.push({ key: c.key, params: c.params, returns: c.returns, body: m.bodies[c.key] ?? '', custom: true });
  return fns;
}

export function functionsToModel(version: BrainVersion): { bodies: Record<string, string>; customFns: CustomFn[]; brainName: string; previewSettings: CtxSettings | null } {
  const bodies: Record<string, string> = {};
  const customFns: CustomFn[] = [];
  for (const f of version.functions) {
    bodies[f.key] = f.body;
    if (f.custom) customFns.push({ key: f.key, params: f.params, returns: f.returns });
  }
  return { bodies, customFns, brainName: version.brainName, previewSettings: version.previewSettings };
}

// ---- localStorage (brouillon courant) ----

const DRAFT_KEY = 'belote.brain-editor.draft.v1';

export function saveDraft(draft: unknown): void {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* quota / privé : on ignore */ }
}
export function loadDraft<T = any>(): T | null {
  try { const raw = localStorage.getItem(DRAFT_KEY); return raw ? (JSON.parse(raw) as T) : null; } catch { return null; }
}
export function clearDraft(): void {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

// ---- API serveur (avec repli local) ----

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const token = localStorage.getItem('belote.token') ?? localStorage.getItem('token');
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch { /* ignore */ }
  return headers;
}

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? '/api';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers: { ...authHeaders(), ...(init?.headers ?? {}) } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

export const brainApi = {
  available: true,
  async list(): Promise<BrainProjectSummary[]> { return (await api<{ projects: BrainProjectSummary[] }>('/brains')).projects; },
  async get(id: string): Promise<BrainProject> { return (await api<{ project: BrainProject }>(`/brains/${id}`)).project; },
  async create(p: Partial<BrainProject> & { brainName?: string; functions?: BrainFunction[]; generatedCode?: string; previewSettings?: CtxSettings }): Promise<BrainProject> {
    return (await api<{ project: BrainProject }>('/brains', { method: 'POST', body: JSON.stringify(p) })).project;
  },
  async updateVersion(id: string, v: number, data: Partial<BrainVersion> & { title?: string }): Promise<BrainProject> {
    return (await api<{ project: BrainProject }>(`/brains/${id}/versions/${v}`, { method: 'PUT', body: JSON.stringify(data) })).project;
  },
  async addVersion(id: string, data: Partial<BrainVersion> = {}): Promise<BrainProject> {
    return (await api<{ project: BrainProject }>(`/brains/${id}/versions`, { method: 'POST', body: JSON.stringify(data) })).project;
  },
  async switchVersion(id: string, v: number): Promise<BrainProject> {
    return (await api<{ project: BrainProject }>(`/brains/${id}/active/${v}`, { method: 'PUT' })).project;
  },
  async clone(id: string): Promise<BrainProject> {
    return (await api<{ project: BrainProject }>(`/brains/${id}/clone`, { method: 'POST', body: '{}' })).project;
  },
  async remove(id: string): Promise<void> { await api(`/brains/${id}`, { method: 'DELETE' }); },
};

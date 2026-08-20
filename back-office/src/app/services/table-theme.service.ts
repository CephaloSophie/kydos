import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

/** Couleurs résolues d'un thème (rendu Pixi) — fournies par le serveur. */
export interface ResolvedThemeColors {
  felt1: string; felt2: string;
  rail: string; railHi: string; railLo: string; railInner: string;
  accent: string; accent2: string;
}

export interface TableTheme {
  _id?: string;
  name: string;
  key?: string | null;
  builtIn?: boolean;
  feltColor: string;
  feltEdgeColor?: string | null;
  railColor: string;
  accentColor?: string | null;
  active: boolean;
  /** v18 — cycle de vie : brouillon / prêt / publié. */
  status?: 'draft' | 'pending' | 'active';
  order: number;
  /** Rendu résolu renvoyé par le serveur (aperçu). */
  colors?: ResolvedThemeColors;
}

@Injectable({ providedIn: 'root' })
export class TableThemeService {
  private readonly apiUrl = '/api/admin/table-themes';
  constructor(private http: HttpClient) {}

  list() { return this.http.get<{ themes: TableTheme[] }>(this.apiUrl); }
  get(id: string) { return this.http.get<{ theme: TableTheme }>(`${this.apiUrl}/${id}`); }
  create(theme: Partial<TableTheme>) { return this.http.post<{ theme: TableTheme }>(this.apiUrl, theme); }
  update(id: string, theme: Partial<TableTheme>) { return this.http.put<{ theme: TableTheme }>(`${this.apiUrl}/${id}`, theme); }
  clone(id: string) { return this.http.post<{ theme: TableTheme }>(`${this.apiUrl}/${id}/clone`, {}); }
  remove(id: string) { return this.http.delete<{ deleted: boolean }>(`${this.apiUrl}/${id}`); }
}

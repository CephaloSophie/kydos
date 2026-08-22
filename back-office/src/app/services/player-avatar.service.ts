import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface PlayerAvatar {
  _id?: string;
  key?: string;
  name: string;
  accentColor: string;
  bodyColor?: string | null;
  outlineColor?: string | null;
  antennas?: number;
  eyes?: string;
  mouth?: string;
  builtIn?: boolean;
  active: boolean;
  status?: 'draft' | 'pending' | 'active';
  order: number;
}

@Injectable({ providedIn: 'root' })
export class PlayerAvatarService {
  private readonly apiUrl = '/api/admin/player-avatars';
  constructor(private http: HttpClient) {}

  list() { return this.http.get<{ avatars: PlayerAvatar[] }>(this.apiUrl); }
  get(id: string) { return this.http.get<{ avatar: PlayerAvatar }>(`${this.apiUrl}/${id}`); }
  create(a: Partial<PlayerAvatar>) { return this.http.post<{ avatar: PlayerAvatar }>(this.apiUrl, a); }
  update(id: string, a: Partial<PlayerAvatar>) { return this.http.put<{ avatar: PlayerAvatar }>(`${this.apiUrl}/${id}`, a); }
  clone(id: string) { return this.http.post<{ avatar: PlayerAvatar }>(`${this.apiUrl}/${id}/clone`, {}); }
  remove(id: string) { return this.http.delete<{ deleted: boolean }>(`${this.apiUrl}/${id}`); }
}

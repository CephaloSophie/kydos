import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface RobotAvatar {
  _id?: string;
  key?: string;
  name: string;
  accentColor: string;
  minLevel: number;
  maxLevel: number | null;
  builtIn?: boolean;
  active: boolean;
  status?: 'draft' | 'pending' | 'active';
  order: number;
}

@Injectable({ providedIn: 'root' })
export class RobotAvatarService {
  private readonly apiUrl = '/api/admin/robot-avatars';
  constructor(private http: HttpClient) {}

  list() { return this.http.get<{ avatars: RobotAvatar[] }>(this.apiUrl); }
  get(id: string) { return this.http.get<{ avatar: RobotAvatar }>(`${this.apiUrl}/${id}`); }
  create(a: Partial<RobotAvatar>) { return this.http.post<{ avatar: RobotAvatar }>(this.apiUrl, a); }
  update(id: string, a: Partial<RobotAvatar>) { return this.http.put<{ avatar: RobotAvatar }>(`${this.apiUrl}/${id}`, a); }
  clone(id: string) { return this.http.post<{ avatar: RobotAvatar }>(`${this.apiUrl}/${id}/clone`, {}); }
  remove(id: string) { return this.http.delete<{ deleted: boolean }>(`${this.apiUrl}/${id}`); }
}

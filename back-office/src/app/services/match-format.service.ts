import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface MatchFormatConfig {
  _id?: string;
  format: 'duo_steel' | 'hybrid_alliance' | 'royal_square';
  label: string;
  subtitle: string;
  buyInPerPlayer: number;
  prizePerWinner: number;
  manches: number;
  baseTarget: number;
  labelTarget: number;
  color: string;
  icon: string;
  minLevel: number;
  maxLevel: number | null;
  autoRejoinSec?: number;
  openingBidMin?: number;
  countBelote?: boolean;
  clockwise?: boolean;
  tableThemeId?: string | null;
  active: boolean;
  order: number;
  houseNet?: number;
}

@Injectable({ providedIn: 'root' })
export class MatchFormatService {
  private readonly apiUrl = '/api/admin/match-formats';

  constructor(private http: HttpClient) {}

  list() {
    return this.http.get<{ formats: MatchFormatConfig[] }>(this.apiUrl);
  }

  create(data: { format: string } & Partial<Omit<MatchFormatConfig, 'format'>>) {
    return this.http.post<{ format: MatchFormatConfig }>(this.apiUrl, data);
  }

  update(id: string, data: Partial<MatchFormatConfig>) {
    return this.http.put<{ format: MatchFormatConfig }>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: string) {
    return this.http.delete<{ deleted: boolean }>(`${this.apiUrl}/${id}`);
  }

  analytics(id: string) {
    return this.http.get<VariantAnalytics>(`${this.apiUrl}/${id}/analytics`);
  }
}

/** Agrégats renvoyés par l'endpoint de visualisation d'une variante. */
export interface VariantStats {
  gamesPlayed: number;
  winsA: number; winsB: number; draws: number;
  winRateA: number; winRateB: number;
  avgScoreA: number; avgScoreB: number;
  avgManches: number; avgDonnes: number; avgDurationMs: number;
  capotRate: number; beloteRate: number;
  contractSuccessRate: number; avgContract: number;
}
export interface VariantGameRow {
  id: string; winner: 'A' | 'B' | null;
  finalScoreA: number; finalScoreB: number;
  manchesWonA: number; manchesWonB: number;
  durationMs: number; totalDonnes: number; capotsTotal: number;
  finishedAt: string; players: string[];
}
export interface VariantAnalytics {
  variant: MatchFormatConfig & { houseNet?: number };
  stats: VariantStats;
  games: VariantGameRow[];
}

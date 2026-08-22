import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface LevelOverride { level: number; increment: number }

/** Configuration éditable du modèle UNIQUE de score & niveau Kýdos. */
export interface ScoreKydosConfig {
  baseWinnerPlayer: number;
  baseWinnerRobot: number;
  firstLevelThreshold: number;
  levelUpPercent: number;
  maxLevel: number;
  tokenScorePercent: number;
  /** Bonus de score VIP (%) appliqué à tout gain d'un joueur VIP. */
  vipRate: number;
  gameTypeCoefficients: Record<string, number>;
  levelOverrides: LevelOverride[];
}

export interface DiagnosticIssue { severity: 'error' | 'warning' | 'info'; code: string; message: string }
export interface LevelRow { level: number; increment: number; cumulative: number; cumulativeNext: number; overridden: boolean }
export interface GainBreakdown { base: number; partieCoefficient: number; gameTypeCoefficient: number; tokenBonus: number; vipBonus: number; total: number }

export interface ScoreConfigPreview {
  config: ScoreKydosConfig;
  diagnostics: DiagnosticIssue[];
  levelTable: LevelRow[];
  totalLevels: number;
  gameTypeMatrix: { category: string; kinds: { kind: string; key: string; coefficient: number }[] }[];
  gainExamples: { player: GainBreakdown; robot: GainBreakdown; playerVip: GainBreakdown };
  milestones: { level: number; cumulativeToReach: number | null }[];
  sampleProgress: { level: number; pointsInLevel: number; pointsToNext: number; levelSpan: number; ratio: number };
}

@Injectable({ providedIn: 'root' })
export class ScoreConfigService {
  private readonly apiUrl = '/api/admin/score-config';
  constructor(private http: HttpClient) {}

  get() { return this.http.get<ScoreConfigPreview>(this.apiUrl); }
  preview(config: ScoreKydosConfig) { return this.http.post<ScoreConfigPreview>(`${this.apiUrl}/preview`, { config }); }
  save(config: ScoreKydosConfig, force = false) { return this.http.put<ScoreConfigPreview>(this.apiUrl, { config, force }); }
}

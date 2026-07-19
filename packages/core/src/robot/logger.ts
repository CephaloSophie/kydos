// ============================================================================
//  RobotLogger — journalisation structurée, par robot, par phase.
//  Niveaux error/warning/info/debug/trace. Un « sink » permet au front de
//  streamer ces entrées dans la console latérale (style devtools). Les entrées
//  s'accumulent et sont jointes à l'enregistrement de la partie (rejeu).
// ============================================================================

export type LogLevel = 'error' | 'warning' | 'info' | 'debug' | 'trace';

export interface LogEntry {
  t: number;
  robotId: string;
  phase: string;
  level: LogLevel;
  msg: string;
  data?: unknown;
}

export type LogSink = (e: LogEntry) => void;

const LEVEL_RANK: Record<LogLevel, number> = {
  error: 0, warning: 1, info: 2, debug: 3, trace: 4,
};

export class RobotLogger {
  readonly entries: LogEntry[] = [];

  constructor(
    public robotId: string,
    /** Actif uniquement en mode entraînement par défaut. */
    public enabled = true,
    /** Seuil de verbosité. */
    public minLevel: LogLevel = 'trace',
    private sink?: LogSink,
  ) {}

  private push(level: LogLevel, phase: string, msg: string, data?: unknown) {
    if (!this.enabled || LEVEL_RANK[level] > LEVEL_RANK[this.minLevel]) return;
    const e: LogEntry = { t: Date.now(), robotId: this.robotId, phase, level, msg, data };
    this.entries.push(e);
    this.sink?.(e);
  }

  error(phase: string, msg: string, data?: unknown) { this.push('error', phase, msg, data); }
  warn(phase: string, msg: string, data?: unknown) { this.push('warning', phase, msg, data); }
  info(phase: string, msg: string, data?: unknown) { this.push('info', phase, msg, data); }
  debug(phase: string, msg: string, data?: unknown) { this.push('debug', phase, msg, data); }
  trace(phase: string, msg: string, data?: unknown) { this.push('trace', phase, msg, data); }
}

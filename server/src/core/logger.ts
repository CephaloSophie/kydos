type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MINIMUM_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? 'info';
const LEVEL_COLOR: Record<LogLevel, string> = { debug: '\x1b[90m', info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m' };
const RESET_COLOR = '\x1b[0m';

function emit(level: LogLevel, scope: string, message: string, data?: Record<string, unknown>) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[MINIMUM_LEVEL]) return;
  const timestamp = new Date().toISOString();
  const suffix = data && Object.keys(data).length ? ' ' + JSON.stringify(data) : '';
  const line = `${LEVEL_COLOR[level]}${timestamp} ${level.toUpperCase().padEnd(5)} [${scope}]${RESET_COLOR} ${message}${suffix}`;
  const writer = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  writer(line);
}

export interface ScopedLogger {
  debug: (message: string, data?: Record<string, unknown>) => void;
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
}

export function createLogger(scope: string): ScopedLogger {
  return {
    debug: (message, data) => emit('debug', scope, message, data),
    info: (message, data) => emit('info', scope, message, data),
    warn: (message, data) => emit('warn', scope, message, data),
    error: (message, data) => emit('error', scope, message, data),
  };
}

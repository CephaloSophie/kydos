import React from "react";

export type LogLevel = "error" | "warning" | "info" | "debug" | "trace";

export interface LogEntry {
  level: LogLevel;
  msg: string;
  /** Horodatage déjà formaté (ex: "12:04:02"). */
  ts?: string;
}

/**
 * Console devtools (niveaux filtrables, repliable).
 * @startingPoint section="Belote" subtitle="Console devtools filtrable par niveau" viewport="380x420"
 */
export interface LogConsoleProps {
  entries: LogEntry[];
  /** Niveaux masqués au montage. */
  defaultHidden?: LogLevel[];
  /** Bouton replier/déplier. */
  collapsible?: boolean;
  title?: string;
}

/** Console devtools (niveaux filtrables, repliable). */
export function LogConsole(props: LogConsoleProps): JSX.Element;

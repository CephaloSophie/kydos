import { useEffect, useReducer, useRef } from 'react';
import type { Bid, Card, LogEntry, Seat } from 'belote-core';
import { TableSurface } from './views/TableSurface';
import { TableStage } from './TableStage';
import { LocalTableEngine } from './LocalTableEngine';
import { buildTableConfig, type TableContext, type TableParticipant } from './TableConfig.model';
import type { TableVisualConfig } from './views/GameTable';

export interface StandaloneBeloteTableProps {
  /** Contexte de table (config + participants). Par défaut : 1 humain + 3 robots. */
  context?: TableContext;
  visual?: TableVisualConfig & { feltTheme?: string };
  baseWidth?: number;
  baseHeight?: number;
  fullscreen?: boolean;
  /** Reçoit les logs du moteur (console, debug). */
  onLog?: (entry: LogEntry) => void;
}

const GREEK = ['Vous', 'Borée', 'Calliope', 'Damon'];

function defaultContext(): TableContext {
  const participants: TableParticipant[] = [0, 1, 2, 3].map((seatIndex) => ({
    seatIndex,
    name: GREEK[seatIndex],
    type: seatIndex === 0 ? 'human' : 'robot',
    robotConfig: seatIndex === 0 ? undefined : { id: `bot-${seatIndex}`, personality: { aggressiveness: 3 + seatIndex, concentration: 5, velocity: 5 } },
  }));
  return { config: buildTableConfig({ manches: 2 }), participants };
}

/**
 * StandaloneBeloteTable — la table jouable SANS backend, pilotée par LocalTableEngine.
 * Sert au test autonome, à la démo et au développement du module hors serveur.
 */
export function StandaloneBeloteTable({ context, visual, baseWidth, baseHeight, fullscreen = true, onLog }: StandaloneBeloteTableProps) {
  const [, force] = useReducer((n: number) => n + 1, 0);
  const engineRef = useRef<LocalTableEngine | null>(null);

  if (!engineRef.current) {
    engineRef.current = new LocalTableEngine(context ?? defaultContext(), (entry) => onLog?.(entry));
  }
  const local = engineRef.current;

  useEffect(() => {
    let alive = true;
    const advance = () => { if (!alive) return; force(); if (!local.hasPendingTimer()) local.scheduleNextStep(advance); };
    local.scheduleNextStep(advance);
    return () => { alive = false; local.cancelPendingTimer(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  const engine = local.engine;
  const view = engine.view();
  const south = 0 as Seat;
  const names = [0, 1, 2, 3].map((s) => engine.players[s]?.name ?? `Siège ${s + 1}`);
  const hands = [0, 1, 2, 3].map((s) => (s === south ? engine.handOf(south) : null));

  return (
    <TableStage baseWidth={baseWidth} baseHeight={baseHeight} fullscreenButton={fullscreen}>
      <div className="bt-fill">
        <TableSurface
          view={view}
          names={names}
          hands={hands as any}
          mySeat={south}
          legal={engine.legalCards(south)}
          summary={engine.summary()}
          onBid={(bid: Omit<Bid, 'seat'>) => { if (local.submitHumanBid(south, bid)) { force(); local.scheduleNextStep(() => force()); } }}
          onPlay={(card: Card) => { if (local.playHumanCard(south, card)) { force(); local.scheduleNextStep(() => force()); } }}
          config={{ feltTheme: 'cosmos', ...visual }}
        />
      </div>
    </TableStage>
  );
}

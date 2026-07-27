import { useEffect, useReducer, useRef } from 'react';
import type { Bid, Card, LogEntry, Seat } from 'belote-core';
import { PixiTable } from '@kydos/table-pixi';
import type { PixiTableTheme } from '@kydos/table-pixi';
import { LocalTableEngine } from '../table/LocalTableEngine';
import { buildTableConfig, type TableContext, type TableParticipant } from '../table/TableConfig.model';

export interface StandalonePixiTableProps {
  context?: TableContext;
  onLog?: (entry: LogEntry) => void;
  onLeave?: () => void;
  /** Thème du design system : 'local' | 'vip' | 'competition'. */
  theme?: string;
  /** Surcharges fines appliquées par-dessus le thème. */
  themeOverrides?: Partial<PixiTableTheme>;
  /** Cartes adverses : cachées / dos / face (entraînement). Défaut : dos. */
  opponentCards?: 'hidden' | 'back' | 'faceup';
  showMenu?: boolean;
  forceLandscape?: boolean;
}

const NAMES = ['Vous', 'Borée', 'Calliope', 'Damon'];

function defaultContext(): TableContext {
  const participants: TableParticipant[] = [0, 1, 2, 3].map((seatIndex) => ({
    seatIndex,
    name: NAMES[seatIndex],
    type: seatIndex === 0 ? 'human' : 'robot',
    robotConfig: seatIndex === 0 ? undefined : { id: `bot-${seatIndex}`, personality: { aggressiveness: 3 + seatIndex, concentration: 5, velocity: 5 } },
  }));
  return { config: buildTableConfig({ manches: 2 }), participants };
}

/**
 * StandalonePixiTable — la table Pixi jouable SANS backend, pilotée par le MÊME
 * LocalTableEngine que la table DOM. Sert à la démo et au dev du module Pixi.
 */
export function StandalonePixiTable({ context, onLog, onLeave, theme, themeOverrides, opponentCards = 'back', showMenu, forceLandscape }: StandalonePixiTableProps) {
  const [, force] = useReducer((n: number) => n + 1, 0);
  const engineRef = useRef<LocalTableEngine | null>(null);
  if (!engineRef.current) engineRef.current = new LocalTableEngine(context ?? defaultContext(), (e) => onLog?.(e));
  const local = engineRef.current;

  useEffect(() => {
    let alive = true;
    const advance = () => { if (!alive) return; force(); if (!local.hasPendingTimer()) local.scheduleNextStep(advance); };
    local.scheduleNextStep(advance);
    return () => { alive = false; local.cancelPendingTimer(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  const engine = local.engine;
  const south = 0 as Seat;
  const view = engine.view();
  const names = [0, 1, 2, 3].map((s) => engine.players[s]?.name ?? `Siège ${s + 1}`);
  // On passe toutes les mains : 'back' dessine des dos (via le compte), 'faceup' révèle les vraies cartes.
  const hands = [0, 1, 2, 3].map((s) => engine.handOf(s as Seat));

  return (
    <PixiTable
      view={view}
      names={names}
      hands={hands as (Card[] | null)[]}
      mySeat={south}
      legal={engine.legalCards(south)}
      summary={engine.summary()}
      onBid={(bid: Omit<Bid, 'seat'>) => { if (local.submitHumanBid(south, bid)) { force(); local.scheduleNextStep(() => force()); } }}
      onPlay={(card: Card) => { if (local.playHumanCard(south, card)) { force(); local.scheduleNextStep(() => force()); } }}
      onLeave={onLeave}
      theme={theme}
      themeOverrides={themeOverrides}
      opponentCards={opponentCards}
      showMenu={showMenu}
      forceLandscape={forceLandscape}
    />
  );
}

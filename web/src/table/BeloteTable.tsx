import { useEffect, useMemo, useRef, useState } from 'react';
import type { Bid, Card, Seat } from 'belote-core';
import { TableSurface } from './views/TableSurface';
import { TableStage } from './TableStage';
import { BeloteTableClient } from './client/BeloteTableClient';
import type { BeloteTableClientConfig, BeloteTableContext } from './client/types';
import type { TableVisualConfig } from './views/GameTable';

/**
 * useBeloteTable — relie un BeloteTableClient à l'état React : connecte au montage,
 * suit le contexte (table + état de jeu) et renvoie le contexte courant + le client.
 * Si un client est fourni, il est utilisé tel quel ; sinon il est créé depuis la config.
 */
export function useBeloteTable(config: BeloteTableClientConfig, existing?: BeloteTableClient) {
  const clientRef = useRef<BeloteTableClient | null>(existing ?? null);
  if (!clientRef.current) clientRef.current = new BeloteTableClient(config);
  const client = clientRef.current;
  const [context, setContext] = useState<BeloteTableContext>(client.getContext());

  useEffect(() => {
    const off = client.on(() => setContext({ ...client.getContext() }));
    client.connect();
    return () => { off(); if (!existing) client.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  return { client, context };
}

export interface BeloteTableProps {
  /** Configuration réseau (URL socket + token + table). */
  config: BeloteTableClientConfig;
  /** Client déjà instancié (sinon créé depuis `config`). */
  client?: BeloteTableClient;
  /** Réglages visuels passés à la table (thème, etc.). */
  visual?: TableVisualConfig & { feltTheme?: string };
  /** Taille de référence du design (responsive). */
  baseWidth?: number;
  baseHeight?: number;
  /** Bouton plein écran. Défaut true. */
  fullscreen?: boolean;
}

/**
 * BeloteTable — la VUE complète, autonome et responsive : connecte le client,
 * rend la table à l'échelle dans un TableStage, et câble les actions (bid/play)
 * vers le client. À utiliser dans n'importe quelle app : <BeloteTable config={{ socketUrl, token, tableId }} />.
 */
export function BeloteTable({ config, client: external, visual, baseWidth, baseHeight, fullscreen = true }: BeloteTableProps) {
  const { client, context } = useBeloteTable(config, external);
  const { table, state, finished } = context;

  const names = useMemo(() => {
    if (!table) return ['Siège 1', 'Siège 2', 'Siège 3', 'Siège 4'];
    return [0, 1, 2, 3].map((seatIndex) => table.seats.find((s) => s.index === seatIndex)?.name ?? `Siège ${seatIndex + 1}`);
  }, [table]);

  const hands = useMemo(() => {
    if (!state) return [null, null, null, null];
    return state.watcher
      ? (state.hands ?? [null, null, null, null])
      : [0, 1, 2, 3].map((seatIndex) => (seatIndex === state.mySeat ? (state.myHand ?? []) : null));
  }, [state]);

  return (
    <TableStage baseWidth={baseWidth} baseHeight={baseHeight} fullscreenButton={fullscreen}>
      {state ? (
        <div className="bt-fill">
          {finished && <div className="bt-finished">Partie terminée — équipe <b>{finished.winner}</b> 🏆</div>}
          <TableSurface
            view={state.view}
            names={names}
            hands={hands as any}
            mySeat={(state.mySeat ?? null) as Seat | null}
            legal={state.legal}
            summary={state.summary}
            onBid={(bid: Omit<Bid, 'seat'>) => client.bid(bid)}
            onPlay={(card: Card) => client.play(card)}
            config={{ feltTheme: 'cosmos', ...visual }}
          />
        </div>
      ) : (
        <div className="bt-waiting">{context.status === 'connected' ? 'En attente de la partie…' : 'Connexion…'}</div>
      )}
    </TableStage>
  );
}

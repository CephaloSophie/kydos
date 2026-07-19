import { JetonAnnonce } from '../../ds/table/JetonAnnonce';
import { LogoEspaceInfo } from '../../ds/table/LogoEspaceInfo';
import { AnnonceAnnonce } from '../../ds/table/AnnonceAnnonce';
import type { Dir } from '../../ds/map';

export interface FeltBackdropProps {
  /** Enseigne d'atout { sym, red } ou null. */
  atout: { sym: string; red: boolean } | null;
  /** Afficher les 4 coins. */
  corners?: boolean;
  /** Opacité du glyphe central. */
  glyphOpacity?: number;
}

/** FeltBackdrop — VUE autonome du décor du tapis : glyphe d'atout central + 4 coins. */
export function FeltBackdrop({ atout, corners = true, glyphOpacity = 0.06 }: FeltBackdropProps) {
  if (!atout) return null;
  const suitClass = atout.red ? 'gt-suit-red' : 'gt-suit-black';
  return (
    <>
      <div className={`gt-atout-center ${suitClass}`} style={{ opacity: glyphOpacity }}>{atout.sym}</div>
      {corners && (['tl', 'tr', 'bl', 'br'] as const).map((c) => (
        <div key={c} className={`gt-atout-corner ${c} ${suitClass}`}>{atout.sym}</div>
      ))}
    </>
  );
}

export interface TableToastProps { message?: string | null }

/** TableToast — VUE autonome de la notification éphémère du tapis. */
export function TableToast({ message }: TableToastProps) {
  if (!message) return null;
  return <div className="gt-toast">{message}</div>;
}

export interface SeatDemande {
  value: number | null;
  capot: boolean;
  suitSymbol: string | null;
  isRed: boolean;
  reflexion: boolean;
}

export interface PlayerSeatProps {
  dir: Dir;
  team: 'a' | 'b';
  name: string;
  logoName: string;
  isDonneur: boolean;
  isEntame: boolean;
  isMeneur: boolean;
  demande: SeatDemande | null;
  contre: 'none' | 'contree' | 'surcontree';
  size?: number;
}

/**
 * PlayerSeat — VUE autonome d'un siège : jeton (donneur/entame/meneur) + logo d'équipe + annonce.
 * Présentationnel pur : toute la logique de calcul de la demande reste dans l'assembleur.
 */
export function PlayerSeat({ dir, team, name, logoName, isDonneur, isEntame, isMeneur, demande, contre, size = 30 }: PlayerSeatProps) {
  return (
    <div className={`gt-seat dir-${dir} ${isMeneur ? 'active' : ''}`}>
      <JetonAnnonce team={team} isDonneur={isDonneur} isEntame={isEntame} isMeneur={isMeneur} size={size} />
      <LogoEspaceInfo team={team} name={name} logoName={logoName} size={size} />
      <AnnonceAnnonce
        value={demande?.value ?? null}
        capot={demande?.capot ?? false}
        suitSymbol={demande?.suitSymbol ?? null}
        isRed={demande?.isRed ?? false}
        reflexion={demande?.reflexion ?? false}
        contre={contre}
        visible={demande != null || contre !== 'none'}
      />
    </div>
  );
}

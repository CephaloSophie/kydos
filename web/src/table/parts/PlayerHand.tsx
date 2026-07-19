import { cardStrength, type Card, type Suit } from 'belote-core';
import { PlayingCard } from '../../ds/table/PlayingCard';
import { toDsSuit, type Dir } from '../../ds/map';

const RED_SUITS = new Set<Suit>(['coeur', 'carreau']);

/** Ordre d'affichage des couleurs : atout à gauche, puis couleurs ALTERNÉES.
 *  Atout noir → [atout, rouge, noir, rouge] ; atout rouge → [atout, noir, rouge, noir]. */
function suitOrder(trump: Suit | null): Suit[] {
  if (!trump) return ['pique', 'coeur', 'trefle', 'carreau'];
  const reds = (['coeur', 'carreau'] as Suit[]).filter((s) => s !== trump);
  const blacks = (['pique', 'trefle'] as Suit[]).filter((s) => s !== trump);
  const rest = RED_SUITS.has(trump) ? [blacks[0], reds[0], blacks[1]] : [reds[0], blacks[0], reds[1]];
  return [trump, ...rest];
}

/** Trie une main pour l'affichage : atout d'abord (fort→faible), puis couleurs alternées. */
export function displaySort(cards: Card[], trump: Suit | null): Card[] {
  const groups = new Map<Suit, Card[]>();
  for (const c of cards) { const g = groups.get(c.suit) ?? []; g.push(c); groups.set(c.suit, g); }
  for (const [suit, g] of groups) g.sort((a, b) => cardStrength(b, trump ?? suit) - cardStrength(a, trump ?? suit));
  return suitOrder(trump).flatMap((s) => groups.get(s) ?? []);
}

export interface PlayerHandProps {
  /** Orientation du joueur sur le tapis. */
  dir: Dir;
  /** Cartes connues (main du joueur ou révélées en mode observateur). `null` → face cachée. */
  cards?: Card[] | null;
  /** Nombre de cartes à montrer quand elles sont face cachée (cards absentes). */
  count?: number;
  /** Atout courant, pour l'ordre de tri. */
  trump?: Suit | null;
  /** Force le dos des cartes (adversaires). */
  faceDown?: boolean;
  /** Clés `${rank}${suit}` des cartes jouables (surlignées). */
  playableSet?: Set<string>;
  /** Le joueur peut-il agir maintenant (cartes non jouables grisées) ? */
  interactive?: boolean;
  /** Chevauchement horizontal des cartes (px, négatif). */
  overlap?: number;
  onPlay?: (card: Card) => void;
}

/**
 * PlayerHand — VUE autonome de la main d'UN joueur (n'importe quelle orientation).
 * Modèle : `cards` + `trump`. Contrôleur : `onPlay`. Aucune dépendance à l'état de la table :
 * instanciable et testable seule. Le calage/centrage est géré par la classe `.gt-hand.dir-*`.
 */
export function PlayerHand({ dir, cards, count, trump = null, faceDown, playableSet, interactive, overlap, onPlay }: PlayerHandProps) {
  const step = overlap ?? (dir === 'south' ? -16 : -22);

  // Face cachée sans cartes connues : on ne rend que des dos.
  if (faceDown || !cards) {
    const n = count ?? cards?.length ?? 0;
    if (!n) return null;
    return (
      <div className={`gt-hand dir-${dir}`}>
        {Array.from({ length: n }).map((_, i) => (
          <PlayingCard key={i} rank="A" suit="spades" size="sm" faceDown style={{ marginLeft: i ? step : 0 }} />
        ))}
      </div>
    );
  }

  return (
    <div className={`gt-hand dir-${dir}`}>
      {displaySort(cards, trump).map((c, i) => {
        const playable = !!interactive && !!playableSet?.has(`${c.rank}${c.suit}`);
        return (
          <PlayingCard
            key={i}
            rank={c.rank}
            suit={toDsSuit(c.suit)}
            size="sm"
            playable={playable}
            disabled={!!interactive && !playable}
            onClick={playable ? () => onPlay?.(c) : undefined}
            style={{ marginLeft: i ? step : 0 }}
          />
        );
      })}
    </div>
  );
}

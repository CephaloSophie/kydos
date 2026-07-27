export interface AnnonceAnnonceProps {
  value?: number | null;
  capot?: boolean;
  suitSymbol?: string | null;
  isRed?: boolean;
  reflexion?: boolean;
  contre?: "none" | "contree" | "surcontree";
  visible?: boolean;
}
/** Demande retenue d'un siège (couleur rouge/noir) + contré/surcontré par joueur. */
export function AnnonceAnnonce(props: AnnonceAnnonceProps): JSX.Element | null;

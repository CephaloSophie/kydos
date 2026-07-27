export interface JetonAnnonceProps {
  team?: "a" | "b";
  isDonneur?: boolean;
  isEntame?: boolean;
  isMeneur?: boolean;
  size?: number;
}
/** Jetons Donneur + Entame (fixes) et triangle Meneur (mobile) d'un siège. */
export function JetonAnnonce(props: JetonAnnonceProps): JSX.Element | null;

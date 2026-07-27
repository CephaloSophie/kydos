export interface TableMessageProps {
  /** Émotion affichée par le pictogramme. */
  emotion?: "victoire" | "frustration" | "defaite";
  title: string;
  subtitle?: string;
  /** Compte à rebours (secondes) avant la suite. */
  countdown?: number;
  footer?: string;
  visible?: boolean;
}
/** Popup de message unique du tapis (inter-manche + fin de partie). */
export function TableMessage(props: TableMessageProps): JSX.Element | null;

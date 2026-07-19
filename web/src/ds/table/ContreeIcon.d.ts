export interface ContreeIconProps {
  action?: "contree" | "surcontree";
  onClick?: () => void;
  label?: string;
}
/** Bouton contré/surcontré d'un joueur (bas du tapis, à droite de son siège). */
export function ContreeIcon(props: ContreeIconProps): JSX.Element;

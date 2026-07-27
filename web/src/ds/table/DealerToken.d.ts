export interface DealerTokenProps {
  /** Équipe du siège : 'a' (doré) ou 'b' (rouge). */
  team?: "a" | "b";
  size?: number;
  label?: string;
  title?: string;
}
/** Jeton « D » affiché devant le premier annonceur. */
export function DealerToken(props: DealerTokenProps): JSX.Element;

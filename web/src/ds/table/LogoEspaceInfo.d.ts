export interface LogoEspaceInfoProps {
  team?: "a" | "b";
  name?: string;
  logoName?: string;
  size?: number;
}
/** Identité d'un siège : logo + 4 premières lettres du nom. */
export function LogoEspaceInfo(props: LogoEspaceInfoProps): JSX.Element;

export interface BidActionIconProps {
  /** Action d'enchère représentée. */
  action?: "passe" | "contree" | "surcontree" | "capot";
  size?: number;
  /** Pastille « allumée » (fond teinté). */
  active?: boolean;
  title?: string;
}
/** Pastille ronde d'une action d'enchère (passe/contrée/surcontrée/capot). */
export function BidActionIcon(props: BidActionIconProps): JSX.Element;

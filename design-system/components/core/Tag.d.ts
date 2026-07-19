import React from "react";

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** État sélectionné (filtre actif). */
  selected?: boolean;
  /** Si fourni, affiche une croix de retrait. */
  onRemove?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}

/** Étiquette filtre/attribut. */
export function Tag(props: TagProps): JSX.Element;

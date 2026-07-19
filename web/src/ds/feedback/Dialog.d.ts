import React from "react";

export interface DialogProps {
  open: boolean;
  title?: React.ReactNode;
  onClose?: () => void;
  /** Pied de modale (boutons). */
  footer?: React.ReactNode;
  /** Largeur max en px. */
  width?: number;
  children?: React.ReactNode;
}

/** Fenêtre modale centrée (créer une table, confirmer une suppression…). */
export function Dialog(props: DialogProps): JSX.Element | null;

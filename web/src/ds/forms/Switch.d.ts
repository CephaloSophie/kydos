import React from "react";

export interface SwitchProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  /** Libellé à droite + aria-label. */
  label?: string;
  disabled?: boolean;
  id?: string;
}

/** Bascule on/off (role=switch). */
export function Switch(props: SwitchProps): JSX.Element;

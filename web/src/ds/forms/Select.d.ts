import React from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  value?: string;
  options: SelectOption[];
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

/** Liste déroulante personnalisée (listbox accessible). */
export function Select(props: SelectProps): JSX.Element;

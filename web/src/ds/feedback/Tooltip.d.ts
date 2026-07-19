import React from "react";

export interface TooltipProps {
  content: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
}

/** Infobulle au survol/focus (web only). */
export function Tooltip(props: TooltipProps): JSX.Element;

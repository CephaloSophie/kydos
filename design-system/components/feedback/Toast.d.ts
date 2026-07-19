import React from "react";

export interface ToastProps {
  tone?: "neutral" | "accent" | "success" | "warning" | "error" | "info" | "spark";
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  /** Bouton de fermeture si fourni. */
  onClose?: () => void;
  /** Zone d'action (bouton). */
  action?: React.ReactNode;
}

/** Notification éphémère (web + mobile). */
export function Toast(props: ToastProps): JSX.Element;

export interface EmotionIconProps {
  /** Émotion représentée. */
  emotion?: "victoire" | "frustration" | "defaite";
  size?: number;
}
/** Pictogramme d'émotion (victoire / frustration / défaite). */
export function EmotionIcon(props: EmotionIconProps): JSX.Element;

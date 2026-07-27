/* =============================================================================
 * DATA · i18n.ts — Dictionnaire FR / EN (port du design system).
 * Bilingue : bascule FR/EN dans la barre supérieure. t(key) résout selon la
 * langue courante du store (défaut FR).
 * ========================================================================== */

export type Lang = 'fr' | 'en';

export const DICT: Record<Lang, Record<string, string>> = {
  fr: {
    'login.welcome': 'Bon retour à la table.',
    'login.sub': 'Rejoignez vos robots et affrontez le monde en belote contrée temps réel.',
    'login.cta': 'Entrer dans la partie',
    'login.signup': 'Créer un compte',
    'login.have': 'Nouveau ?',
    'common.back': 'Retour',
    'home.play': 'Jouer',
    'home.robots': 'Mes robots',
    'home.create': 'Créer un robot',
  },
  en: {
    'login.welcome': 'Welcome back to the table.',
    'login.sub': 'Join your robots and take on the world in real-time coinche belote.',
    'login.cta': 'Enter the game',
    'login.signup': 'Create an account',
    'login.have': 'New here?',
    'common.back': 'Back',
    'home.play': 'Play',
    'home.robots': 'My robots',
    'home.create': 'Create a robot',
  },
};

export type Translate = (key: string) => string;
export function makeT(getLang: () => Lang): Translate {
  return (key: string) => (DICT[getLang()] || DICT.fr)[key] ?? key;
}

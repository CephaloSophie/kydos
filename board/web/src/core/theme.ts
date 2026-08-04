/* Gestion des thèmes. */
const KEY = 'bord.theme';

export type ThemeFamily = 'ubuntu' | 'mac';
export type ThemeMode = 'light' | 'dark';
export type ThemeId = `${ThemeFamily}-${ThemeMode}`;

export const DEFAULT_THEME: ThemeId = 'ubuntu-dark';

export function getTheme(): ThemeId {
  const saved = localStorage.getItem(KEY) as ThemeId | null;
  if (saved && /^(ubuntu|mac)-(light|dark)$/.test(saved)) return saved;
  // Défaut : préférence système pour clair/sombre + Ubuntu par défaut.
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
  return `ubuntu-${prefersDark ? 'dark' : 'light'}`;
}

export function setTheme(theme: ThemeId): void {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(KEY, theme);
}

export function initTheme(): void { setTheme(getTheme()); }

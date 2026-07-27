// ============================================================================
//  Thèmes de l'éditeur de code (CodeMirror). Thème « Noir » par défaut
//  (fond vraiment noir), + One Dark. Coloration syntaxique incluse.
// ============================================================================

import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { oneDark } from '@codemirror/theme-one-dark';
import type { Extension } from '@codemirror/state';

// --- Thème NOIR (fond #000, interface sombre) ---
const noirBg = '#000000';
const noirGutter = '#000000';
const noirSel = '#173a5e';

const noirTheme = EditorView.theme({
  '&': { color: '#e6e6e6', backgroundColor: noirBg },
  '.cm-content': { caretColor: '#eab23a' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#eab23a' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { backgroundColor: noirSel },
  '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.03)' },
  '.cm-gutters': { backgroundColor: noirGutter, color: '#4a4a4a', border: 'none' },
  '.cm-activeLineGutter': { backgroundColor: 'rgba(255,255,255,0.04)', color: '#9a9a9a' },
  '.cm-foldPlaceholder': { backgroundColor: 'transparent', border: 'none', color: '#888' },
  '.cm-tooltip': { backgroundColor: '#0c0c0c', border: '1px solid #2a2a2a' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: '#173a5e', color: '#fff' },
}, { dark: true });

const noirHighlight = HighlightStyle.define([
  { tag: t.keyword, color: '#c678dd' },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: '#e06c75' },
  { tag: [t.function(t.variableName), t.labelName], color: '#61afef' },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#d19a66' },
  { tag: [t.definition(t.name), t.separator], color: '#e6e6e6' },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#e5c07b' },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: '#56b6c2' },
  { tag: [t.meta, t.comment], color: '#5c6370', fontStyle: 'italic' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: [t.string, t.special(t.brace)], color: '#98c379' },
  { tag: t.bool, color: '#d19a66' },
  { tag: t.invalid, color: '#ff5370' },
]);

export const THEMES: Record<string, { label: string; ext: Extension }> = {
  noir: { label: 'Noir', ext: [noirTheme, syntaxHighlighting(noirHighlight)] },
  oneDark: { label: 'One Dark', ext: oneDark },
};

export type ThemeKey = keyof typeof THEMES;

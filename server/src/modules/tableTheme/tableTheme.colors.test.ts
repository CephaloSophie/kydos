/* =============================================================================
 * TABLE-THEME · tableTheme.colors.test.ts — Résolution PURE des couleurs.
 * ========================================================================== */
import { describe, it, expect } from 'vitest';
import { normalizeHex, shade, resolveThemeColors, BUILTIN_THEMES } from './tableTheme.colors.js';

describe('normalizeHex', () => {
  it('accepte #rrggbb et rrggbb, renvoie minuscule préfixé', () => {
    expect(normalizeHex('#1A5C3A', '#000000')).toBe('#1a5c3a');
    expect(normalizeHex('1a5c3a', '#000000')).toBe('#1a5c3a');
  });
  it('replie sur le fallback si invalide', () => {
    expect(normalizeHex('rouge', '#123456')).toBe('#123456');
    expect(normalizeHex('#12345', '#123456')).toBe('#123456');   // 5 chiffres
    expect(normalizeHex(null, '#123456')).toBe('#123456');
    expect(normalizeHex(42, '#123456')).toBe('#123456');
  });
});

describe('shade', () => {
  it('assombrit vers le noir (amount négatif)', () => {
    expect(shade('#808080', -1)).toBe('#000000');
    expect(shade('#808080', 0)).toBe('#808080');
  });
  it('éclaircit vers le blanc (amount positif)', () => {
    expect(shade('#808080', 1)).toBe('#ffffff');
  });
  it('un demi-assombrissement rapproche de zéro', () => {
    // #808080 = 128 ; -0.5 → 64 = #404040
    expect(shade('#808080', -0.5)).toBe('#404040');
  });
});

describe('resolveThemeColors', () => {
  it('dérive felt2 (bords), les 3 nuances de rail et accent2', () => {
    const c = resolveThemeColors({ feltColor: '#1a5c3a', railColor: '#6b3a1a', accentColor: '#f0c46a' });
    expect(c.felt1).toBe('#1a5c3a');
    // felt2 dérivé (assombri) → différent et plus sombre.
    expect(c.felt2).not.toBe(c.felt1);
    // Les nuances de rail sont ordonnées clair > rail > foncé > intérieur.
    expect(c.railHi).not.toBe(c.rail);
    expect(c.railLo).not.toBe(c.rail);
    expect(c.railInner).not.toBe(c.railLo);
    expect(c.accent).toBe('#f0c46a');
    expect(c.accent2).not.toBe(c.accent);
  });

  it('feltEdgeColor explicite est respecté (pas de dérivation)', () => {
    const c = resolveThemeColors({ feltColor: '#1a5c3a', feltEdgeColor: '#001122', railColor: '#6b3a1a' });
    expect(c.felt2).toBe('#001122');
  });

  it('couleurs invalides → replis sûrs (jamais d\'exception)', () => {
    const c = resolveThemeColors({ feltColor: 'nope', railColor: 'nope' });
    expect(c.felt1).toBe('#1a5c3a');   // fallback feutre
    expect(c.rail).toBe('#6b3a1a');    // fallback rail
    expect(c.accent).toBe('#f0c46a');  // fallback accent
  });
});

describe('BUILTIN_THEMES', () => {
  it('contient les 6 presets, tous résolvables sans erreur', () => {
    expect(BUILTIN_THEMES.length).toBe(6);
    for (const t of BUILTIN_THEMES) {
      const c = resolveThemeColors(t);
      expect(c.felt1).toMatch(/^#[0-9a-f]{6}$/);
      expect(c.rail).toMatch(/^#[0-9a-f]{6}$/);
    }
    // Les clés attendues existent.
    expect(BUILTIN_THEMES.map((t) => t.key)).toEqual(
      ['classic', 'acier', 'hybride', 'royal', 'cosmos', 'olympus'],
    );
  });
});

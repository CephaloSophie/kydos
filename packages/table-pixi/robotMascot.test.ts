import { describe, it, expect } from 'vitest';
import { robotMascotSvg, faceKey, shade } from './robotMascot';

describe('robotMascot — générateur SVG paramétrique', () => {
  it('shade éclaircit (>0) et assombrit (<0) sans dépasser [00, ff]', () => {
    expect(shade('#000000', 1)).toBe('#ffffff');   // vers blanc
    expect(shade('#ffffff', -1)).toBe('#000000');  // vers noir
    expect(shade('#808080', 0)).toBe('#808080');   // identité
  });

  it('faceKey est stable et distingue les couleurs', () => {
    expect(faceKey({ accentColor: '#7ecb98' })).toBe('#7ecb98||');
    expect(faceKey({ accentColor: '#7ecb98', bodyColor: '#111', outlineColor: '#222' })).toBe('#7ecb98|#111|#222');
    expect(faceKey({ accentColor: '#e85d70' })).not.toBe(faceKey({ accentColor: '#7ecb98' }));
  });

  it('robotMascotSvg produit un SVG dimensionné qui embarque les couleurs demandées', () => {
    const svg = robotMascotSvg({ accentColor: '#e85d70', bodyColor: '#334455', outlineColor: '#101820' }, 48);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('width="48"');
    expect(svg).toContain('height="53"'); // 48 * 132/120 = 52.8 → 53
    expect(svg).toContain('#e85d70');      // accent (yeux/antenne/sourire)
    expect(svg).toContain('#101820');      // contour explicite
  });

  it('dérive corps et contour de l’accent quand ils sont absents', () => {
    const svg = robotMascotSvg({ accentColor: '#7ecb98' });
    // contour foncé = shade(accent, -0.62) apparaît tel quel (stroke).
    expect(svg).toContain(shade('#7ecb98', -0.62));
    // le corps auto (shade(accent, 0.62)) alimente les stops du dégradé.
    const body = shade('#7ecb98', 0.62);
    expect(svg).toContain(shade(body, -0.14)); // bodyLo, utilisé aussi pour oreilles/col
  });

  it('génère des identifiants de defs uniques à chaque appel (pas de collision)', () => {
    const a = robotMascotSvg({ accentColor: '#7ecb98' });
    const b = robotMascotSvg({ accentColor: '#7ecb98' });
    const idA = a.match(/id="(rm\d+)b"/)?.[1];
    const idB = b.match(/id="(rm\d+)b"/)?.[1];
    expect(idA).toBeTruthy();
    expect(idA).not.toBe(idB);
  });
});

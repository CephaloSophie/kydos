import { describe, it, expect } from 'vitest';
import { mascotSvg, robotMascotSvg, faceKey, shade } from './robotMascot';

describe('mascot — générateur SVG paramétrique', () => {
  it('shade éclaircit (>0) et assombrit (<0) sans dépasser [00, ff]', () => {
    expect(shade('#000000', 1)).toBe('#ffffff');
    expect(shade('#ffffff', -1)).toBe('#000000');
    expect(shade('#808080', 0)).toBe('#808080');
  });

  it('faceKey encode famille, couleurs et traits (yeux/bouche/antennes)', () => {
    expect(faceKey({ accentColor: '#7ecb98' })).toBe('robot|#7ecb98|||1|open|smile');
    expect(faceKey({ kind: 'human', accentColor: '#7ecb98', antennas: 3, eyes: 'wink-left', mouth: 'grin' }))
      .toBe('human|#7ecb98|||3|wink-left|grin');
    expect(faceKey({ accentColor: '#e85d70' })).not.toBe(faceKey({ accentColor: '#7ecb98' }));
  });

  it('produit un SVG dimensionné qui embarque les couleurs demandées', () => {
    const svg = robotMascotSvg({ accentColor: '#e85d70', bodyColor: '#334455', outlineColor: '#101820' }, 48);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('width="48"');
    expect(svg).toContain('height="53"'); // 48 * 132/120 = 52.8 → 53
    expect(svg).toContain('#e85d70');
    expect(svg).toContain('#101820');
  });

  it('famille robot vs humain : visière (robot) / cheveux+oreilles rondes (humain)', () => {
    const robot = mascotSvg({ kind: 'robot', accentColor: '#7ecb98' });
    const human = mascotSvg({ kind: 'human', accentColor: '#4f8ce0' });
    expect(robot).toContain('aria-label="Robot"');
    expect(robot).toContain('rect');            // tête plaquée + visière
    expect(human).toContain('aria-label="Avatar joueur"');
    expect(human).toContain('<circle cx="60" cy="68" r="40"'); // tête ronde
    expect(human).toContain('ellipse');         // oreilles douces
  });

  it('le nombre d’antennes/mèches (1..5) fait varier le rendu', () => {
    const one = mascotSvg({ accentColor: '#7ecb98', antennas: 1 });
    const five = mascotSvg({ accentColor: '#7ecb98', antennas: 5 });
    const countBulbs = (s: string) => (s.match(/filter="url\(#m\d+g\)"/g) ?? []).length;
    expect(countBulbs(five)).toBeGreaterThan(countBulbs(one));
  });

  it('état des yeux « fermé » dessine des paupières (pas de pastille pleine)', () => {
    const open = mascotSvg({ kind: 'human', accentColor: '#4f8ce0', eyes: 'open' });
    const closed = mascotSvg({ kind: 'human', accentColor: '#4f8ce0', eyes: 'closed' });
    // Les yeux ouverts (humain) ont un blanc d'œil (ellipse) ; fermés → arcs de paupière.
    expect(open.match(/ellipse/g)!.length).toBeGreaterThan(closed.match(/ellipse/g)?.length ?? 0);
  });

  it('bouche : chaque état produit un tracé distinct', () => {
    const smile = mascotSvg({ accentColor: '#7ecb98', mouth: 'smile' });
    const angry = mascotSvg({ accentColor: '#7ecb98', mouth: 'angry' });
    const surprised = mascotSvg({ accentColor: '#7ecb98', mouth: 'surprised' });
    expect(smile).not.toBe(angry);
    expect(surprised).toContain('ellipse'); // bouche surprise = petit ovale
  });

  it('dérive corps et contour de l’accent quand ils sont absents', () => {
    const svg = robotMascotSvg({ accentColor: '#7ecb98' });
    expect(svg).toContain(shade('#7ecb98', -0.62)); // contour
    expect(svg).toContain(shade(shade('#7ecb98', 0.62), -0.14)); // bodyLo
  });

  it('génère des identifiants de defs uniques à chaque appel (pas de collision)', () => {
    const idA = mascotSvg({ accentColor: '#7ecb98' }).match(/id="(m\d+)b"/)?.[1];
    const idB = mascotSvg({ accentColor: '#7ecb98' }).match(/id="(m\d+)b"/)?.[1];
    expect(idA).toBeTruthy();
    expect(idA).not.toBe(idB);
  });
});

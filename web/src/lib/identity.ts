// Génère une identité visuelle unique et déterministe (façon GitHub) à partir
// d'un nom/identifiant : une couleur + un identicon 5x5 symétrique.
// Aucune dépendance, aucun upload : même clé => même rendu, partout.

function fnv1a(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
  return h >>> 0;
}

export interface Identity {
  color: string;
  hue: number;
  cells: boolean[][]; // 5x5, symétrique gauche/droite
}

export function identity(key: string): Identity {
  const h = fnv1a(key || 'x');
  const hue = h % 360;
  const color = `hsl(${hue} 62% 56%)`;
  let s = h || 1;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const cells: boolean[][] = Array.from({ length: 5 }, () => Array(5).fill(false));
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 5; r++) {
      const on = rnd() > 0.5;
      cells[r][c] = on;
      cells[r][4 - c] = on;
    }
  }
  return { color, hue, cells };
}

/** Clé stable d'une équipe à partir des noms de ses deux joueurs. */
export function teamKey(memberA: string, memberB: string): string {
  return [memberA, memberB].map((x) => (x || '').trim().toLowerCase()).sort().join('·');
}

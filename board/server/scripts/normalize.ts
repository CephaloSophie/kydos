/* =============================================================================
 * SEED · normalize.ts — Normalisation défensive des tâches importées.
 * -----------------------------------------------------------------------------
 * Le tasks.json historique contient des tâches mal formées à cause d'anciens
 * bugs de génération (colonnes décalées : complexity="1 h", description en
 * tableau, acceptance en string, etc.). Cette fonction coerce chaque champ
 * vers le type attendu par le schéma Mongo et logue les corrections.
 *
 * Aucune donnée n'est perdue — les cases mal placées sont réinterprétées
 * dans le champ le plus proche possible (une string devient un tableau à un
 * élément, un tableau devient une string jointe, une string "1 h" devient
 * la durée + complexity=0). Le seed ne plante JAMAIS.
 * ========================================================================== */

export interface NormalizedTask {
  id: string;
  title: string;
  area?: string;
  module?: string;
  type?: string;
  status?: string;
  priority?: string;
  version?: string;
  estimate?: string;
  spec?: string;
  description: string;
  instructions: string[];
  acceptance: string[];
  techno?: string;
  category?: string;
  complexity: number;
  duration?: string;
  logs: unknown[];
  history: Array<{ at?: Date | string; status?: string; by: string; note?: string }>;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface NormalizeResult {
  normalized: NormalizedTask;
  warnings: string[];
}

/** Coerce un champ vers string : join si tableau, String() sinon. */
function toStr(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((v) => toStr(v)).filter(Boolean).join('. ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Coerce un champ vers string[] : wrap si string, filter si tableau. */
function toStrArray(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.map((v) => toStr(v)).filter(Boolean);
  if (typeof value === 'string') return value.trim() ? [value] : [];
  return [toStr(value)];
}

/** Coerce vers un nombre. Tente d'extraire un chiffre d'une string ("1 h" → 1). */
function toNum(value: unknown, fallback = 0): { value: number; extractedFrom?: string } {
  if (typeof value === 'number' && Number.isFinite(value)) return { value };
  if (typeof value === 'string') {
    const match = /-?\d+(?:\.\d+)?/.exec(value);
    if (match) return { value: Number(match[0]), extractedFrom: value };
  }
  return { value: fallback };
}

/** Coerce vers un tableau d'entrées d'historique. */
function toHistory(value: unknown): NormalizedTask['history'] {
  if (!Array.isArray(value)) return [];
  return value.filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null).map((e) => ({
    at: (e.at as Date | string | undefined) ?? new Date().toISOString(),
    status: e.status ? String(e.status) : undefined,
    by: e.by ? String(e.by) : 'unknown',
    note: e.note ? String(e.note) : undefined,
  }));
}

/**
 * Normalise une tâche brute (issue du JSON) vers la forme attendue par Mongo.
 * Retourne aussi la liste des corrections appliquées (utile pour le log seed).
 */
export function normalizeTask(raw: Record<string, unknown>): NormalizeResult {
  const warnings: string[] = [];

  const id = String(raw.id ?? '').trim();
  if (!id) throw new Error('id manquant');
  const title = String(raw.title ?? '').trim();
  if (!title) throw new Error('title manquant');

  // description : parfois un tableau (bug historique) → jointure lisible.
  let description: string;
  if (typeof raw.description === 'string') {
    description = raw.description;
  } else if (Array.isArray(raw.description)) {
    warnings.push('description était un tableau');
    description = toStr(raw.description);
  } else if (raw.description !== undefined && raw.description !== null) {
    warnings.push('description reformatée');
    description = toStr(raw.description);
  } else {
    description = '';
  }

  // complexity : parfois une string type "1 h" → on extrait le nombre.
  const cplx = toNum(raw.complexity, 0);
  if (cplx.extractedFrom) warnings.push(`complexity="${cplx.extractedFrom}" → ${cplx.value}`);
  const complexity = cplx.value;

  // acceptance : parfois une string au lieu d'un tableau.
  let acceptance: string[];
  if (Array.isArray(raw.acceptance)) {
    acceptance = raw.acceptance.map((v) => toStr(v)).filter(Boolean);
  } else if (typeof raw.acceptance === 'string' && raw.acceptance.trim()) {
    warnings.push('acceptance était une string');
    acceptance = [raw.acceptance.trim()];
  } else {
    acceptance = [];
  }

  // instructions : symétrique.
  let instructions: string[];
  if (Array.isArray(raw.instructions)) {
    instructions = raw.instructions.map((v) => toStr(v)).filter(Boolean);
  } else if (typeof raw.instructions === 'string' && raw.instructions.trim()) {
    warnings.push('instructions était une string');
    instructions = [raw.instructions.trim()];
  } else {
    instructions = [];
  }

  // type : le schéma attend string, tolère les nombres (bug historique).
  let type: string | undefined;
  if (typeof raw.type === 'string') type = raw.type;
  else if (typeof raw.type === 'number') { warnings.push(`type=${raw.type} converti en string`); type = String(raw.type); }
  else if (raw.type !== undefined && raw.type !== null) type = toStr(raw.type);

  return {
    normalized: {
      id, title,
      area: raw.area ? toStr(raw.area) : undefined,
      module: raw.module ? toStr(raw.module) : undefined,
      type,
      status: raw.status ? toStr(raw.status) : 'pending',
      priority: raw.priority ? toStr(raw.priority) : 'P2',
      version: raw.version !== undefined && raw.version !== null ? toStr(raw.version) : undefined,
      estimate: raw.estimate !== undefined && raw.estimate !== null ? toStr(raw.estimate) : undefined,
      spec: raw.spec !== undefined && raw.spec !== null ? toStr(raw.spec) : undefined,
      description,
      instructions,
      acceptance,
      techno: raw.techno !== undefined && raw.techno !== null ? toStr(raw.techno) : undefined,
      category: raw.category !== undefined && raw.category !== null ? toStr(raw.category) : undefined,
      complexity,
      duration: raw.duration !== undefined && raw.duration !== null ? toStr(raw.duration) : undefined,
      logs: Array.isArray(raw.logs) ? raw.logs : [],
      history: toHistory(raw.history),
      createdAt: raw.createdAt as Date | string | undefined,
      updatedAt: raw.updatedAt as Date | string | undefined,
    },
    warnings,
  };
}

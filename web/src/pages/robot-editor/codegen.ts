// ============================================================================
//  Générateur de code + bac à sable d'aperçu.
//
//  Les helpers (bid, play, log, helpers) sont exposés via `this` — JAMAIS comme
//  paramètres injectés. Conséquences :
//   - aucune collision possible (le scripteur peut déclarer ses propres const),
//   - le code généré est AUTONOME et exécutable tel quel dans le moteur.
//
//  Convention d'écriture dans les fonctions :
//   - `ctx`              : le RobotContext (seul paramètre)
//   - `this.bid(...)`    : construit une BidDecision
//   - `this.play(card)`  : construit une CardDecision
//   - `this.log.info(...)` : journalise
//   - `this.helpers.*`   : utilitaires (strength, value, wouldWin, countSuit)
//   - `this.maFonction(ctx, ...)` : appelle une autre fonction du cerveau
// ============================================================================

import { BRAIN_FNS, type BrainFn } from './brainDefs';

export interface CustomFn {
  key: string;
  params: string;      // ex. "ctx, card"
  returns: string;
}

export interface BrainModel {
  /** Nom du cerveau (= AlgoSpec.name qui le résout dans le registre). */
  name: string;
  /** Corps JS de chaque fonction, indexés par clé (decideBid, ... + fonctions custom). */
  bodies: Record<string, string>;
  /** Fonctions personnalisées ajoutées par le scripteur (au-delà des 4 du contrat). */
  custom?: CustomFn[];
}

const indent = (code: string, pad = '    ') => code.split('\n').map((l) => (l ? pad + l : l)).join('\n');

/** Bloc de helpers défini DANS la classe générée (rend le code autonome). */
function helpersBlock(): string {
  return `  // --- Helpers du cerveau (exposés via this) ----------------------------------
  bid(action, opts = {}) { return { action, thinkMultiplier: 1, ...opts }; }
  play(card, reason = '') { return { card, thinkMultiplier: 1, reason }; }
  get log() {
    const sink = (level) => (cat, msg, data) => (this._logger ? this._logger[level]?.(cat, msg, data) : undefined);
    return { info: sink('info'), debug: sink('debug'), warn: sink('warn'), error: sink('error') };
  }
  get helpers() {
    return {
      strength: (c, trump) => (c.suit === trump
        ? ['7','8','D','R','10','A','9','V'] : ['7','8','9','V','D','R','10','A']).indexOf(c.rank),
      value: (c, trump) => {
        const T = { V:20,'9':14,A:11,'10':10,R:4,D:3,'8':0,'7':0 };
        const P = { A:11,'10':10,R:4,D:3,V:2,'9':0,'8':0,'7':0 };
        return (c.suit === trump ? T : P)[c.rank] ?? 0;
      },
      wouldWin: (card, ctx) => {
        const trick = ctx?.table?.currentTrick ?? [];
        if (!trick.length) return true;
        const trump = ctx?.table?.trump;
        const lead = trick[0].card.suit;
        const str = (c) => this.helpers.strength(c, trump) + (c.suit === trump ? 100 : c.suit === lead ? 50 : 0);
        const best = Math.max(...trick.map((t) => str(t.card)));
        return str(card) > best;
      },
      countSuit: (hand, suit) => hand.filter((c) => c.suit === suit).length,
    };
  }`;
}

/** Génère le fichier TypeScript complet de la classe cerveau (autonome, enregistrée). */
export function generateBrainCode(model: BrainModel): string {
  const className = model.name.replace(/[^A-Za-z0-9]/g, '') || 'MonCerveau';

  const renderMethod = (key: string, params: string, fallbackReturn: string) => {
    const body = model.bodies[key] ?? `return ${fallbackReturn};`;
    return `  ${key}(${params}) {\n${indent(body)}\n  }`;
  };

  const contractMethods = BRAIN_FNS.map((fn: BrainFn) =>
    renderMethod(fn.key, 'ctx', fn.returns === 'boolean' ? 'false' : "this.bid('pass', { reason: 'todo' })"),
  ).join('\n\n');

  const customMethods = (model.custom ?? []).map((c) =>
    renderMethod(c.key, c.params || 'ctx', c.returns === 'boolean' ? 'false' : 'null'),
  ).join('\n\n');

  const all = [contractMethods, customMethods].filter(Boolean).join('\n\n');

  return `import { registerAlgorithm } from 'belote-core';

// ============================================================================
//  ${className} — cerveau de robot custom (généré par l'éditeur).
//  Implémente le contrat RobotAlgorithm. AUTONOME : les helpers (bid, play, log,
//  helpers) sont définis dans la classe et accessibles via this.
//  Fonctions personnalisées appelables via this.maFonction(ctx, ...).
// ============================================================================

class ${className} {
  constructor(spec, responseTimeMs, maxPlayTimeMs, logger) {
    this.spec = spec;
    this.name = '${model.name}';
    this.id = 'brain:${className}';
    this.responseTimeMs = responseTimeMs;
    this.maxPlayTimeMs = maxPlayTimeMs;
    this._logger = logger ?? null;
  }

${helpersBlock()}

${all}
}

// Enregistrement : tout robot dont l'AlgoSpec.name === '${model.name}' utilisera CE cerveau.
registerAlgorithm('${model.name}', (spec, brain, responseTimeMs, maxPlayTimeMs) =>
  new ${className}(spec, responseTimeMs, maxPlayTimeMs));

export { ${className} };`;
}

export interface LogLine { level: 'info' | 'debug' | 'warn' | 'error'; cat: string; msg: string; data?: any }

/**
 * Exécute une fonction du cerveau dans un bac à sable pour PRÉVISUALISER le résultat.
 * `this` porte les helpers ET les autres fonctions (appels croisés this.xxx()).
 * Le seul paramètre des fonctions est `ctx` — donc AUCUNE collision d'identifiant.
 */
export function runFunctionPreview(
  fnKey: string, body: string, ctx: any, _args: any[] = [], others: Record<string, { params: string; body: string }> = {},
): { ok: boolean; result?: any; logs: LogLine[]; error?: string } {
  const logs: LogLine[] = [];
  const mk = (level: LogLine['level']) => (cat: string, msg: string, data?: any) => logs.push({ level, cat, msg, data });

  const strength = (c: any, trump: string) =>
    (c.suit === trump ? ['7', '8', 'D', 'R', '10', 'A', '9', 'V'] : ['7', '8', '9', 'V', 'D', 'R', '10', 'A']).indexOf(c.rank);
  const value = (c: any, trump: string) => {
    const T: any = { V: 20, '9': 14, A: 11, '10': 10, R: 4, D: 3, '8': 0, '7': 0 };
    const P: any = { A: 11, '10': 10, R: 4, D: 3, V: 2, '9': 0, '8': 0, '7': 0 };
    return (c.suit === trump ? T : P)[c.rank] ?? 0;
  };

  // `self` = le « this » des fonctions : helpers + autres fonctions liées.
  const self: any = {
    spec: ctx?.spec,
    bid: (action: string, opts: any = {}) => ({ action, thinkMultiplier: 1, ...opts }),
    play: (card: any, reason = '') => ({ card, thinkMultiplier: 1, reason }),
    log: { info: mk('info'), debug: mk('debug'), warn: mk('warn'), error: mk('error') },
    helpers: {
      strength, value,
      wouldWin: (card: any, c: any) => {
        const trick = c?.table?.currentTrick ?? [];
        if (!trick.length) return true;
        const trump = c?.table?.trump;
        const lead = trick[0].card.suit;
        const str = (x: any) => strength(x, trump) + (x.suit === trump ? 100 : x.suit === lead ? 50 : 0);
        const best = Math.max(...trick.map((t: any) => str(t.card)));
        return str(card) > best;
      },
      countSuit: (hand: any[], suit: string) => hand.filter((x) => x.suit === suit).length,
    },
  };

  try {
    // Chaque fonction : un seul paramètre `ctx`. Le reste passe par this.
    for (const [k, f] of Object.entries(others)) {
      // eslint-disable-next-line no-new-func
      const fn = new Function('ctx', `"use strict";\n${f.body}`);
      self[k] = (c: any = ctx) => fn.call(self, c);
    }
    // eslint-disable-next-line no-new-func
    const main = new Function('ctx', `"use strict";\n${body}`);
    const result = main.call(self, ctx);
    return { ok: true, result, logs };
  } catch (e: any) {
    logs.push({ level: 'error', cat: 'runtime', msg: e?.message ?? String(e) });
    return { ok: false, logs, error: e?.message ?? String(e) };
  }
}

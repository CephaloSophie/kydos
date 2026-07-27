// ============================================================================
//  Descripteur de l'éditeur de cerveau — TOUT est représentable en JSON.
//  Norme KANTO APLO : l'interface (toolbox, panneaux, fonctions, projet, versions)
//  est décrite par des données, pas codée en dur. Un moteur de rendu pourrait
//  reconstruire l'éditeur depuis ce descripteur.
// ============================================================================

import { BRAIN_FNS, CONTEXT_REFERENCE, HELPERS_REFERENCE, SNIPPETS } from './brainDefs';
import type { CustomFn } from './codegen';
import type { BrainProject, BrainVersion } from './brainStore';

/** Identité visuelle d'un type de retour (norme couleur Kanto Aplo). */
export const RETURN_COLORS: Record<string, string> = {
  BidDecision: '#E8714A',  // Hermès orange
  CardDecision: '#2DD4A0', // Synergos émeraude
  boolean: '#3D8EE8',      // Logos bleu
  number: '#8B5CF6',       // Mantis violet
  any: '#8B5CF6',
};

export interface EditorPanelDescriptor {
  id: string;
  title: string;
  kind: 'toolbox' | 'editor' | 'context' | 'console' | 'projectbar';
  position: 'left' | 'center' | 'right' | 'bottom' | 'top';
  collapsible: boolean;
  defaultCollapsed?: boolean;
}

/** Layout déclaratif de l'éditeur (les panneaux et leur place). */
export const EDITOR_LAYOUT: EditorPanelDescriptor[] = [
  { id: 'projectbar', title: 'Projets & versions', kind: 'projectbar', position: 'top', collapsible: false },
  { id: 'toolbox', title: 'Boîte à outils', kind: 'toolbox', position: 'left', collapsible: false },
  { id: 'editor', title: 'Éditeur de code', kind: 'editor', position: 'center', collapsible: false },
  { id: 'context', title: 'Contexte', kind: 'context', position: 'right', collapsible: false },
  { id: 'console', title: 'Console', kind: 'console', position: 'bottom', collapsible: true, defaultCollapsed: true },
];

/** Sections de la toolbox, en JSON. */
export const TOOLBOX_DESCRIPTOR = {
  sections: [
    { id: 'functions', title: 'Fonctions', kind: 'function-list' as const },
    { id: 'search', title: 'Recherche', kind: 'search' as const },
    { id: 'context', title: 'Contexte', kind: 'palette' as const, items: CONTEXT_REFERENCE },
    { id: 'helpers', title: 'Helpers', kind: 'palette' as const, items: HELPERS_REFERENCE },
    { id: 'snippets', title: 'Extraits', kind: 'palette' as const, items: SNIPPETS },
  ],
};

/** Le cerveau en cours d'édition, sérialisé. */
export interface BrainDescriptor {
  name: string;
  theme: string;
  functions: {
    key: string;
    label: string;
    returns: string;
    color: string;
    custom: boolean;
    params: string;
  }[];
}

/** Construit le descripteur des fonctions (contrat + custom) — JSON pur. */
export function describeBrain(name: string, theme: string, customFns: CustomFn[]): BrainDescriptor {
  const contract = BRAIN_FNS.map((f) => ({
    key: f.key, label: f.label, returns: f.returns,
    color: RETURN_COLORS[f.returns] ?? '#C9963A', custom: false, params: 'ctx',
  }));
  const custom = customFns.map((c) => ({
    key: c.key, label: c.key, returns: c.returns,
    color: RETURN_COLORS[c.returns] ?? '#8B5CF6', custom: true, params: c.params,
  }));
  return { name, theme, functions: [...contract, ...custom] };
}

/** Résumé d'un projet (et de ses versions) en JSON — pour liste/sélecteur. */
export function describeProject(p: BrainProject): {
  id?: string; title: string; activeVersion: number;
  versions: { label: string; brainName: string; functionCount: number }[];
} {
  return {
    id: p.id, title: p.title, activeVersion: p.activeVersion,
    versions: (p.versions ?? []).map((v: BrainVersion) => ({
      label: v.label, brainName: v.brainName, functionCount: (v.functions ?? []).length,
    })),
  };
}

/** Snapshot COMPLET de l'éditeur (layout + toolbox + cerveau + projet) — un seul JSON. */
export function describeEditor(args: {
  name: string; theme: string; customFns: CustomFn[]; project: BrainProject | null;
}): object {
  return {
    schema: 'kanto-aplo/brain-editor@1',
    layout: EDITOR_LAYOUT,
    toolbox: TOOLBOX_DESCRIPTOR,
    brain: describeBrain(args.name, args.theme, args.customFns),
    project: args.project ? describeProject(args.project) : null,
  };
}

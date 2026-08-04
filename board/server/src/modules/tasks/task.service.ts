/* =============================================================================
 * MODULE · tasks/task.service.ts — Logique métier des tâches.
 * -----------------------------------------------------------------------------
 * CRUD standard PLUS un mécanisme d'archivage automatique : chaque
 * modification enregistre le snapshot AVANT-modif dans `TaskArchive` avec
 * l'auteur et le delta lisible. Cela garantit qu'aucune modification n'est
 * jamais perdue et qu'on peut toujours répondre « qui a changé quoi et quand ».
 * ========================================================================== */
import { TaskModel, type Task, type HistoryEntry } from './task.model.js';
import { TaskArchiveModel, type FieldDiff } from '../archive/archive.model.js';
import { badRequest, conflict, notFound } from '../../core/HttpError.js';
import type { HydratedDocument } from 'mongoose';

/** Champs modifiables par l'API `PATCH /tasks/:id`. */
export const EDITABLE_FIELDS = [
  'title', 'area', 'module', 'type', 'status', 'priority', 'version', 'estimate',
  'spec', 'description', 'instructions', 'acceptance', 'techno', 'category',
  'complexity', 'duration', 'logs', 'history',
] as const;
export type EditableField = typeof EDITABLE_FIELDS[number];

/** Champs à comparer pour construire le delta d'archive (exclut les champs internes). */
const DIFFABLE_FIELDS: readonly string[] = [...EDITABLE_FIELDS];

function extractSnapshot(task: HydratedDocument<Task>): Record<string, unknown> {
  const raw = task.toObject() as unknown as Record<string, unknown>;
  const clone: Record<string, unknown> = {};
  for (const key of Object.keys(raw)) {
    if (key === '_id' || key === '__v') continue;
    clone[key] = raw[key];
  }
  return clone;
}

function computeDiff(before: HydratedDocument<Task>, after: Partial<Task>): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  for (const field of DIFFABLE_FIELDS) {
    if (!(field in after)) continue;
    const b = (before as unknown as Record<string, unknown>)[field];
    const a = (after as unknown as Record<string, unknown>)[field];
    if (JSON.stringify(b) !== JSON.stringify(a)) diffs.push({ field, before: b, after: a });
  }
  return diffs;
}

export const taskService = {
  /** Liste toutes les tâches, avec filtres optionnels (status/priority/version). */
  async list(filters: { status?: string; priority?: string; version?: string; area?: string } = {}) {
    const query: Record<string, unknown> = {};
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.version) query.version = filters.version;
    if (filters.area) query.area = filters.area;
    const rows = await TaskModel.find(query).sort({ taskId: 1 }).lean();
    return rows;
  },

  async findByTaskId(taskId: string) {
    const task = await TaskModel.findOne({ taskId });
    if (!task) throw notFound(`tâche ${taskId} introuvable`);
    return task;
  },

  /** Crée une tâche. `taskId` doit être unique. */
  async create(payload: Partial<Task>, author: string) {
    if (!payload.taskId) throw badRequest('taskId requis');
    if (!payload.title) throw badRequest('titre requis');
    const exists = await TaskModel.findOne({ taskId: payload.taskId });
    if (exists) throw conflict(`taskId ${payload.taskId} déjà utilisé`);
    const historyEntry: HistoryEntry = { at: new Date(), status: payload.status, by: author, note: 'création' };
    const created = await TaskModel.create({
      ...payload,
      history: [...(payload.history ?? []), historyEntry],
      lastModifiedBy: author,
      revision: 1,
    });
    return created;
  },

  /**
   * Met à jour une tâche. **Archive automatiquement** le snapshot avant-modif
   * avec l'auteur et le delta. Ajoute une entrée d'historique inline (pour un
   * survol rapide) — l'historique complet reste dans la collection archive.
   */
  async update(taskId: string, patch: Partial<Task>, author: string, note?: string) {
    const before = await TaskModel.findOne({ taskId });
    if (!before) throw notFound(`tâche ${taskId} introuvable`);

    // Whitelist des champs modifiables (rejet silencieux du reste).
    const clean: Partial<Task> = {};
    for (const field of EDITABLE_FIELDS) {
      if (field in patch) (clean as Record<string, unknown>)[field] = (patch as Record<string, unknown>)[field];
    }

    const diff = computeDiff(before, clean);
    if (diff.length === 0) return before; // aucune modification réelle

    // Archivage du snapshot AVANT modif.
    await TaskArchiveModel.create({
      taskId,
      revision: before.revision,
      snapshot: extractSnapshot(before),
      diff,
      modifiedBy: author,
      modifiedAt: new Date(),
      note,
    });

    // Applique la modif + incrément revision + trace inline.
    Object.assign(before, clean);
    before.revision = (before.revision ?? 1) + 1;
    before.lastModifiedBy = author;
    before.history = [
      ...(before.history ?? []),
      { at: new Date(), status: clean.status ?? before.status, by: author, note: note ?? 'update' },
    ];
    await before.save();
    return before;
  },

  async remove(taskId: string, author: string) {
    const before = await TaskModel.findOne({ taskId });
    if (!before) throw notFound(`tâche ${taskId} introuvable`);
    // Archivage AVANT suppression (dernier snapshot).
    await TaskArchiveModel.create({
      taskId, revision: before.revision, snapshot: extractSnapshot(before),
      diff: [], modifiedBy: author, modifiedAt: new Date(), note: 'suppression',
    });
    await TaskModel.deleteOne({ _id: before._id });
    return { deleted: taskId };
  },
};

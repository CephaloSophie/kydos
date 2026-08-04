/* =============================================================================
 * MODULE · tasks/task.model.ts — Tâches du référentiel.
 * -----------------------------------------------------------------------------
 * Miroir enrichi de `board/tasks.json` : chaque tâche a un identifiant humain
 * (`taskId`, ex. « KB-411 »), un ObjectId Mongo (`_id`), et une `revision`
 * incrémentée à chaque modification. La dernière date de modification est
 * `updatedAt` (géré par mongoose). L'historique HUMAIN (qui a changé quoi)
 * est conservé dans la collection archive séparée (`TaskArchive`).
 * ========================================================================== */
import mongoose, { Schema } from 'mongoose';

export type TaskStatus =
  | 'bug' | 'draft' | 'pending' | 'onprocess' | 'needreview'
  | 'tested' | 'needconfirmation' | 'finished' | 'confirmed' | 'refused';

export type TaskPriority = 'P1' | 'P2' | 'P3';
export type TaskType = 'bug' | 'feature' | 'refactor' | 'docs' | 'test' | 'chore' | string;

export interface HistoryEntry {
  at: Date;
  status?: TaskStatus | string;
  by: string;    // username auteur du changement
  note?: string;
}

export interface Task {
  _id: mongoose.Types.ObjectId;
  taskId: string;               // ex. "KB-411" — identifiant humain unique
  title: string;
  area?: string;
  module?: string;
  type?: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  version?: string;
  estimate?: string;
  spec?: string;
  description?: string;
  instructions?: string[];
  acceptance?: string[];
  techno?: string;
  category?: string;
  complexity?: number;
  duration?: string;
  logs?: unknown[];
  history?: HistoryEntry[];
  /** Compteur incrémenté à chaque save (utile pour l'archivage). */
  revision: number;
  createdAt: Date;
  updatedAt: Date;
  /** Dernier utilisateur ayant modifié la tâche. */
  lastModifiedBy?: string;
}

const HistoryEntrySchema = new Schema<HistoryEntry>(
  {
    at: { type: Date, default: () => new Date() },
    status: { type: String },
    by: { type: String, required: true },
    note: { type: String },
  },
  { _id: false },
);

const TaskSchema = new Schema<Task>(
  {
    taskId: { type: String, required: true, unique: true, index: true, trim: true },
    title: { type: String, required: true },
    area: { type: String },
    module: { type: String },
    type: { type: String },
    status: { type: String, required: true, index: true, default: 'pending' },
    priority: { type: String, required: true, index: true, default: 'P2' },
    version: { type: String, index: true },
    estimate: { type: String },
    spec: { type: String },
    description: { type: String, default: '' },
    instructions: { type: [String], default: [] },
    acceptance: { type: [String], default: [] },
    techno: { type: String },
    category: { type: String },
    complexity: { type: Number, default: 0 },
    duration: { type: String },
    logs: { type: [Schema.Types.Mixed], default: [] },
    history: { type: [HistoryEntrySchema], default: [] },
    revision: { type: Number, default: 1 },
    lastModifiedBy: { type: String },
  },
  { timestamps: true },
);

export const TaskModel = mongoose.model<Task>('Task', TaskSchema);

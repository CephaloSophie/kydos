/* =============================================================================
 * MODULE · archive/archive.model.ts — Archive versionnée des tâches.
 * -----------------------------------------------------------------------------
 * Chaque MODIFICATION d'une tâche produit une entrée d'archive qui contient
 * un SNAPSHOT COMPLET de la tâche AVANT modification, l'auteur du changement,
 * l'horodatage, et un delta lisible (champs modifiés).
 *
 * On peut ainsi remonter l'historique complet d'une tâche (`GET
 * /tasks/:taskId/archive`) et voir qui a changé quoi et quand.
 * ========================================================================== */
import mongoose, { Schema } from 'mongoose';

export interface FieldDiff {
  field: string;
  before: unknown;
  after: unknown;
}

export interface TaskArchive {
  _id: mongoose.Types.ObjectId;
  taskId: string;
  revision: number;          // revision AVANT la modif (snapshot pré-modif)
  snapshot: Record<string, unknown>; // état complet AVANT modif
  diff: FieldDiff[];         // champs qui ont changé (pratique pour l'UI)
  modifiedBy: string;        // username auteur du changement
  modifiedAt: Date;
  note?: string;             // note libre optionnelle laissée par l'auteur
}

const FieldDiffSchema = new Schema<FieldDiff>(
  { field: { type: String, required: true }, before: Schema.Types.Mixed, after: Schema.Types.Mixed },
  { _id: false },
);

const TaskArchiveSchema = new Schema<TaskArchive>({
  taskId: { type: String, required: true, index: true },
  revision: { type: Number, required: true },
  snapshot: { type: Schema.Types.Mixed, required: true },
  diff: { type: [FieldDiffSchema], default: [] },
  modifiedBy: { type: String, required: true, index: true },
  modifiedAt: { type: Date, default: () => new Date(), index: true },
  note: { type: String },
});

// Index composé pour lister l'historique d'une tâche par ordre chronologique.
TaskArchiveSchema.index({ taskId: 1, modifiedAt: -1 });

export const TaskArchiveModel = mongoose.model<TaskArchive>('TaskArchive', TaskArchiveSchema);

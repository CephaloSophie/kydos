import mongoose, { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Cerveau (BrainProject) — projet d'éditeur de cerveau de robot.
 * Un projet contient PLUSIEURS versions (V-1.0.0 par défaut). Chaque version porte :
 *  - le modèle d'éditeur (nom du cerveau, corps des fonctions, fonctions custom),
 *  - le code TypeScript généré (sauvegardé en texte, consultable/éditable plus tard).
 */
const BrainFunctionSchema = new Schema(
  {
    key: { type: String, required: true },
    params: { type: String, default: 'ctx' },
    returns: { type: String, default: 'any' },
    body: { type: String, default: '' },
    custom: { type: Boolean, default: false },
  },
  { _id: false },
);

const BrainVersionSchema = new Schema(
  {
    /** Étiquette de version, ex. "V-1.0.0". */
    label: { type: String, required: true },
    /** Nom du cerveau (= AlgoSpec.name qui le résout dans le registre). */
    brainName: { type: String, default: 'MonCerveau' },
    /** Fonctions du cerveau (4 du contrat + custom). */
    functions: { type: [BrainFunctionSchema], default: [] },
    /** Code TypeScript généré (texte). */
    generatedCode: { type: String, default: '' },
    /** Réglages du contexte d'aperçu (optionnel). */
    previewSettings: { type: Schema.Types.Mixed, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const BrainProjectSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    versions: { type: [BrainVersionSchema], default: [] },
    /** Index de la version active dans `versions`. */
    activeVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type BrainProjectAttributes = InferSchemaType<typeof BrainProjectSchema>;
export const BrainProjectModel = mongoose.models.BrainProject ?? model('BrainProject', BrainProjectSchema);

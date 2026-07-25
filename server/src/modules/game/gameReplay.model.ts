import mongoose, { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Événement enrichi du replay (au-delà des opérations de belote-core).
 * Utilisé pour rejouer AVEC LES DÉTAILS (smileys, réflexions, temps réels).
 *
 *   - 'bid'          : annonce (données = { seat, bid, thinkMs })
 *   - 'play'         : carte jouée (données = { seat, card, thinkMs })
 *   - 'trick'        : ramassage de pli
 *   - 'contre'       : contre annoncé
 *   - 'surcontre'    : surcontre annoncé
 *   - 'belote'       : belote / rebelote annoncée (données = { seat, phase: 1|2 })
 *   - 'smiley'       : smiley envoyé par un joueur (données = { seat, emoji })
 *   - 'reflexion'    : icône de réflexion visible (données = { seat, ms })
 *   - 'note'         : trace libre (données = { seat, text })
 */
const ReplayEventSchema = new Schema(
  {
    type: { type: String, required: true },
    at: { type: Number, required: true }, // ms depuis le début de la donne
    donne: { type: Number, default: 0 },
    seat: { type: Number, default: null },
    data: { type: Schema.Types.Mixed, default: null },
  },
  { _id: false },
);

/**
 * GAME_REPLAY — replay rejouable (données FROIDES et volumineuses).
 * Relation 1:1 avec Game via `_id`. Chargé seulement au rejeu.
 * Contient DEUX pistes :
 *   - `replay` : structure « pure » (donnes/hands/operations) issue du moteur ;
 *   - `events` : piste enrichie (smileys, réflexions, temps réels) permettant
 *     de rejouer la partie AVEC son ambiance.
 */
const GameReplaySchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId },
    game: { type: Schema.Types.ObjectId, ref: 'Game', required: true, index: true },
    replay: { type: Schema.Types.Mixed, required: true },
    logs: { type: Schema.Types.Mixed, default: [] },
    /** Piste enrichie (append-only). */
    events: { type: [ReplayEventSchema], default: [] },
    /**
     * Nom lisible attaché au replay (pour recherche publique par nom de
     * joueur ou de robot — SPEC §3.10).
     */
    publicNames: { type: [String], default: [], index: true },
  },
  { timestamps: true, _id: false },
);

export type ReplayEventAttributes = InferSchemaType<typeof ReplayEventSchema>;
export type GameReplayAttributes = InferSchemaType<typeof GameReplaySchema>;
export const GameReplayModel = mongoose.models.GameReplay ?? model('GameReplay', GameReplaySchema);

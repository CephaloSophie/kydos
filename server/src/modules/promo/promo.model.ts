import { Schema, model } from 'mongoose';

/* =============================================================================
 * PromoCode — code de rechargement de jetons.
 * -----------------------------------------------------------------------------
 * Un code est composé de 12 CHIFFRES (stockés sans séparateur), crédite un
 * nombre de jetons DÉFINI, et possède une DATE DE VALIDITÉ (expiresAt). Chaque
 * code peut être utilisé un nombre limité de fois (maxRedemptions) et jamais
 * DEUX FOIS par le même utilisateur (redeemedBy).
 * ========================================================================== */

const PromoCodeSchema = new Schema(
  {
    /** 12 chiffres, unique, sans séparateur (l'affichage ajoute les tirets). */
    code: { type: String, required: true, unique: true, index: true, match: /^\d{12}$/ },
    /** Jetons crédités à l'utilisation. */
    tokens: { type: Number, required: true, min: 1 },
    /** Date d'expiration : au-delà, le code est refusé. */
    expiresAt: { type: Date, required: true, index: true },
    /** Nombre maximal d'utilisations (tous utilisateurs confondus). */
    maxRedemptions: { type: Number, default: 1, min: 1 },
    /** Utilisateurs ayant déjà utilisé ce code (anti-rejeu par personne). */
    redeemedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    /** Actif : un admin peut désactiver un code sans le supprimer. */
    active: { type: Boolean, default: true },
    /** Libellé interne optionnel (campagne, note). */
    label: { type: String, default: '' },
  },
  { timestamps: true },
);

/** Un code est-il utilisable maintenant (actif, non expiré, quota non atteint) ? */
PromoCodeSchema.methods.isRedeemable = function isRedeemable(): boolean {
  return this.active === true
    && this.expiresAt.getTime() > Date.now()
    && this.redeemedBy.length < this.maxRedemptions;
};

export const PromoCodeModel = model('PromoCode', PromoCodeSchema);

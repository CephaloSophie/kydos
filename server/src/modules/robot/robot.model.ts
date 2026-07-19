import mongoose, { Schema, model, type InferSchemaType } from 'mongoose';

const RobotSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    personality: {
      aggressiveness: { type: Number, default: 5 },
      concentration: { type: Number, default: 5 },
      velocity: { type: Number, default: 5 },
    },
    responseTimeMs: { type: Number, default: 1000 },
    maxPlayTimeMs: { type: Number, default: 10000 },
    /** Délai de réponse à l'annonce — fixe, non modifiable par l'utilisateur. */
    bidResponseMs: { type: Number, default: 700 },
    conventionConfig: { type: Schema.Types.Mixed, default: {} },
    algoSpec: { type: Schema.Types.Mixed, default: null },
    offlineEnabled: { type: Boolean, default: false },
    representativeSlot: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type RobotAttributes = InferSchemaType<typeof RobotSchema>;
export const RobotModel = mongoose.models.Robot ?? model('Robot', RobotSchema);

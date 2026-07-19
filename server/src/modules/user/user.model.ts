import mongoose, { Schema, model, type InferSchemaType } from 'mongoose';

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, default: null, index: true, sparse: true },
    passwordHash: { type: String, required: true },
    team: { type: Schema.Types.ObjectId, ref: 'Team', default: null, index: true },
    settings: {
      responseTimeMs: { type: Number, default: 1000 },
      maxPlayTimeMs: { type: Number, default: 10000 },
      defaultManches: { type: Number, default: 2 },
    },
    rewardPoints: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type UserAttributes = InferSchemaType<typeof UserSchema>;
export const UserModel = mongoose.models.User ?? model('User', UserSchema);

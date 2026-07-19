import mongoose, { Schema, model, type InferSchemaType } from 'mongoose';

const TeamSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, index: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    points: { type: Number, default: 0 },
    visibility: { type: String, enum: ['public', 'private'], default: 'private', index: true },
  },
  { timestamps: true },
);

export type TeamAttributes = InferSchemaType<typeof TeamSchema>;
export const TeamModel = mongoose.models.Team ?? model('Team', TeamSchema);

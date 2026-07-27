import mongoose, { Schema, model, type InferSchemaType } from 'mongoose';

const InvitationSchema = new Schema(
  {
    team: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['pending', 'accepted', 'declined', 'cancelled'], default: 'pending', index: true },
  },
  { timestamps: true },
);

export type InvitationAttributes = InferSchemaType<typeof InvitationSchema>;
export const InvitationModel = mongoose.models.Invitation ?? model('Invitation', InvitationSchema);

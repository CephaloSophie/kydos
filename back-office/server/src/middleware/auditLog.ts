import mongoose, { Schema, model } from 'mongoose';
import type { Response, NextFunction } from 'express';
import type { AdminRequest } from './auth.js';

const AdminAuditLogSchema = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, index: true },
    targetId: { type: String, default: null },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    meta: { type: Schema.Types.Mixed, default: null },
    at: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: false },
);

export const AdminAuditLogModel =
  mongoose.models.AdminAuditLog ?? model('AdminAuditLog', AdminAuditLogSchema);

export async function logAudit(
  adminId: string,
  action: string,
  targetId?: string | null,
  extra?: { before?: any; after?: any; meta?: any },
) {
  await AdminAuditLogModel.create({
    adminId,
    action,
    targetId: targetId ?? null,
    before: extra?.before ?? null,
    after: extra?.after ?? null,
    meta: extra?.meta ?? null,
  });
}

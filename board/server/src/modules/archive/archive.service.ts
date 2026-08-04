import { TaskArchiveModel } from './archive.model.js';

export const archiveService = {
  /** Historique complet d'une tâche (du plus récent au plus ancien). */
  async listForTask(taskId: string, limit = 200) {
    return TaskArchiveModel.find({ taskId }).sort({ modifiedAt: -1 }).limit(limit).lean();
  },

  /** Toutes les modifications globales (fil d'activité). */
  async recent(limit = 100) {
    return TaskArchiveModel.find().sort({ modifiedAt: -1 }).limit(limit).lean();
  },

  /** Modifications d'un utilisateur donné. */
  async listByUser(username: string, limit = 200) {
    return TaskArchiveModel.find({ modifiedBy: username }).sort({ modifiedAt: -1 }).limit(limit).lean();
  },
};

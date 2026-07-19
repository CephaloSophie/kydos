import { BrainProjectModel } from './brain.model.js';
import { badRequest, notFound } from '../../core/HttpError.js';

/** Incrémente une étiquette de version « V-major.minor.patch » sur le minor. */
function nextVersionLabel(labels: string[]): string {
  let maxMinor = 0;
  for (const l of labels) {
    const m = /^V-(\d+)\.(\d+)\.(\d+)$/.exec(l);
    if (m) maxMinor = Math.max(maxMinor, Number(m[2]));
  }
  return `V-1.${maxMinor + 1}.0`;
}

const summarize = (doc: any) => ({
  id: String(doc._id),
  title: doc.title,
  description: doc.description,
  activeVersion: doc.activeVersion,
  versionLabels: (doc.versions ?? []).map((v: any) => v.label),
  versionCount: (doc.versions ?? []).length,
  updatedAt: doc.updatedAt,
});

const fullProject = (doc: any) => ({
  id: String(doc._id),
  title: doc.title,
  description: doc.description,
  activeVersion: doc.activeVersion,
  versions: (doc.versions ?? []).map((v: any) => ({
    label: v.label,
    brainName: v.brainName,
    functions: v.functions,
    generatedCode: v.generatedCode,
    previewSettings: v.previewSettings,
    createdAt: v.createdAt,
  })),
  updatedAt: doc.updatedAt,
});

export class BrainService {
  /** Liste les projets de cerveaux d'un propriétaire (résumés). */
  async listByOwner(ownerId: string) {
    const docs = await BrainProjectModel.find({ owner: ownerId }).sort('-updatedAt').lean();
    return docs.map(summarize);
  }

  /** Récupère un projet complet (toutes ses versions). */
  async getOne(projectId: string, ownerId: string) {
    const doc: any = await BrainProjectModel.findOne({ _id: projectId, owner: ownerId }).lean();
    if (!doc) throw notFound();
    return fullProject(doc);
  }

  /** Crée un projet avec une première version V-1.0.0. */
  async create(ownerId: string, data: any) {
    const title = (data?.title ?? '').trim();
    if (!title) throw badRequest('titre requis');
    const firstVersion = {
      label: 'V-1.0.0',
      brainName: data?.brainName ?? 'MonCerveau',
      functions: data?.functions ?? [],
      generatedCode: data?.generatedCode ?? '',
      previewSettings: data?.previewSettings ?? null,
      createdAt: new Date(),
    };
    const doc = await BrainProjectModel.create({
      owner: ownerId, title, description: data?.description ?? '',
      versions: [firstVersion], activeVersion: 0,
    });
    return fullProject(doc.toObject());
  }

  /** Met à jour le contenu d'UNE version (fonctions + code généré). */
  async updateVersion(projectId: string, ownerId: string, versionIndex: number, data: any) {
    const doc: any = await BrainProjectModel.findOne({ _id: projectId, owner: ownerId });
    if (!doc) throw notFound();
    const v = doc.versions[versionIndex];
    if (!v) throw badRequest('version inconnue');
    if (data.brainName !== undefined) v.brainName = data.brainName;
    if (data.functions !== undefined) v.functions = data.functions;
    if (data.generatedCode !== undefined) v.generatedCode = data.generatedCode;
    if (data.previewSettings !== undefined) v.previewSettings = data.previewSettings;
    if (data.title !== undefined) doc.title = data.title;
    if (data.description !== undefined) doc.description = data.description;
    await doc.save();
    return fullProject(doc.toObject());
  }

  /** Ajoute une nouvelle version (copie de la version active par défaut). */
  async addVersion(projectId: string, ownerId: string, data: any = {}) {
    const doc: any = await BrainProjectModel.findOne({ _id: projectId, owner: ownerId });
    if (!doc) throw notFound();
    const source = doc.versions[doc.activeVersion] ?? doc.versions[0];
    const label = data.label ?? nextVersionLabel(doc.versions.map((v: any) => v.label));
    doc.versions.push({
      label,
      brainName: data.brainName ?? source?.brainName ?? 'MonCerveau',
      functions: data.functions ?? source?.functions ?? [],
      generatedCode: data.generatedCode ?? source?.generatedCode ?? '',
      previewSettings: data.previewSettings ?? source?.previewSettings ?? null,
      createdAt: new Date(),
    });
    doc.activeVersion = doc.versions.length - 1;
    await doc.save();
    return fullProject(doc.toObject());
  }

  /** Change la version active. */
  async switchVersion(projectId: string, ownerId: string, versionIndex: number) {
    const doc: any = await BrainProjectModel.findOne({ _id: projectId, owner: ownerId });
    if (!doc) throw notFound();
    if (!doc.versions[versionIndex]) throw badRequest('version inconnue');
    doc.activeVersion = versionIndex;
    await doc.save();
    return fullProject(doc.toObject());
  }

  /** Clone un projet entier (avec toutes ses versions). */
  async clone(projectId: string, ownerId: string, data: any = {}) {
    const src: any = await BrainProjectModel.findOne({ _id: projectId, owner: ownerId }).lean();
    if (!src) throw notFound();
    const doc = await BrainProjectModel.create({
      owner: ownerId,
      title: data.title ?? `${src.title} (copie)`,
      description: src.description,
      versions: src.versions,
      activeVersion: src.activeVersion,
    });
    return fullProject(doc.toObject());
  }

  async remove(projectId: string, ownerId: string) {
    await BrainProjectModel.deleteOne({ _id: projectId, owner: ownerId });
  }
}

export const brainService = new BrainService();

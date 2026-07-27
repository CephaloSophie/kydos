import { useCallback, useEffect, useRef, useState } from 'react';
import {
  brainApi, saveDraft, loadDraft,
  type BrainProject, type BrainVersion, type BrainProjectSummary,
} from './brainStore';

const LOCAL_PROJECTS = 'belote.brain-editor.projects.v1';

function loadLocal(): BrainProject[] {
  try { const raw = localStorage.getItem(LOCAL_PROJECTS); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function persistLocal(list: BrainProject[]): void {
  try { localStorage.setItem(LOCAL_PROJECTS, JSON.stringify(list)); } catch { /* ignore */ }
}
const uid = () => `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

function nextLabel(labels: string[]): string {
  let minor = 0;
  for (const l of labels) { const m = /^V-1\.(\d+)\.0$/.exec(l); if (m) minor = Math.max(minor, Number(m[1])); }
  return `V-1.${minor + 1}.0`;
}

export type SyncState = 'local' | 'saving' | 'saved' | 'error';

export interface UseBrainProjects {
  projects: BrainProject[];
  current: BrainProject | null;
  activeVersion: BrainVersion | null;
  serverList: BrainProjectSummary[];
  sync: SyncState;
  open(id: string): void;
  newProject(title: string, firstVersion: Omit<BrainVersion, 'label'>): void;
  saveVersion(version: BrainVersion): void;       // sauvegarde la version active (local + draft)
  addVersion(version: Omit<BrainVersion, 'label'>): void;
  switchVersion(index: number): void;
  cloneProject(id: string): void;
  removeProject(id: string): void;
  saveToServer(): Promise<void>;
  loadServerList(): Promise<void>;
  loadFromServer(id: string): Promise<void>;
}

export function useBrainProjects(): UseBrainProjects {
  const [projects, setProjects] = useState<BrainProject[]>(() => loadLocal());
  const [currentId, setCurrentId] = useState<string | null>(() => projects[0]?.id ?? null);
  const [serverList, setServerList] = useState<BrainProjectSummary[]>([]);
  const [sync, setSync] = useState<SyncState>('local');
  const mounted = useRef(false);

  const current = projects.find((p) => p.id === currentId) ?? null;
  const activeVersion = current ? current.versions[current.activeVersion] ?? current.versions[0] ?? null : null;

  // Persistance locale à chaque changement
  useEffect(() => { if (mounted.current) persistLocal(projects); mounted.current = true; }, [projects]);
  // Brouillon de la version courante (anti-perte)
  useEffect(() => { if (activeVersion) saveDraft({ currentId, version: activeVersion }); }, [currentId, activeVersion]);

  const mutateCurrent = useCallback((fn: (p: BrainProject) => BrainProject) => {
    setProjects((list) => list.map((p) => (p.id === currentId ? fn(p) : p)));
    setSync('local');
  }, [currentId]);

  const open = useCallback((id: string) => setCurrentId(id), []);

  const newProject = useCallback((title: string, firstVersion: Omit<BrainVersion, 'label'>) => {
    const proj: BrainProject = { id: uid(), title, description: '', activeVersion: 0, versions: [{ ...firstVersion, label: 'V-1.0.0', createdAt: new Date().toISOString() }] };
    setProjects((list) => [proj, ...list]);
    setCurrentId(proj.id!);
  }, []);

  const saveVersion = useCallback((version: BrainVersion) => {
    mutateCurrent((p) => { const versions = p.versions.slice(); versions[p.activeVersion] = { ...version, label: versions[p.activeVersion]?.label ?? version.label }; return { ...p, versions, updatedAt: new Date().toISOString() }; });
  }, [mutateCurrent]);

  const addVersion = useCallback((version: Omit<BrainVersion, 'label'>) => {
    mutateCurrent((p) => {
      const label = nextLabel(p.versions.map((v) => v.label));
      const versions = [...p.versions, { ...version, label, createdAt: new Date().toISOString() }];
      return { ...p, versions, activeVersion: versions.length - 1 };
    });
  }, [mutateCurrent]);

  const switchVersion = useCallback((index: number) => {
    mutateCurrent((p) => ({ ...p, activeVersion: index }));
  }, [mutateCurrent]);

  const cloneProject = useCallback((id: string) => {
    setProjects((list) => {
      const src = list.find((p) => p.id === id);
      if (!src) return list;
      const copy: BrainProject = { ...src, id: uid(), title: `${src.title} (copie)`, versions: src.versions.map((v) => ({ ...v })) };
      setCurrentId(copy.id!);
      return [copy, ...list];
    });
  }, []);

  const removeProject = useCallback((id: string) => {
    setProjects((list) => {
      const next = list.filter((p) => p.id !== id);
      if (currentId === id) setCurrentId(next[0]?.id ?? null);
      return next;
    });
  }, [currentId]);

  // --- Serveur (best-effort) ---
  const saveToServer = useCallback(async () => {
    if (!current || !activeVersion) return;
    setSync('saving');
    try {
      const isServerId = current.id && !current.id.startsWith('local_');
      if (isServerId) {
        await brainApi.updateVersion(current.id!, current.activeVersion, activeVersion);
      } else {
        const created = await brainApi.create({
          title: current.title, description: current.description,
          brainName: activeVersion.brainName, functions: activeVersion.functions,
          generatedCode: activeVersion.generatedCode, previewSettings: activeVersion.previewSettings ?? undefined,
        });
        // remplace l'id local par l'id serveur
        setProjects((list) => list.map((p) => (p.id === current.id ? { ...p, id: created.id } : p)));
        setCurrentId(created.id ?? current.id ?? null);
      }
      setSync('saved');
    } catch { setSync('error'); }
  }, [current, activeVersion]);

  const loadServerList = useCallback(async () => {
    try { setServerList(await brainApi.list()); } catch { setServerList([]); setSync('error'); }
  }, []);

  const loadFromServer = useCallback(async (id: string) => {
    try {
      const proj = await brainApi.get(id);
      setProjects((list) => { const without = list.filter((p) => p.id !== proj.id); return [proj, ...without]; });
      setCurrentId(proj.id ?? null);
      setSync('saved');
    } catch { setSync('error'); }
  }, []);

  return { projects, current, activeVersion, serverList, sync, open, newProject, saveVersion, addVersion, switchVersion, cloneProject, removeProject, saveToServer, loadServerList, loadFromServer };
}

export { loadDraft };

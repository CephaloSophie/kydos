import { h, mount, toast } from '../core/dom';
import { api, type ArchiveEntry, type BordUser, type Task } from '../core/api';

const STATUSES = ['bug', 'draft', 'pending', 'onprocess', 'needreview', 'tested', 'needconfirmation', 'finished', 'confirmed', 'refused'];
const PRIORITIES = ['P1', 'P2', 'P3'];
const TYPES = ['bug', 'feature', 'refactor', 'docs', 'test', 'chore'];

export function openTaskModal(taskId: string | null, _user: BordUser, onSaved: () => void): void {
  const backdrop = h('div', { class: 'modal-backdrop', onClick: (e: MouseEvent) => { if (e.target === backdrop) close(); } });
  const modal = h('div', { class: 'modal' });
  backdrop.append(modal);
  document.body.append(backdrop);
  const close = () => backdrop.remove();

  const state: { task: Partial<Task>; history: ArchiveEntry[]; tab: 'edit' | 'history'; loading: boolean } = {
    task: taskId ? {} : { taskId: '', title: '', status: 'pending', priority: 'P2', complexity: 0 },
    history: [], tab: 'edit', loading: !!taskId,
  };

  const render = () => {
    mount(modal,
      h('div', { class: 'modal-header' },
        h('span', { class: 'code' }, taskId ? state.task.taskId ?? '…' : 'nouvelle tâche'),
        h('h2', {}, taskId ? (state.task.title ?? 'Chargement…') : 'Créer une tâche'),
        h('div', { class: 'flex-1' }),
        h('button', { class: 'btn ghost sm', onClick: close }, '✕'),
      ),
      taskId ? h('div', { class: 'modal-tabs' },
        h('button', { class: state.tab === 'edit' ? 'active' : '', onClick: () => { state.tab = 'edit'; render(); } }, 'Édition'),
        h('button', { class: state.tab === 'history' ? 'active' : '', onClick: () => { state.tab = 'history'; render(); void loadHistory(); } }, `Historique (${state.history.length})`),
      ) : null,
      h('div', { class: 'modal-body' }, state.tab === 'edit' ? renderEditForm() : renderHistoryList()),
      h('div', { class: 'modal-footer' },
        state.tab === 'edit' ? h('button', { class: 'btn primary', onClick: save }, taskId ? 'Enregistrer' : 'Créer') : null,
        h('button', { class: 'btn', onClick: close }, 'Fermer'),
      ),
    );
  };

  const renderEditForm = (): HTMLElement => {
    if (state.loading) return h('div', { class: 'text-mute' }, 'Chargement…');
    const t = state.task;
    const field = (label: string, input: HTMLElement, full = false) =>
      h('div', { class: full ? 'full' : '' },
        h('div', { class: 'label' }, label),
        input,
      );
    const input = (key: keyof Task, placeholder = '') => {
      const el = h('input', { class: 'input', type: 'text', value: String(t[key] ?? ''), placeholder }) as HTMLInputElement;
      el.addEventListener('input', () => { (t as Record<string, unknown>)[key] = el.value; });
      return el;
    };
    const number = (key: keyof Task) => {
      const el = h('input', { class: 'input', type: 'number', value: String(t[key] ?? 0), min: 0, max: 13 }) as HTMLInputElement;
      el.addEventListener('input', () => { (t as Record<string, unknown>)[key] = Number(el.value); });
      return el;
    };
    const select = (key: keyof Task, options: string[]) => {
      const el = h('select', { class: 'select' }) as HTMLSelectElement;
      for (const o of options) el.append(h('option', { value: o, selected: t[key] === o }, o));
      el.addEventListener('change', () => { (t as Record<string, unknown>)[key] = el.value; });
      return el;
    };
    const textarea = (key: keyof Task) => {
      const el = h('textarea', { class: 'textarea', rows: 5, placeholder: 'description libre…' }) as HTMLTextAreaElement;
      el.value = String(t[key] ?? '');
      el.addEventListener('input', () => { (t as Record<string, unknown>)[key] = el.value; });
      return el;
    };
    const list = (key: keyof Task, placeholder: string) => {
      // Une entrée par ligne dans un textarea.
      const el = h('textarea', { class: 'textarea', rows: 3, placeholder }) as HTMLTextAreaElement;
      el.value = Array.isArray(t[key]) ? (t[key] as string[]).join('\n') : '';
      el.addEventListener('input', () => { (t as Record<string, unknown>)[key] = el.value.split('\n').map((s) => s.trim()).filter(Boolean); });
      return el;
    };
    const noteInput = h('input', { class: 'input', type: 'text', placeholder: 'ex: correction typo, mise à jour statut…', id: 'edit-note' }) as HTMLInputElement;

    return h('div', { class: 'form-grid' },
      !taskId ? field('ID (unique)', input('taskId' as keyof Task, 'KB-500'), true) : null,
      field('Titre', input('title' as keyof Task, ''), true),
      field('Statut', select('status' as keyof Task, STATUSES)),
      field('Priorité', select('priority' as keyof Task, PRIORITIES)),
      field('Type', select('type' as keyof Task, TYPES)),
      field('Version', input('version' as keyof Task, '12.3.0')),
      field('Domaine (area)', input('area' as keyof Task, 'mobile')),
      field('Module', input('module' as keyof Task, 'robots')),
      field('Catégorie', input('category' as keyof Task, '')),
      field('Techno', input('techno' as keyof Task, '')),
      field('Complexité (0-13)', number('complexity' as keyof Task)),
      field('Durée', input('duration' as keyof Task, '2 h')),
      field('Description', textarea('description' as keyof Task), true),
      field('Instructions (1 par ligne)', list('instructions' as keyof Task, 'étape 1\nétape 2…'), true),
      field('Acceptance (1 par ligne)', list('acceptance' as keyof Task, 'critère 1\ncritère 2…'), true),
      taskId ? field('Note du changement (optionnelle)', noteInput, true) : null,
    );
  };

  const renderHistoryList = (): HTMLElement => {
    if (state.history.length === 0) return h('div', { class: 'text-mute' }, 'Aucun historique pour cette tâche.');
    return h('div', {}, ...state.history.map((entry) =>
      h('div', { class: 'history-item' },
        h('div', { class: 'head' },
          h('span', { class: 'by' }, entry.modifiedBy),
          h('span', { class: 'text-mute' }, ' · '),
          h('span', {}, new Date(entry.modifiedAt).toLocaleString('fr-FR')),
          h('span', { class: 'flex-1' }),
          h('span', { class: 'rev' }, `révision ${entry.revision}`),
        ),
        entry.note ? h('div', { class: 'text-soft text-sm', style: { marginBottom: '6px' } }, `« ${entry.note} »`) : null,
        h('div', { class: 'diffs' }, ...entry.diff.map((d) =>
          h('div', { class: 'diff-line' },
            h('div', { class: 'field' }, d.field),
            h('div', { class: 'change' },
              h('span', { class: 'before' }, formatValue(d.before)),
              h('span', { class: 'arrow' }, '→'),
              h('span', { class: 'after' }, formatValue(d.after)),
            ),
          ),
        )),
        entry.diff.length === 0 ? h('div', { class: 'text-mute text-sm' }, '(snapshot sans diff — création ou suppression)') : null,
      ),
    ));
  };

  const load = async () => {
    if (!taskId) return;
    try {
      const r = await api.getTask(taskId);
      state.task = r.task;
      state.loading = false;
      render();
    } catch (e) {
      toast((e as Error).message ?? 'erreur de chargement', 'error');
      close();
    }
  };
  const loadHistory = async () => {
    if (!taskId) return;
    try {
      const r = await api.getTaskHistory(taskId);
      state.history = r.archive;
      render();
    } catch (e) { toast((e as Error).message ?? 'erreur', 'error'); }
  };

  const save = async () => {
    try {
      if (taskId) {
        const noteEl = document.querySelector<HTMLInputElement>('#edit-note');
        const note = noteEl?.value.trim() || undefined;
        await api.updateTask(taskId, { ...state.task, note });
        toast('tâche mise à jour', 'success');
      } else {
        if (!state.task.taskId || !state.task.title) { toast('ID et titre requis', 'error'); return; }
        await api.createTask(state.task);
        toast('tâche créée', 'success');
      }
      onSaved();
      close();
    } catch (e) { toast((e as Error).message ?? 'erreur', 'error'); }
  };

  render();
  void load();
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '∅';
  if (Array.isArray(v)) return v.length === 0 ? '[]' : v.join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

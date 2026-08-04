import { h, mount, toast } from '../core/dom';
import { api, type BordUser, type Task } from '../core/api';
import { TopBar } from '../components/TopBar';
import { openTaskModal } from './TaskModal';

interface State {
  tasks: Task[];
  filters: { status: string; priority: string; version: string; area: string };
}

const STATUS_ORDER = ['bug', 'draft', 'pending', 'onprocess', 'needreview', 'tested', 'needconfirmation', 'finished', 'confirmed', 'refused'];
const STATUS_LABELS: Record<string, string> = {
  bug: 'Bug', draft: 'Brouillon', pending: 'À faire', onprocess: 'En cours', needreview: 'À relire',
  tested: 'Testée', needconfirmation: 'À valider', finished: 'Terminée', confirmed: 'Confirmée', refused: 'Refusée',
};

export function BoardView(root: HTMLElement, user: BordUser): void {
  const state: State = { tasks: [], filters: { status: '', priority: '', version: '', area: '' } };

  const container = h('div', {});
  mount(root, TopBar(user), container);

  const refresh = async () => {
    try {
      const r = await api.listTasks(state.filters);
      state.tasks = r.tasks;
      render();
    } catch (e) {
      toast((e as Error).message ?? 'erreur de chargement', 'error');
    }
  };

  const render = () => {
    const versions = Array.from(new Set(state.tasks.map((t) => t.version).filter((v): v is string => !!v))).sort().reverse();
    const areas = Array.from(new Set(state.tasks.map((t) => t.area).filter((a): a is string => !!a))).sort();

    // Stats
    const total = state.tasks.length;
    const p1open = state.tasks.filter((t) => t.priority === 'P1' && !['tested', 'finished', 'confirmed'].includes(t.status)).length;
    const done = state.tasks.filter((t) => ['tested', 'finished', 'confirmed'].includes(t.status)).length;
    const pending = state.tasks.filter((t) => ['pending', 'draft'].includes(t.status)).length;

    // Tri : status puis priority puis taskId
    const sorted = [...state.tasks].sort((a, b) => {
      const s = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      if (s !== 0) return s;
      const p = a.priority.localeCompare(b.priority);
      if (p !== 0) return p;
      return a.taskId.localeCompare(b.taskId, undefined, { numeric: true });
    });

    const filterSelect = (label: string, key: keyof State['filters'], options: string[]) =>
      h('div', { class: 'filter' },
        h('span', { class: 'text-mute text-sm' }, label),
        h('select', {
          class: 'select',
          onChange: (e: Event) => { state.filters[key] = (e.target as HTMLSelectElement).value; void refresh(); },
        },
          h('option', { value: '' }, '— tous —'),
          ...options.map((v) => h('option', { value: v, selected: state.filters[key] === v }, v)),
        ),
      );

    const page = h('div', { class: 'page' },
      h('div', { class: 'page-header' },
        h('div', { class: 'col' },
          h('h1', {}, 'Tâches'),
          h('div', { class: 'subtitle' }, `${total} tâches — bienvenue, ${user.displayName}`),
        ),
        h('div', { class: 'flex-1' }),
        h('button', { class: 'btn primary', onClick: () => openCreateModal() }, '+ Nouvelle tâche'),
      ),

      h('div', { class: 'stats-grid' },
        stat('Total', total, ''),
        stat('P1 ouvertes', p1open, 'p1'),
        stat('En attente', pending, 'pending'),
        stat('Terminées', done, 'tested'),
      ),

      h('div', { class: 'toolbar' },
        filterSelect('Statut', 'status', STATUS_ORDER),
        filterSelect('Priorité', 'priority', ['P1', 'P2', 'P3']),
        filterSelect('Version', 'version', versions),
        filterSelect('Domaine', 'area', areas),
        h('div', { class: 'flex-1' }),
        h('button', { class: 'btn ghost sm', onClick: () => { state.filters = { status: '', priority: '', version: '', area: '' }; void refresh(); } }, 'Effacer'),
      ),

      renderTable(sorted),
    );
    mount(container, page);
  };

  const renderTable = (tasks: Task[]) => {
    if (tasks.length === 0) {
      return h('div', { class: 'card', style: { textAlign: 'center', color: 'var(--text-mute)' } }, 'Aucune tâche ne correspond aux filtres.');
    }
    return h('table', { class: 'tasks-table' },
      h('thead', {},
        h('tr', {},
          h('th', {}, 'ID'),
          h('th', {}, 'Titre'),
          h('th', {}, 'Statut'),
          h('th', {}, 'Prio'),
          h('th', {}, 'Type'),
          h('th', {}, 'Version'),
          h('th', {}, 'Cplx'),
          h('th', {}, 'Modifié'),
        ),
      ),
      h('tbody', {}, ...tasks.map((t) =>
        h('tr', { onClick: () => openEditModal(t.taskId) },
          h('td', { class: 'id' }, t.taskId),
          h('td', { class: 'title' }, t.title),
          h('td', {}, h('span', { class: `badge ${t.status}` }, STATUS_LABELS[t.status] ?? t.status)),
          h('td', {}, h('span', { class: `badge ${t.priority.toLowerCase()}` }, t.priority)),
          h('td', { class: 'text-mute text-sm' }, t.type ?? ''),
          h('td', { class: 'mono' }, t.version ?? ''),
          h('td', { class: 'center' }, String(t.complexity ?? 0)),
          h('td', { class: 'text-mute text-sm' }, formatDate(t.updatedAt)),
        ),
      )),
    );
  };

  const openEditModal = (taskId: string) => {
    openTaskModal(taskId, user, () => { void refresh(); });
  };
  const openCreateModal = () => {
    openTaskModal(null, user, () => { void refresh(); });
  };

  // premier chargement
  void refresh();
}

function stat(label: string, value: number | string, kind: string): HTMLElement {
  return h('div', { class: `stat-card ${kind}` },
    h('div', { class: 'label' }, label),
    h('div', { class: 'value' }, String(value)),
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const delta = (now - d.getTime()) / 1000;
  if (delta < 60) return 'à l\'instant';
  if (delta < 3600) return `il y a ${Math.floor(delta / 60)} min`;
  if (delta < 86400) return `il y a ${Math.floor(delta / 3600)} h`;
  return d.toLocaleDateString('fr-FR');
}

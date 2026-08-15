/* =============================================================================
 * PRESENTATION · screens/PublicGamesScreen.ts
 * -----------------------------------------------------------------------------
 * Liste des parties publiques actuellement en cours (status: playing). Les
 * utilisateurs peuvent les consulter comme spectateurs.
 *
 * Pagination stricte : 5 parties par page (côté serveur).
 * Rafraîchi automatiquement toutes les 5 s tant que l'écran est ouvert.
 * ========================================================================== */
import { h, clear } from '../../core/dom';
import { Button } from '../components/ui';
import type { AppContext } from '../context';
import type { ServerTable } from '../../data/ApiClient';

/** Libellé humain d'un `kind` de table (aligné avec MatchFormat). */
const KIND_LABEL: Record<string, { label: string; color: string }> = {
  hybride: { label: 'Alliance hybride', color: '#c99c3f' },
  acier: { label: 'Duo d\u2019acier', color: '#3f6ea1' },
  royal: { label: 'Carr\u00e9e royale', color: '#b0384a' },
};

export function PublicGamesScreen(ctx: AppContext): HTMLElement {
  const { api, router } = ctx;
  let currentPage = 1;
  let totalPages = 1;
  let poller: ReturnType<typeof setInterval> | null = null;

  const root = h('div', { class: 'anim-screen', style: {
    position: 'absolute', inset: '0', padding: '20px 26px 20px 62px', overflow: 'auto',
    background: 'radial-gradient(900px 500px at 50% 30%, #0e1729, #05070f 70%)',
  } }) as HTMLElement & { _cleanup?: () => void };

  const header = h('div', { class: 'between', style: { marginBottom: '18px' } },
    h('div', {},
      h('div', { class: 'eyebrow', style: { color: 'var(--c-gold)' } }, 'PARTIES PUBLIQUES'),
      h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', marginTop: '4px' } }, 'En cours')),
    Button('\u2190 Accueil', { variant: 'secondary', size: 'sm', onClick: () => router.go('home') }));

  const status = h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)', minHeight: '14px', marginBottom: '12px' } });
  const list = h('div', { class: 'col gap-2' });
  const pager = h('div', { class: 'row center gap-2', style: { marginTop: '18px' } });
  root.append(header, status, list, pager);

  const tableRow = (t: ServerTable) => {
    const kindMeta = KIND_LABEL[t.kind] ?? { label: 'Table libre', color: 'var(--c-text-soft)' };
    const seats = t.seats ?? [];
    const humans = seats.filter((s: any) => s.kind === 'human').length;
    const robots = seats.filter((s: any) => s.kind === 'robot').length;
    return h('div', {
      style: {
        padding: '14px 16px', borderRadius: 'var(--r-md)', cursor: 'pointer',
        background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)',
        transition: 'transform .15s ease, background .15s ease',
      },
      onClick: () => { router.go(`table?online=${t.id}`); },
      onmouseover: (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.transform = 'translateX(3px)'; },
      onmouseout: (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.transform = 'translateX(0)'; },
    },
      h('div', { class: 'between' },
        h('div', { style: { flex: '1', minWidth: 0 } },
          h('div', { class: 'row gap-2', style: { alignItems: 'center', marginBottom: '4px' } },
            h('span', { class: 'mono', style: {
              fontSize: '9px', padding: '2px 8px', borderRadius: 'var(--r-pill)',
              background: `${kindMeta.color}22`, color: kindMeta.color,
              border: `1px solid ${kindMeta.color}55`, letterSpacing: '.06em',
            } }, kindMeta.label.toUpperCase()),
            h('span', { class: 'live-chip__dot' }),
            h('span', { class: 'mono', style: { fontSize: '9px', color: 'var(--c-success)', letterSpacing: '.08em' } }, 'LIVE'),
          ),
          h('div', { class: 'title', style: { fontSize: '13px', color: 'var(--c-text)' } }, `Table \u00b7 ${t.id.slice(-6).toUpperCase()}`),
          h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--c-text-mute)', marginTop: '3px' } },
            `${humans} humain(s) · ${robots} robot(s)`)),
        h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)' } }, '\u25b6 Regarder'),
      ));
  };

  const render = async () => {
    try {
      const res = await api.listPublicLive(currentPage);
      totalPages = res.totalPages;
      clear(list); clear(pager);
      if (res.tables.length === 0) {
        list.append(h('div', {
          class: 'card',
          style: { padding: '22px', textAlign: 'center', color: 'var(--c-text-mute)', fontSize: '13px' },
        }, 'Aucune partie publique en cours. Revenez d\u2019ici quelques minutes\u2009!'));
        status.textContent = '';
      } else {
        for (const t of res.tables) list.append(tableRow(t));
        status.textContent = `${res.total} partie(s) publique(s) au total \u00b7 page ${currentPage}/${totalPages}`;
      }
      if (totalPages > 1) {
        pager.append(
          Button('\u2190 Pr\u00e9c.', { variant: 'ghost', size: 'sm', onClick: () => { if (currentPage > 1) { currentPage--; void render(); } } }),
          h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)', padding: '0 10px' } }, `${currentPage} / ${totalPages}`),
          Button('Suiv. \u2192', { variant: 'ghost', size: 'sm', onClick: () => { if (currentPage < totalPages) { currentPage++; void render(); } } }),
        );
      }
    } catch (e) {
      status.textContent = `\u2717 ${(e as Error).message}`;
    }
  };

  void render();
  // Poll léger pour ne pas rater les nouvelles parties.
  poller = setInterval(() => void render(), 5000);
  root._cleanup = () => { if (poller) clearInterval(poller); poller = null; };
  return root;
}

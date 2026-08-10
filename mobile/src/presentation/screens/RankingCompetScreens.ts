/* =============================================================================
 * PRESENTATION · screens/RankingScreen.ts + CompetScreen.ts
 * Classements (saison, robots) et Compétitions (vitrine) — FIDÈLES au design
 * system. Le classement est alimenté par l'écurie réelle quand elle existe,
 * complété par un podium de démonstration ; les tournois restent une vitrine.
 * ========================================================================== */
import { h, clear } from '../../core/dom';
import { Button } from '../components/ui';
import type { AppContext } from '../context';

interface RankRow { rank: number; name: string; accent: string; winRate: number; elo: number; me?: boolean }

const DEMO_RANKING: RankRow[] = [
  { rank: 1, name: 'Zéno·9', accent: '#e6c46a', winRate: 72, elo: 1842 },
  { rank: 2, name: 'Kant·IA', accent: '#9db4dd', winRate: 69, elo: 1790 },
  { rank: 3, name: 'Héra·X', accent: '#e08795', winRate: 66, elo: 1744 },
];

export function RankingScreen(ctx: AppContext): HTMLElement {
  const { router, robotService } = ctx;

  const rowEl = (r: RankRow) => h('div', {
    class: 'row gap-3', style: {
      padding: r.rank === 1 ? '10px 14px' : '9px 14px', borderRadius: 'var(--r-lg)',
      background: r.rank === 1 ? 'linear-gradient(90deg,rgba(230,196,106,.14),rgba(230,196,106,.04))' : r.me ? 'rgba(126,203,152,.08)' : 'var(--c-veil-04)',
      border: r.rank === 1 ? '1px solid rgba(230,196,106,.35)' : r.me ? '1px solid rgba(126,203,152,.3)' : '1px solid var(--c-line)',
    },
  },
    h('span', { class: 'title', style: { fontSize: r.rank === 1 ? '18px' : '16px', width: '22px', color: r.rank === 1 ? 'var(--c-gold)' : r.me ? 'var(--c-success)' : 'var(--c-text-soft)' } }, String(r.rank)),
    h('div', { class: 'avatar', style: { '--avatar-ring': r.accent, width: '30px', height: '27px' } },
      h('span', { class: 'avatar__dot', style: { background: r.accent } }), h('span', { class: 'avatar__dot', style: { background: r.accent } })),
    h('span', { class: 'title fill', style: { fontSize: '14px', fontWeight: '700' } }, r.name, r.me ? h('span', { class: 'mono', style: { fontSize: '9px', color: 'var(--c-success)', fontWeight: '400' } }, ' · vous') : null),
    h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)' } }, r.winRate + '% V'),
    h('span', { class: 'mono', style: { fontSize: '13px', color: r.rank === 1 ? 'var(--c-gold)' : r.me ? 'var(--c-success)' : 'var(--c-text-soft)' } }, String(r.elo)),
  );

  const tab = (label: string, active: boolean) => h('span', { class: 'mono', style: {
    fontSize: '11px', padding: '6px 12px', borderRadius: 'var(--r-md)', cursor: 'pointer',
    background: active ? 'var(--g-btn)' : 'var(--c-veil-06)', color: active ? 'var(--c-ink)' : 'var(--c-text-soft)', border: active ? 'none' : '1px solid var(--c-line-strong)',
  } }, label);

  const list = h('div', { class: 'col gap-2' }, ...DEMO_RANKING.map(rowEl));

  // Ajoute la meilleure entrée « vous » depuis l'écurie réelle si disponible.
  robotService.list().then((robots) => {
    if (!robots.length) return;
    const mine = robots[0];
    list.append(rowEl({ rank: 14, name: mine.name, accent: mine.accent, winRate: mine.winRate || 61, elo: mine.elo, me: true }));
  }).catch(() => {});

  return h('div', { class: 'anim-screen', style: { position: 'absolute', inset: '0', padding: '14px 24px 14px 60px', background: 'linear-gradient(160deg,#0a0f1c,#060a13)', overflow: 'auto' } },
    h('div', { class: 'between', style: { marginBottom: '12px' } },
      h('div', {}, h('div', { class: 'eyebrow' }, 'SAISON 1 · ROBOTS'), h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', marginTop: '2px' } }, 'Classements')),
      h('div', { class: 'row gap-2' }, tab('Robots', true), tab('Joueurs', false), Button('← Accueil', { variant: 'secondary', size: 'sm', onClick: () => router.go('home') }))),
    list,
  );
}

export function CompetScreen(ctx: AppContext): HTMLElement {
  const { router, api } = ctx;

  /** Description d'un format d'inscription (miroir du catalog serveur). */
  interface FormatCard {
    id: 'duo_steel' | 'hybrid_alliance' | 'royal_square';
    label: string;
    glyph: string;
    tag: string;
    accent: string;
    subtitle: string;
    buyIn: number;
    prize: number;
    robotsPerPlayer: number;
    isHeadless: boolean;
  }
  const FORMATS: FormatCard[] = [
    { id: 'duo_steel', label: 'Duo d\u2019acier', glyph: '\u2666', tag: '2 ROBOTS \u00d7 2', accent: 'linear-gradient(160deg,#c99c3f 0%,#8b6a1e 100%)',
      subtitle: 'Un affrontement 100 % en coulisses.', buyIn: 200, prize: 150, robotsPerPlayer: 2, isHeadless: true },
    { id: 'hybrid_alliance', label: 'Alliance hybride', glyph: '\u2660', tag: 'HUMAIN + ROBOT', accent: 'linear-gradient(160deg,#3f8f5e 0%,#1a4a2f 100%)',
      subtitle: 'Vous + votre robot, tous ensemble.', buyIn: 150, prize: 225, robotsPerPlayer: 1, isHeadless: false },
    { id: 'royal_square', label: 'Carr\u00e9e royale', glyph: '\u2665', tag: '4 HUMAINS', accent: 'linear-gradient(160deg,#b0384a 0%,#5f1f2a 100%)',
      subtitle: 'Quatre humains, deux \u00e9quipes, une couronne.', buyIn: 100, prize: 150, robotsPerPlayer: 0, isHeadless: false },
  ];

  const statusEl = h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)', minHeight: '14px', marginTop: '10px', textAlign: 'center' } });

  /** Choisit N robots pour l'inscription (les mieux notés d'abord). */
  const pickRobots = (n: number): string[] => ctx.session.robots.slice(0, n).map((r) => r.id);

  const enqueue = async (f: FormatCard) => {
    if (!api.isAuthenticated()) { statusEl.textContent = '\u2717 Connexion requise'; return; }
    const robotIds = pickRobots(f.robotsPerPlayer);
    if (robotIds.length < f.robotsPerPlayer) {
      statusEl.textContent = `\u2717 Il vous faut ${f.robotsPerPlayer} robot(s) dans votre \u00e9curie.`;
      return;
    }
    statusEl.textContent = `Inscription \u00e0 « ${f.label} »\u2026`;
    try {
      await api.enqueueMatch(f.id, robotIds);
      await ctx.session.refreshWallet();
      // Redirection immédiate vers l'écran waiting/match. Le polling y détecte
      // le match dès qu'il est créé (souvent < 2s si le second joueur est là).
      router.go(`matchmaking?format=${f.id}`);
    } catch (e) {
      statusEl.textContent = `\u2717 ${(e as Error).message}`;
    }
  };

  const cancel = async (f: FormatCard) => {
    try {
      await api.cancelMatchQueue(f.id);
      await ctx.session.refreshWallet();
      statusEl.textContent = `\u2713 Inscription annul\u00e9e, buy-in rembours\u00e9.`;
    } catch (e) {
      statusEl.textContent = `\u2717 ${(e as Error).message}`;
    }
  };

  /**
   * Carte de format redessinée : glyphe belote en filigrane, hiérarchie
   * typographique claire (tag → titre → sous-titre → économie → CTA).
   * Effet de survol subtil, ombre douce.
   */
  const formatCard = (f: FormatCard) => h('div', {
    class: 'compet-card',
    style: {
      position: 'relative', padding: '18px 16px', borderRadius: 'var(--r-lg)',
      background: f.accent, color: '#fff', overflow: 'hidden',
      boxShadow: '0 10px 24px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.15)',
      cursor: 'default', minHeight: '210px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    },
  },
    // Glyphe belote en filigrane
    h('div', { style: {
      position: 'absolute', right: '-10px', top: '-30px', fontSize: '150px',
      opacity: '.09', pointerEvents: 'none', lineHeight: '1', color: '#fff',
    } }, f.glyph),
    // Bloc haut : tag + titre + subtitle
    h('div', { style: { position: 'relative' } },
      h('span', { class: 'mono', style: {
        display: 'inline-block', fontSize: '9px', padding: '4px 10px',
        borderRadius: 'var(--r-pill)', background: 'rgba(0,0,0,.35)',
        color: '#fff', letterSpacing: '.06em',
      } }, f.tag),
      h('div', { class: 'title', style: { fontSize: '19px', color: '#fff', margin: '10px 0 4px', lineHeight: '1.2' } }, f.label),
      h('div', { style: { fontSize: '11px', color: 'rgba(255,255,255,.88)', marginBottom: '10px' } }, f.subtitle),
    ),
    // Bloc bas : économie + CTA
    h('div', { style: { position: 'relative' } },
      h('div', { class: 'mono', style: {
        fontSize: '10px', color: 'rgba(255,255,255,.85)', marginBottom: '10px',
        display: 'flex', justifyContent: 'space-between',
      } },
        h('span', {}, `Buy-in ${f.buyIn} \u25c6`),
        h('span', {}, `Gain ${f.prize} \u25c6`),
      ),
      h('div', { class: 'row gap-2' },
        h('button', {
          class: 'btn btn--sm',
          style: { color: '#1a1a1a', background: '#fff', flex: '1', fontWeight: '600' },
          onClick: () => void enqueue(f),
        }, 'S\u2019inscrire'),
        h('button', {
          class: 'btn btn--sm btn--ghost',
          style: { color: '#fff', borderColor: 'rgba(255,255,255,.4)' },
          onClick: () => void cancel(f),
        }, 'Annuler'),
      ),
    ),
  );

  // ── Section Tournois (v14.1) ─────────────────────────────────────────────
  interface TournamentRow {
    _id: string; name: string; format: string; status: string;
    capacity: number; entryFee: number; startAt: string;
    participants?: unknown[];
  }
  let currentTournamentFilter: 'upcoming' | 'live' | 'finished' = 'upcoming';
  const tournamentsList = h('div', { class: 'col gap-2', style: { marginTop: '10px' } });
  const tournamentsMsg = h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--c-text-mute)', padding: '6px 0' } }, 'Chargement des tournois…');

  const STATUS_COLORS: Record<string, { bg: string; border: string; label: string; color: string }> = {
    upcoming: { bg: 'rgba(230,196,106,.10)', border: 'rgba(230,196,106,.35)', label: '\u00c0 VENIR', color: 'var(--c-gold)' },
    live: { bg: 'rgba(126,203,152,.10)', border: 'rgba(126,203,152,.35)', label: 'EN COURS', color: 'var(--c-success)' },
    finished: { bg: 'rgba(255,255,255,.03)', border: 'rgba(255,255,255,.08)', label: 'TERMIN\u00c9', color: 'var(--c-text-mute)' },
    draft: { bg: 'rgba(255,255,255,.03)', border: 'rgba(255,255,255,.08)', label: 'DRAFT', color: 'var(--c-text-mute)' },
  };

  const renderTournamentRow = (t: TournamentRow) => {
    const startDate = new Date(t.startAt);
    const startLabel = startDate.toLocaleString();
    const participantCount = (t.participants ?? []).length;
    const canJoin = t.status === 'upcoming';
    const rules = FORMATS.find((f) => f.id === t.format);
    const style = STATUS_COLORS[t.status] ?? STATUS_COLORS.finished;
    // Ligne CLIQUABLE (sauf le bouton) → ouvre la vue détail tournoi.
    return h('div', {
      style: {
        padding: '14px 16px', borderRadius: 'var(--r-md)', cursor: 'pointer',
        background: style.bg, border: `1px solid ${style.border}`,
        transition: 'transform .15s ease, background .15s ease',
      },
      onClick: () => router.go(`tournament?id=${t._id}`),
      onmouseover: (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.transform = 'translateX(3px)'; },
      onmouseout: (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.transform = 'translateX(0)'; },
    },
      h('div', { class: 'between' },
        h('div', { style: { flex: '1' } },
          h('div', { class: 'row gap-2', style: { alignItems: 'center', marginBottom: '4px' } },
            h('span', { class: 'mono', style: {
              fontSize: '9px', padding: '2px 8px', borderRadius: 'var(--r-pill)',
              background: 'rgba(0,0,0,.3)', color: style.color, letterSpacing: '.06em',
            } }, style.label),
            h('div', { class: 'title', style: { fontSize: '13px', color: 'var(--c-text)' } }, t.name),
          ),
          h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--c-text-mute)', marginTop: '3px' } },
            `${rules?.label ?? t.format} \u00b7 ${participantCount}/${t.capacity} \u00b7 ${t.entryFee} \u25c6 \u00b7 ${startLabel}`)),
        canJoin
          ? h('button', {
              class: 'btn btn--sm',
              onClick: (e: Event) => { e.stopPropagation(); void joinTournament(t, rules?.robotsPerPlayer ?? 0); },
            }, 'S\u2019inscrire')
          : h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)' } }, '\u203a'),
      ));
  };

  const joinTournament = async (t: TournamentRow, robotsRequired: number) => {
    if (!api.isAuthenticated()) { tournamentsMsg.textContent = '\u2717 Connexion requise'; return; }
    const robotIds = pickRobots(robotsRequired);
    if (robotIds.length < robotsRequired) {
      tournamentsMsg.textContent = `\u2717 Il vous faut ${robotsRequired} robot(s) pour ce tournoi.`;
      return;
    }
    try {
      await api.joinTournament(t._id, robotIds);
      await ctx.session.refreshWallet();
      tournamentsMsg.textContent = `\u2713 Inscription \u00e0 « ${t.name} » confirm\u00e9e.`;
      void loadTournaments();
    } catch (e) {
      tournamentsMsg.textContent = `\u2717 ${(e as Error).message}`;
    }
  };

  const loadTournaments = async () => {
    try {
      const r = await api.listTournaments(currentTournamentFilter);
      const rows = (r.tournaments as TournamentRow[]) || [];
      clear(tournamentsList);
      if (rows.length === 0) {
        tournamentsList.append(h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--c-text-mute)', padding: '10px 0' } },
          'Aucun tournoi dans cette cat\u00e9gorie.'));
      } else {
        rows.forEach((t) => tournamentsList.append(renderTournamentRow(t)));
      }
      tournamentsMsg.textContent = '';
    } catch (e) {
      tournamentsMsg.textContent = `\u2717 ${(e as Error).message}`;
    }
  };
  void loadTournaments();

  const filterBtn = (label: string, key: 'upcoming' | 'live' | 'finished') =>
    h('button', {
      class: 'btn btn--sm ' + (currentTournamentFilter === key ? '' : 'btn--ghost'),
      onClick: () => { currentTournamentFilter = key; void loadTournaments(); refreshFilters(); },
    }, label);
  let filterRow = h('div', { class: 'row gap-2' });
  const refreshFilters = () => {
    clear(filterRow);
    filterRow.append(filterBtn('\u00c0 venir', 'upcoming'), filterBtn('En cours', 'live'), filterBtn('Termin\u00e9s', 'finished'));
  };
  refreshFilters();

  return h('div', { class: 'anim-screen', style: {
    position: 'absolute', inset: '0', padding: '20px 26px 20px 62px',
    background: 'radial-gradient(1000px 500px at 30% 0%, #101b2f, #05070f 70%)',
    overflow: 'auto',
  } },
    // En-tête
    h('div', { class: 'between', style: { marginBottom: '20px' } },
      h('div', {},
        h('div', { class: 'eyebrow', style: { color: 'var(--c-gold)' } }, 'MATCHS & TOURNOIS'),
        h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', marginTop: '4px', letterSpacing: '.01em' } }, 'Compétitions')),
      Button('← Accueil', { variant: 'secondary', size: 'sm', onClick: () => router.go('home') })),

    // Section 1 : Match rapide
    h('div', { class: 'eyebrow', style: { marginBottom: '10px', color: 'var(--c-text-mute)' } }, 'MATCH RAPIDE — 3 FORMATS'),
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '14px' } },
      ...FORMATS.map(formatCard)),
    statusEl,

    // Séparateur
    h('div', { style: { height: '1px', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)', margin: '24px 0 18px' } }),

    // Section 2 : Tournois
    h('div', { class: 'between', style: { marginBottom: '12px' } },
      h('div', {},
        h('div', { class: 'eyebrow', style: { color: 'var(--c-gold)' } }, 'TOURNOIS'),
        h('h3', { class: 'title', style: { fontSize: '16px', marginTop: '4px' } }, 'Bracket \u00e0 \u00e9limination directe')),
      filterRow),
    tournamentsMsg,
    tournamentsList,

    // Note de bas
    h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--c-text-faint)', marginTop: '20px', textAlign: 'center' } },
      'Le serveur regroupe les joueurs par format. Duo d\u2019acier se joue en coulisses ; les autres formats ouvrent une table en direct.'),
  );
}
